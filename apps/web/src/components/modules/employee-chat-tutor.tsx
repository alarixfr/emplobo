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

export function EmployeeChatTutor({ roleId, roleName }: EmployeeChatTutorProps) {
  const { getToken } = useAuth();
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;

      const data = await apiFetch<{ session: ChatSessionSummary }>("/api/my/chat/sessions", {
        method: "POST",
        token,
        body: { roleId },
      });

      setSessions((prev) => [data.session, ...prev.slice(0, 9)]);
      setActiveSessionId(data.session.id);
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat sesi baru.");
    }
  }

  async function loadMessages(sessionId: string) {
    setIsLoadingMessages(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) return;

      const data = await apiFetch<{ session: ChatSessionSummary; messages: ChatMessageItem[] }>(
        `/api/my/chat/sessions/${sessionId}/messages`,
        { token },
      );

      setMessages(data.messages);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat pesan chat.");
    } finally {
      setIsLoadingMessages(false);
    }
  }

  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();

    const text = inputText.trim();
    if (!text || isSending || cooldownRemaining > 0) return;

    let targetSessionId = activeSessionId;
    if (!targetSessionId) {
      // Auto-create first session
      try {
        const token = await getToken();
        if (!token) return;
        const sData = await apiFetch<{ session: ChatSessionSummary }>("/api/my/chat/sessions", {
          method: "POST",
          token,
          body: { roleId },
        });
        setSessions([sData.session]);
        setActiveSessionId(sData.session.id);
        targetSessionId = sData.session.id;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal membuat sesi chat.");
        return;
      }
    }

    setIsSending(true);
    setError(null);
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

    try {
      const token = await getToken();
      if (!token) return;

      const data = await apiFetch<{
        userMessage: ChatMessageItem;
        aiMessage: ChatMessageItem;
      }>(`/api/my/chat/sessions/${targetSessionId}/messages`, {
        method: "POST",
        token,
        body: { content: text },
      });

      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempUserMsg.id ? data.userMessage : msg)).concat(data.aiMessage),
      );
      startCooldown(2);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
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
        setError(err instanceof Error ? err.message : "Gagal mengirim pesan ke AI tutor.");
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
    if (activeSessionId) {
      void loadMessages(activeSessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      {/* Sessions Sidebar */}
      <aside className="flex flex-col rounded-xl border border-border bg-card p-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Riwayat Chat
          </p>
          <button
            type="button"
            onClick={() => void createNewSession()}
            className="rounded-md bg-brand px-2 py-1 text-xs font-semibold text-brand-foreground transition hover:opacity-90"
          >
            + Sesi Baru
          </button>
        </div>

        {isLoadingSessions ? (
          <p className="mt-3 text-xs text-muted-foreground">Memuat sesi...</p>
        ) : sessions.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">Belum ada sesi tanya jawab.</p>
        ) : (
          <ul className="mt-3 space-y-1 overflow-y-auto">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSessionId(session.id)}
                    className={`w-full rounded-md px-2.5 py-2 text-left text-xs transition ${
                      isActive
                        ? "bg-brand-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span className="block truncate">{session.title}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
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

      {/* Main Chat Box */}
      <section className="flex h-[600px] flex-col rounded-xl border border-border bg-card">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">
              AI Tutor {roleName ? `· ${roleName}` : ""}
            </h3>
            <p className="text-xs text-muted-foreground">
              Bertanya seputar SOP dan panduan kerja peran ini secara 24/7.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-brand-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground">
            Grounded AI
          </span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {isLoadingMessages ? (
            <p className="text-center text-xs text-muted-foreground">Memuat riwayat chat...</p>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="rounded-full bg-brand-muted p-3 text-brand">💬</div>
              <h4 className="mt-2 text-sm font-semibold text-foreground">
                Tanya Apapun Seputar Peran Ini
              </h4>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                AI Tutor ini dilatih khusus berdasarkan SOP dan Guide yang diajarkan oleh owner/HR Anda.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser ? (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground">
                      AI
                    </div>
                  ) : null}

                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
                      isUser
                        ? "bg-brand text-brand-foreground"
                        : "border border-border bg-background text-foreground"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="prose prose-xs max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-code:text-foreground">
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
            })
          )}

          {isSending ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-brand-foreground">
                AI
              </div>
              <p className="animate-pulse">AI Tutor sedang berpikir...</p>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-border p-3">
          {error ? (
            <p className="mb-2 text-xs text-accent">{error}</p>
          ) : null}

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
              className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isSending || cooldownRemaining > 0}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-xs font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {cooldownRemaining > 0
                ? `${cooldownRemaining}s`
                : isSending
                  ? "Mengirim..."
                  : "Kirim"}
            </button>
          </form>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Tekan Enter untuk kirim, Shift+Enter untuk baris baru · Cooldown 2 detik
          </p>
        </div>
      </section>
    </div>
  );
}
