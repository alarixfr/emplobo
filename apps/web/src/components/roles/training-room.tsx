"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import type { RoleStatus, TrainingRoleSummary } from "@/lib/roles";

type TrainingMessage = {
  id: string;
  sender: string;
  content: string;
  createdAt: string;
};

type TrainingRoomProps = {
  roles: TrainingRoleSummary[];
  initialRoleId?: string;
};

const STATUS_LABEL: Record<RoleStatus, string> = {
  DRAFT: "Draft",
  READY: "Siap",
  PUBLISHED: "Dipublikasikan",
};

export function TrainingRoom({ roles, initialRoleId }: TrainingRoomProps) {
  const initialSelectedRoleId =
    initialRoleId && roles.some((role) => role.id === initialRoleId)
      ? initialRoleId
      : roles[0]?.id;

  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(
    initialSelectedRoleId,
  );

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  if (!selectedRole) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Belum ada role untuk dilatih.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-3">
        <label
          htmlFor="training-role-select"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Role training
        </label>
        <select
          id="training-role-select"
          value={selectedRole.id}
          onChange={(e) => setSelectedRoleId(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
        >
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name} — {STATUS_LABEL[role.status]} ({role.completenessScore}%)
            </option>
          ))}
        </select>
      </div>

      <RoleTrainingChat key={selectedRole.id} role={selectedRole} />
    </section>
  );
}

type RoleTrainingChatProps = {
  role: TrainingRoleSummary;
};

function RoleTrainingChat({ role }: RoleTrainingChatProps) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<TrainingMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<RoleStatus>(role.status);
  const [completeness, setCompleteness] = useState(role.completenessScore);
  const [isLocked, setIsLocked] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const pollRef = useRef<number | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(
    () => isLocked && !isSending && input.trim().length > 0,
    [isLocked, isSending, input],
  );

  async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
    const token = await getToken();
    if (!token) {
      throw new Error("Sesi tidak valid. Silakan login ulang.");
    }
    return fn(token);
  }

  async function acquireLockAndLoad() {
    setLoadError(null);
    setIsLoading(true);
    try {
      await withToken((token) =>
        apiFetch(`/api/roles/${role.id}/training/lock`, {
          method: "POST",
          token,
        }),
      );
      setIsLocked(true);

      const data = await withToken((token) =>
        apiFetch<{
          role: {
            status: RoleStatus;
            completenessScore: number;
          };
          messages: TrainingMessage[];
        }>(`/api/roles/${role.id}/training/messages`, { token }),
      );

      setStatus(data.role.status);
      setCompleteness(data.role.completenessScore);
      setMessages(data.messages);
    } catch (err) {
      if (err instanceof ApiError && err.status === 423) {
        setIsLocked(false);
        setLoadError("Training Room sedang dipakai admin lain. Coba lagi nanti.");
        return;
      }
      if (err instanceof Error) {
        setLoadError(err.message);
      } else {
        setLoadError("Gagal memuat Training Room.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function heartbeat() {
    if (!isLocked) return;
    try {
      await withToken((token) =>
        apiFetch(`/api/roles/${role.id}/training/heartbeat`, {
          method: "PATCH",
          token,
        }),
      );
    } catch {
      // noop
    }
  }

  async function submitMessage() {
    if (!canSend) return;
    setSendError(null);
    setRetryAfter(null);
    setIsSending(true);
    try {
      const data = await withToken((token) =>
        apiFetch<{
          adminMessage: TrainingMessage;
          aiMessage: TrainingMessage;
          role: {
            status: RoleStatus;
            completenessScore: number;
          };
          becameReady: boolean;
        }>(`/api/roles/${role.id}/training/messages`, {
          method: "POST",
          token,
          body: { content: input.trim() },
        }),
      );

      setInput("");
      setMessages((prev) => [...prev, data.adminMessage, data.aiMessage]);
      setStatus(data.role.status);
      setCompleteness(data.role.completenessScore);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        const retry =
          typeof err.body === "object" &&
          err.body &&
          "retryAfter" in err.body &&
          typeof (err.body as { retryAfter?: unknown }).retryAfter === "number"
            ? (err.body as { retryAfter: number }).retryAfter
            : null;
        setRetryAfter(retry);
      }
      setSendError(err instanceof Error ? err.message : "Gagal mengirim pesan.");
    } finally {
      setIsSending(false);
    }
  }

  useEffect(() => {
    void acquireLockAndLoad();
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
      // Explicit lock release on room close (Section 5.2) — best-effort.
      void withToken((token) =>
        apiFetch(`/api/roles/${role.id}/training/lock`, {
          method: "DELETE",
          token,
        }).catch(() => undefined),
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role.id]);

  useEffect(() => {
    if (!isLocked) return;
    pollRef.current = window.setInterval(() => {
      void heartbeat();
    }, 60_000);

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, role.id]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <section className="flex min-h-[68vh] flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            Training AI · {role.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Chat seperti AI assistant untuk mengajarkan SOP role ini.
          </p>
        </div>
        <div className="rounded-lg border border-border px-3 py-2 text-right text-xs">
          <p className="font-semibold text-foreground">{STATUS_LABEL[status]}</p>
          <p className="text-muted-foreground">{completeness}% lengkap</p>
        </div>
      </div>

      {loadError ? (
        <p className="mx-4 mt-4 rounded-md border border-border bg-background p-3 text-sm text-accent md:mx-5">
          {loadError}
        </p>
      ) : null}

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat percakapan...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada pesan training. Mulai dengan SOP utama role ini.
          </p>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === "admin" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm md:max-w-[78%] ${
                    message.sender === "admin"
                      ? "bg-brand text-brand-foreground"
                      : "border border-border bg-background text-foreground"
                  }`}
                >
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-75">
                    {message.sender === "admin" ? "Anda" : "AI"}
                  </p>
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
            <div ref={endOfMessagesRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border bg-background/70 p-4 md:p-5">
        <div className="space-y-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            maxLength={4000}
            disabled={!isLocked || isSending}
            placeholder={
              isLocked
                ? "Jelaskan SOP / edge case / tools yang dipakai..."
                : "Training Room terkunci"
            }
            className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2 disabled:opacity-60"
          />
          {sendError ? <p className="text-sm text-accent">{sendError}</p> : null}
          {retryAfter ? (
            <p className="text-xs text-muted-foreground">
              Rate limit aktif. Coba lagi dalam ~{retryAfter} detik.
            </p>
          ) : null}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void submitMessage()}
              disabled={!canSend}
              className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {isSending ? "Mengirim..." : "Kirim"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
