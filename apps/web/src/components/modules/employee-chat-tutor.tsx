"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { ApiError, apiFetch } from "@/lib/api";
import type { ChatMessageItem, ChatSessionSummary } from "@/lib/chat";

type EmployeeChatTutorProps = {
  roleId: string;
  roleName?: string;
};

const SUGGESTION_CHIPS = [
  "Apa langkah pembukaan shift?",
  "Bagaimana prosedur closing?",
  "Apa yang dilakukan saat komplain pelanggan?",
];

export function EmployeeChatTutor({ roleId, roleName }: EmployeeChatTutorProps) {
  const { getToken } = useAuth();
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Mirrors activeSessionId for in-flight fetch guards — stale responses for
  // a session the user already left must never render.
  const activeSessionIdRef = useRef<string | null>(null);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function startCooldown(seconds = 2) {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    setCooldownRemaining(seconds);

    cooldownTimerRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function loadSessions() {
    setIsLoadingSessions(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) return;

      const data = await apiFetch<{ sessions: ChatSessionSummary[] }>(
        `/api/my/chat/sessions?roleId=${roleId}`,
        { token },
      );

      setSessions(data.sessions);
      if (data.sessions.length > 0 && !activeSessionId) {
        setActiveSessionId(data.sessions[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat sesi chat.");
    } finally {
      setIsLoadingSessions(false);
    }
  }

  async function createNewSession() {
    if (isCreatingSession) return;
    setIsCreatingSession(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError("Sesi tidak valid. Silakan login ulang.");
        return;
      }

      const data = await apiFetch<{ session: ChatSessionSummary }>(
        "/api/my/chat/sessions",
        {
          method: "POST",
          token,
          body: { roleId },
        },
      );

      setSessions((prev) => [data.session, ...prev.slice(0, 9)]);
      setActiveSessionId(data.session.id);
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat sesi baru.");
    } finally {
      setIsCreatingSession(false);
    }
  }

  async function loadMessages(sessionId: string) {
    setIsLoadingMessages(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        setError("Sesi tidak valid. Silakan login ulang.");
        return;
      }

      const data = await apiFetch<{
        session: ChatSessionSummary;
        messages: ChatMessageItem[];
      }>(`/api/my/chat/sessions/${sessionId}/messages`, { token });

      // Overlapping fetch guard: only render if this session is still active.
      if (activeSessionIdRef.current !== sessionId) return;

      setMessages(data.messages);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      if (activeSessionIdRef.current !== sessionId) return;
      setError(err instanceof Error ? err.message : "Gagal memuat pesan chat.");
    } finally {
      if (activeSessionIdRef.current === sessionId) {
        setIsLoadingMessages(false);
      }
    }
  }

  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();

    const text = inputText.trim();
    if (!text || isSending || cooldownRemaining > 0) return;

    // Flip the flag before ANY await — two rapid Enter presses (keydown +
    // form submit) both pass the guard above otherwise.
    setIsSending(true);
    setError(null);

    let targetSessionId = activeSessionId;
    if (!targetSessionId) {
      // Auto-create first session
      try {
        const token = await getToken();
        if (!token) {
          setError("Sesi tidak valid. Silakan login ulang.");
          return;
        }
        const sData = await apiFetch<{ session: ChatSessionSummary }>(
          "/api/my/chat/sessions",
          {
            method: "POST",
            token,
            body: { roleId },
          },
        );
        setSessions([sData.session]);
        setActiveSessionId(sData.session.id);
        targetSessionId = sData.session.id;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal membuat sesi chat.");
        return;
      }
    }

    setInputText("");

    // Optimistic user message
    const tempUserMsg: ChatMessageItem = {
      id: `temp-${Date.now()}`,
      sender: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setTimeout(scrollToBottom, 50);

    const rollback = () => {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      // Restore the typed text so a failed send isn't lost.
      setInputText((prev) => (prev ? prev : text));
    };

    try {
      const token = await getToken();
      if (!token) {
        rollback();
        setError("Sesi tidak valid. Silakan login ulang.");
        return;
      }

      const data = await apiFetch<{
        userMessage: ChatMessageItem;
        aiMessage: ChatMessageItem;
      }>(`/api/my/chat/sessions/${targetSessionId}/messages`, {
        method: "POST",
        token,
        body: { content: text },
      });

      setMessages((prev) =>
        prev
          .map((msg) => (msg.id === tempUserMsg.id ? data.userMessage : msg))
          .concat(data.aiMessage),
      );
      startCooldown(2);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      rollback();
      if (err instanceof ApiError && err.status === 429) {
        const retry =
          typeof err.body === "object" &&
          err.body &&
          "retryAfter" in err.body &&
          typeof (err.body as { retryAfter?: unknown }).retryAfter === "number"
            ? (err.body as { retryAfter: number }).retryAfter
            : 5;
        startCooldown(retry);
        setError(`Rate limit aktif. Tunggu ${retry} detik sebelum mengirim lagi.`);
      } else {
        setError(
          err instanceof Error ? err.message : "Gagal mengirim pesan ke AI tutor.",
        );
      }
    } finally {
      setIsSending(false);
    }
  }

  useEffect(() => {
    void loadSessions();
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    if (activeSessionId) {
      void loadMessages(activeSessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      {/* Sessions sidebar */}
      <aside className="flex flex-col rounded-lg border border-slate-200 bg-surface-container-lowest p-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-outline-variant pb-3">
          <p className="font-label-caps text-label-caps text-secondary">
            RIWAYAT CHAT
          </p>
          <button
            type="button"
            onClick={() => void createNewSession()}
            disabled={isCreatingSession}
            aria-label="Sesi baru"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-on-primary transition-colors hover:bg-primary-container disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
          </button>
        </div>

        {isLoadingSessions ? (
          <p className="mt-3 font-body-sm text-[12px] text-secondary">
            Memuat sesi...
          </p>
        ) : sessions.length === 0 ? (
          <p className="mt-3 font-body-sm text-[12px] text-secondary">
            Belum ada sesi tanya jawab.
          </p>
        ) : (
          <ul className="scroll-slim mt-3 max-h-64 space-y-1 overflow-y-auto lg:max-h-none">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSessionId(session.id)}
                    className={`w-full rounded-lg px-2.5 py-2 text-left font-body-sm text-body-sm transition ${
                      isActive
                        ? "bg-primary-fixed-dim/50 font-medium text-on-surface"
                        : "text-secondary hover:bg-surface-container-high hover:text-on-surface"
                    }`}
                  >
                    <span className="block truncate">{session.title}</span>
                    <span className="mt-0.5 block font-data-point text-[10px] text-outline">
                      {new Date(session.updatedAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Main chat column */}
      <section className="flex h-[72vh] max-h-[680px] min-h-[440px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-surface-container-lowest shadow-sm">
        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary-container">
              <span className="material-symbols-outlined ms-fill text-on-primary-container">
                psychology
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-status-ready" />
            </div>
            <div>
              <h3 className="font-headline-sm text-[18px] text-on-surface">
                AI Tutor{roleName ? `: ${roleName}` : ""}
              </h3>
              <p className="font-body-sm text-[12px] text-secondary">
                Online 24/7 · Berbasis SOP & guide yang disetujui
              </p>
            </div>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-ai-border bg-ai-accent px-3 py-1 font-label-caps text-[10px] text-primary sm:inline-flex">
            <span className="material-symbols-outlined ms-fill text-[14px]">
              verified_user
            </span>
            GROUNDED AI
          </span>
        </div>

        {/* Message thread */}
        <div className="scroll-slim flex-1 space-y-4 overflow-y-auto bg-surface-muted p-4">
          {isLoadingMessages ? (
            <p className="text-center font-body-sm text-[12px] text-secondary">
              Memuat riwayat chat...
            </p>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container">
                <span className="material-symbols-outlined ms-fill text-[28px] text-on-primary-container">
                  psychology
                </span>
              </div>
              <h4 className="mt-4 font-headline-sm text-headline-sm text-on-surface">
                Tanya apapun seputar peran ini
              </h4>
              <p className="mt-1 max-w-sm font-body-sm text-body-sm text-secondary">
                AI Tutor ini dilatih khusus berdasarkan SOP dan guide yang
                diajarkan oleh owner/HR Anda.
              </p>
            </div>
          ) : (
            <>
              {/* Date separator pill */}
              <div className="flex justify-center">
                <span className="rounded-full bg-surface-container-high px-3 py-1 font-label-caps text-[10px] text-secondary">
                  HARI INI
                </span>
              </div>

              {messages.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex max-w-[85%] gap-3 ${
                      isUser ? "flex-row-reverse self-end" : "self-start"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isUser
                          ? "bg-slate-300 text-on-surface-variant"
                          : "bg-ai-border text-primary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {isUser ? "person" : "psychology"}
                      </span>
                    </div>

                    <div
                      className={`rounded-2xl px-4 py-2.5 font-body-md text-body-md shadow-sm ${
                        isUser
                          ? "user-bubble-green rounded-br-sm"
                          : "ai-bubble rounded-bl-sm text-on-surface"
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="chat-markdown">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeSanitize]}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {isSending ? (
            <div className="flex max-w-[85%] gap-3 self-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ai-border text-primary">
                <span className="material-symbols-outlined text-sm">
                  psychology
                </span>
              </div>
              <div className="ai-bubble rounded-2xl rounded-bl-sm px-4 py-2.5 font-body-md text-body-md text-on-surface shadow-sm">
                <span className="typing-cursor">AI Tutor sedang mengetik</span>
              </div>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        {/* Input zone */}
        <div className="border-t border-outline-variant bg-white p-4">
          {error ? (
            <p className="mb-2 font-body-sm text-body-sm text-error">{error}</p>
          ) : null}

          {/* Quick suggestion chips */}
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={isSending || cooldownRemaining > 0}
                onClick={() => setInputText(chip)}
                className="rounded-full border border-outline-variant px-3.5 py-1.5 font-body-sm text-[12px] text-secondary transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => void handleSendMessage(e)} className="flex items-end gap-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSendMessage();
                }
              }}
              placeholder="Tanyakan SOP, aturan, atau cara kerja peran ini..."
              rows={2}
              maxLength={4000}
              className="flex-1 resize-none rounded-lg border border-slate-300 bg-surface-muted px-4 py-3 font-body-md text-body-md text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isSending || cooldownRemaining > 0}
              aria-label="Kirim pesan"
              className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              <span className="material-symbols-outlined">
                {cooldownRemaining > 0 ? "hourglass_top" : "send"}
              </span>
            </button>
          </form>
          <p className="mt-2 text-center font-body-sm text-[11px] text-outline">
            Jawaban AI Tutor berdasarkan SOP &amp; panduan resmi peran ini.
            Selalu verifikasi prosedur kritis kepada atasan Anda. · Cooldown 2
            detik antar pesan.
          </p>
        </div>
      </section>
    </div>
  );
}
