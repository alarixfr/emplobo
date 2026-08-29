"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { ReadinessRing } from "@/components/ui/readiness-ring";
import { StatusBadge } from "@/components/ui/status-badge";
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

export function TrainingRoom({ roles, initialRoleId }: TrainingRoomProps) {
  const router = useRouter();
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
      <section className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Belum ada role untuk dilatih. Buat role baru terlebih dahulu.
        </p>
        <Link
          href="/app/roles"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          BUAT ROLE
        </Link>
      </section>
    );
  }

  function selectRole(roleId: string) {
    setSelectedRoleId(roleId);
    router.push(`/app/training/${roleId}`);
  }

  return (
    <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
      {/* Mobile role switcher (left rail is hidden on small screens) */}
      <div className="lg:hidden">
        <label
          htmlFor="training-role-mobile"
          className="font-label-caps text-label-caps text-secondary"
        >
          PILIH ROLE
        </label>
        <select
          id="training-role-mobile"
          value={selectedRole.id}
          onChange={(e) => selectRole(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-slate-300 bg-surface-container-lowest px-3 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
        >
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name} — {role.completenessScore}%
            </option>
          ))}
        </select>
      </div>

      {/* ── Roles Context (left rail) ─────────────────────────────────── */}
      <aside className="hidden h-[calc(100vh-14rem)] min-h-[560px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-surface-container-lowest shadow-sm lg:col-span-3 lg:flex">
        <div className="border-b border-slate-200 bg-white p-4">
          <h2 className="font-headline-sm text-[18px] text-on-surface">
            Roles Context
          </h2>
        </div>
        <div className="scroll-slim flex flex-1 flex-col gap-2 overflow-y-auto bg-surface-muted p-4">
          {roles.map((role) => {
            const active = role.id === selectedRole.id;
            const statusLabel =
              role.status === "PUBLISHED"
                ? "Published"
                : role.status === "READY"
                  ? "Ready"
                  : role.completenessScore > 0
                    ? "In Progress"
                    : "Draft";
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => selectRole(role.id)}
                className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                  active
                    ? "border-primary bg-white shadow-sm ring-1 ring-primary"
                    : "border-slate-200 bg-white shadow-sm hover:border-slate-300"
                }`}
              >
                <div className="min-w-0">
                  <h3
                    className={`truncate font-data-point text-data-point text-on-surface ${
                      active ? "font-bold" : ""
                    }`}
                  >
                    {role.name}
                  </h3>
                  <p className="font-body-sm text-[12px] text-secondary">
                    {statusLabel}
                  </p>
                </div>
                {active ? (
                  <span className="material-symbols-outlined text-sm text-primary">
                    chevron_right
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Center chat + right rail */}
      <RoleTrainingChat key={selectedRole.id} role={selectedRole} />
    </div>
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
  const [missingAreas, setMissingAreas] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [observerName, setObserverName] = useState<string | null>(null);
  const [lockFree, setLockFree] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [guideReady, setGuideReady] = useState(false);
  const pollRef = useRef<number | null>(null);
  const statusPollRef = useRef<number | null>(null);
  const lockedRef = useRef(false);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(
    () => isLocked && !isSending && input.trim().length > 0,
    [isLocked, isSending, input],
  );

  const canGenerate =
    (status === "READY" || status === "PUBLISHED") && !isGenerating;

  async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
    const token = await getToken();
    if (!token) {
      throw new Error("Sesi tidak valid. Silakan login ulang.");
    }
    return fn(token);
  }

  async function loadTranscript() {
    const data = await withToken((token) =>
      apiFetch<{
        role: { status: RoleStatus; completenessScore: number };
        messages: TrainingMessage[];
      }>(`/api/roles/${role.id}/training/messages`, { token }),
    );
    setStatus(data.role.status);
    setCompleteness(data.role.completenessScore);
    setMessages(data.messages);
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
      setObserverName(null);
      setLockFree(false);
      lockedRef.current = true;

      await loadTranscript();
    } catch (err) {
      if (err instanceof ApiError && err.status === 423) {
        setIsLocked(false);
        lockedRef.current = false;
        const body = err.body as { activeTrainerName?: string | null } | null;
        setObserverName(body?.activeTrainerName ?? "admin lain");

        // Observer mode still loads the transcript read-only (Section 5.2).
        try {
          await loadTranscript();
        } catch {
          // Transcript load failed — observer banner still renders.
        }
        return;
      }
      setLoadError(
        err instanceof Error ? err.message : "Gagal memuat Training Room.",
      );
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
    } catch (err) {
      // Lock stolen/expired — drop to observer mode instead of leaving a
      // dead editor behind.
      if (err instanceof ApiError && err.status === 423) {
        setIsLocked(false);
        lockedRef.current = false;
        setObserverName("admin lain");
        setLockFree(true);
      }
    }
  }

  // Idle status polling (Section 6) — GET /api/roles/:id overlays the 30s
  // role-status cache; also refreshes the Knowledge Gaps list.
  async function pollStatus() {
    try {
      const data = await withToken((token) =>
        apiFetch<{
          role: {
            status: RoleStatus;
            completenessScore: number;
            activeTrainerId: string | null;
          };
          missingAreas?: string[];
        }>(`/api/roles/${role.id}`, { token }),
      );
      setStatus(data.role.status);
      setCompleteness(data.role.completenessScore);
      setLockFree(data.role.activeTrainerId === null);
      if (data.missingAreas) {
        setMissingAreas(data.missingAreas);
      }
    } catch {
      // Polling is best-effort — never surface transient errors here.
    }
  }

  function retakeLock() {
    setLockFree(false);
    void acquireLockAndLoad();
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
          role: { status: RoleStatus; completenessScore: number };
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
      if (err instanceof ApiError && err.status === 423) {
        setIsLocked(false);
        lockedRef.current = false;
        setObserverName("admin lain");
        setLockFree(true);
        setSendError("Kunci training hilang. Role ini sedang dilatih admin lain.");
      } else if (err instanceof ApiError && err.status === 429) {
        const retry =
          typeof err.body === "object" &&
          err.body &&
          "retryAfter" in err.body &&
          typeof (err.body as { retryAfter?: unknown }).retryAfter === "number"
            ? (err.body as { retryAfter: number }).retryAfter
            : null;
        setRetryAfter(retry);
        setSendError(err instanceof Error ? err.message : "Gagal mengirim pesan.");
      } else {
        setSendError(err instanceof Error ? err.message : "Gagal mengirim pesan.");
      }
    } finally {
      setIsSending(false);
    }
  }

  async function generateGuide() {
    if (!canGenerate) return;
    setIsGenerating(true);
    setGenerateError(null);
    try {
      await withToken((token) =>
        apiFetch(`/api/roles/${role.id}/guide/generate`, {
          method: "POST",
          token,
        }),
      );
      setStatus("PUBLISHED");
      setGuideReady(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setGenerateError(
          "Rate limit aktif. Tunggu beberapa saat sebelum mencoba lagi.",
        );
      } else {
        setGenerateError(
          err instanceof Error ? err.message : "Gagal menghasilkan guide.",
        );
      }
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    void acquireLockAndLoad();
    void pollStatus();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (statusPollRef.current) window.clearInterval(statusPollRef.current);
      // Explicit lock release on room close (Section 5.2) — best-effort,
      // only when this client actually holds the lock.
      if (lockedRef.current) {
        lockedRef.current = false;
        void withToken((token) =>
          apiFetch(`/api/roles/${role.id}/training/lock`, {
            method: "DELETE",
            token,
          }).catch(() => undefined),
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role.id]);

  useEffect(() => {
    if (!isLocked) return;
    pollRef.current = window.setInterval(() => {
      void heartbeat();
    }, 60_000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, role.id]);

  useEffect(() => {
    statusPollRef.current = window.setInterval(() => {
      void pollStatus();
    }, 30_000);
    return () => {
      if (statusPollRef.current) window.clearInterval(statusPollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role.id]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <>
      {/* ── Main chat column (center) ─────────────────────────────────── */}
      <section className="flex h-[calc(100vh-14rem)] min-h-[560px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-surface-container-lowest shadow-sm lg:col-span-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-white p-6 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1 flex items-center gap-3">
              <h2 className="font-headline-md text-[24px] text-on-surface">
                {role.name}
              </h2>
              <StatusBadge status={status} />
            </div>
            <p className="font-body-sm text-body-sm text-secondary">
              Chat dengan AI Brain untuk mengekstrak prosedur standar role ini.
            </p>
          </div>
        </div>

        {loadError ? (
          <p className="mx-6 mt-4 rounded-lg border border-error-container bg-error-container/40 p-3 font-body-sm text-body-sm text-error">
            {loadError}
          </p>
        ) : null}

        {observerName ? (
          <div className="mx-6 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-surface-muted p-3">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Mode observer — role ini sedang dilatih oleh{" "}
              <strong className="text-on-surface">{observerName}</strong>. Anda
              dapat membaca percakapan, tetapi tidak bisa mengirim pesan.
            </span>
            {lockFree ? (
              <button
                type="button"
                onClick={retakeLock}
                className="rounded-lg bg-primary px-3 py-1.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
              >
                AMBIL ALIH
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Chat history */}
        <div className="scroll-slim flex flex-1 flex-col gap-6 overflow-y-auto bg-surface-muted p-6">
          {isLoading ? (
            <p className="font-body-sm text-body-sm text-secondary">
              Memuat percakapan...
            </p>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ai-border text-primary">
                <span className="material-symbols-outlined ms-fill">psychology</span>
              </div>
              <h3 className="mt-4 font-headline-sm text-headline-sm text-on-surface">
                Mulai melatih {role.name}
              </h3>
              <p className="mt-1 max-w-sm font-body-sm text-body-sm text-secondary">
                Jelaskan SOP utama, edge case, tools yang dipakai, dan tone
                melayani pelanggan. AI akan bertanya balik untuk mengisi
                celah pengetahuan.
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isAI = message.sender === "ai";
              return (
                <div
                  key={message.id}
                  className={`flex max-w-[85%] gap-4 ${
                    isAI ? "" : "flex-row-reverse self-end"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${
                      isAI
                        ? "bg-ai-border text-primary"
                        : "bg-slate-300 text-on-surface-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isAI ? "psychology" : "person"}
                    </span>
                  </div>
                  <div
                    className={`rounded-2xl p-4 font-body-md text-body-md text-on-surface shadow-sm ${
                      isAI
                        ? "ai-bubble rounded-tl-sm"
                        : "user-bubble rounded-tr-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endOfMessagesRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-slate-200 bg-white p-4">
          {sendError ? (
            <p className="mb-2 font-body-sm text-body-sm text-error">
              {sendError}
            </p>
          ) : null}
          {retryAfter ? (
            <p className="mb-2 font-body-sm text-[12px] text-secondary">
              Rate limit aktif. Coba lagi dalam ~{retryAfter} detik.
            </p>
          ) : null}
          <div className="relative flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submitMessage();
                }
              }}
              rows={2}
              maxLength={4000}
              disabled={!isLocked || isSending}
              placeholder={
                isLocked
                  ? "Jelaskan prosedurnya di sini..."
                  : observerName
                    ? "Mode observer — baca saja"
                    : "Training Room terkunci"
              }
              className="w-full resize-none rounded-lg border border-slate-300 bg-surface-muted px-4 py-3 font-body-md text-body-md text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void submitMessage()}
              disabled={!canSend}
              aria-label="Kirim pesan"
              className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-lg bg-primary p-3 text-white transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Sidebar (right rail) ──────────────────────────────────────── */}
      <aside className="flex flex-col gap-4 pb-8 lg:col-span-3 lg:pb-0">
        {/* Brain Readiness */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <h3 className="mb-4 font-headline-sm text-[18px] text-on-surface">
            Brain Readiness
          </h3>
          <ReadinessRing percent={completeness} />
          <p className="font-body-sm text-body-sm text-secondary">
            Completeness
          </p>
        </div>

        {/* Knowledge Gaps */}
        <div className="flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-headline-sm text-[18px] text-on-surface">
            <span className="material-symbols-outlined text-status-locked">
              error
            </span>
            Knowledge Gaps
          </h3>
          {missingAreas.length === 0 ? (
            <p className="font-body-sm text-body-sm text-secondary">
              AI mengevaluasi kelengkapan setiap 5 pesan training. Celah
              pengetahuan yang terdeteksi akan muncul di sini.
            </p>
          ) : (
            <ul className="space-y-3">
              {missingAreas.map((gap, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border border-status-locked border-l-4 bg-surface-bright p-3"
                >
                  <span className="material-symbols-outlined mt-0.5 text-lg text-status-locked">
                    pending
                  </span>
                  <div>
                    <h4 className="font-data-point text-data-point font-bold text-on-surface">
                      {gap}
                    </h4>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Guide Generation */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {generateError ? (
            <p className="mb-2 font-body-sm text-body-sm text-error">
              {generateError}
            </p>
          ) : null}
          {guideReady ? (
            <div className="space-y-2">
              <p className="flex items-center gap-2 font-body-sm text-body-sm font-medium text-primary">
                <span className="material-symbols-outlined text-[18px]">
                  check_circle
                </span>
                Guide berhasil dibuat!
              </p>
              <Link
                href={`/app/roles/${role.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 px-4 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
              >
                <span className="material-symbols-outlined">auto_stories</span>
                LIHAT GUIDE
              </Link>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void generateGuide()}
                disabled={!canGenerate}
                className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 px-4 font-label-caps text-label-caps transition-colors ${
                  canGenerate
                    ? "bg-status-ready text-white hover:brightness-95"
                    : "cursor-not-allowed border border-slate-300 bg-slate-200 text-slate-400"
                }`}
              >
                <span className="material-symbols-outlined">
                  {isGenerating ? "progress_activity" : "auto_awesome"}
                </span>
                {isGenerating
                  ? "MENGHASILKAN…"
                  : status === "PUBLISHED"
                    ? "PERBARUI GUIDE"
                    : "GENERATE GUIDE"}
              </button>
              {!canGenerate && !isGenerating ? (
                <p className="mt-2 text-center text-[11px] uppercase tracking-wider text-slate-400">
                  Butuh status SIAP (≥ 75% completeness)
                </p>
              ) : null}
              {status === "PUBLISHED" ? (
                <Link
                  href={`/app/roles/${role.id}`}
                  className="mt-2 block text-center font-data-point text-data-point text-secondary hover:text-primary"
                >
                  Kelola guide & penugasan →
                </Link>
              ) : null}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
