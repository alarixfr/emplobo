"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { ApiError, apiFetch } from "@/lib/api";
import type { KnowledgeDocumentSummary, KnowledgeQuota } from "@/lib/knowledge";
import { KNOWLEDGE_FILE_ACCEPT } from "@/components/ui/file-dropzone";
import { ReadinessRing } from "@/components/ui/readiness-ring";
import { KnowledgeGaps } from "@/components/roles/knowledge-gaps";
import { Skeleton } from "@/components/ui/skeleton";
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

  const [missingAreas, setMissingAreas] = useState<string[]>([]);

  if (!selectedRole) {
    return (
      <section className="rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center">
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
    setMissingAreas([]);
    setSelectedRoleId(roleId);
    router.push(`/app/training/${roleId}`);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
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
          className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
        >
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name} · {role.completenessScore}%
            </option>
          ))}
        </select>
      </div>

      {/* ── Roles Context (left rail) ─────────────────────────────────── */}
      <aside className="hidden h-[calc(100vh-14rem)] min-h-[560px] flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm lg:col-span-3 lg:flex">
        <div className="border-b border-outline-variant bg-surface-container-lowest p-4">
          <h2 className="font-headline-sm text-[18px] text-on-surface">
            Roles Context
          </h2>
        </div>
        <div className="scroll-slim flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-surface-container-low p-4">
          {roles.map((role) => {
            const active = role.id === selectedRole.id;
            const statusLabel =
              role.status === "PUBLISHED"
                ? "PUBLISHED"
                : role.status === "READY"
                  ? "READY"
                  : role.completenessScore > 0
                    ? "IN PROGRESS"
                    : "DRAFT";
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => selectRole(role.id)}
                className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary-fixed-dim/40 shadow-sm ring-1 ring-primary"
                    : "border-outline-variant bg-surface-container-lowest shadow-sm hover:border-outline"
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

        {/* Celah Pengetahuan — pinned to the bottom of the Roles Context rail */}
        <div className="scroll-slim flex max-h-[40%] min-h-[96px] flex-col overflow-y-auto border-t border-outline-variant bg-surface-container-lowest p-4">
          <KnowledgeGaps gaps={missingAreas} size="sm" />
        </div>
      </aside>

      {/* Center chat + right rail */}
      <RoleTrainingChat
        key={selectedRole.id}
        role={selectedRole}
        missingAreas={missingAreas}
        setMissingAreas={setMissingAreas}
      />
    </div>
  );
}

type RoleTrainingChatProps = {
  role: TrainingRoleSummary;
  missingAreas: string[];
  setMissingAreas: Dispatch<SetStateAction<string[]>>;
};

function RoleTrainingChat({ role, missingAreas, setMissingAreas }: RoleTrainingChatProps) {
  const { getToken, isLoaded } = useAuth();
  const [messages, setMessages] = useState<TrainingMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<RoleStatus>(role.status);
  const [completeness, setCompleteness] = useState(role.completenessScore);
  const [isLocked, setIsLocked] = useState(false);
  const [observerName, setObserverName] = useState<string | null>(null);
  const [lockFree, setLockFree] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [draftCreated, setDraftCreated] = useState(false);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocumentSummary[]>([]);
  const [knowledgeQuota, setKnowledgeQuota] = useState<KnowledgeQuota | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [justUploadedId, setJustUploadedId] = useState<string | null>(null);
  const justUploadedTimer = useRef<number | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const pollRef = useRef<number | null>(null);
  const statusPollRef = useRef<number | null>(null);
  const lockedRef = useRef(false);
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const historyRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(
    () => isLocked && !isSending && input.trim().length > 0,
    [isLocked, isSending, input],
  );

  const canGenerate =
    isLocked && (status === "READY" || status === "PUBLISHED") && !isGenerating;

  const visibleDocs = knowledgeDocs.slice(0, 4);
  const draftCount = knowledgeDocs.filter((doc) => doc.status === "DRAFT").length;

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

  async function loadKnowledgeDocs() {
    const data = await withToken((token) =>
      apiFetch<{
        quota: KnowledgeQuota;
        documents: KnowledgeDocumentSummary[];
      }>("/api/knowledge", { token }),
    );
    setKnowledgeDocs(data.documents);
    setKnowledgeQuota(data.quota);
  }

  async function deleteKnowledgeDocument(documentId: string) {
    const doc = knowledgeDocs.find((d) => d.id === documentId);
    if (!doc || deletingId) return;
    const confirmed = window.confirm(
      `Hapus file "${doc.title}" dari Knowledge Library?`,
    );
    if (!confirmed) return;

    setDeletingId(documentId);
    setUploadNotice(null);
    setGenerateError(null);
    try {
      await withToken((token) =>
        apiFetch<{ deleted: boolean }>(`/api/knowledge/${documentId}`, {
          method: "DELETE",
          token,
        }),
      );
      if (justUploadedId === documentId) setJustUploadedId(null);
      setUploadNotice(`File "${doc.title}" dihapus dari Knowledge Library.`);
      await loadKnowledgeDocs();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Gagal menghapus file.");
    } finally {
      setDeletingId(null);
    }
  }

  async function confirmKnowledgeDocument(documentId: string) {
    setApprovingId(documentId);
    setUploadNotice(null);
    setGenerateError(null);
    try {
      const data = await withToken((token) =>
        apiFetch<{ document: KnowledgeDocumentSummary }>(
          `/api/knowledge/${documentId}/approve`,
          { method: "POST", token },
        ),
      );
      setKnowledgeDocs((prev) =>
        prev.map((doc) =>
          doc.id === data.document.id
            ? { ...doc, status: data.document.status, updatedAt: data.document.updatedAt }
            : doc,
        ),
      );
      setUploadNotice(
        `Dokumen "${data.document.title}" dikonfirmasi dan sekarang dipakai AI.`,
      );
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Gagal konfirmasi dokumen.");
    } finally {
      setApprovingId(null);
    }
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
      await loadKnowledgeDocs();
    } catch (err) {
      if (err instanceof ApiError && err.status === 423) {
        setIsLocked(false);
        lockedRef.current = false;
        const body = err.body as { activeTrainerName?: string | null } | null;
        setObserverName(body?.activeTrainerName ?? "admin lain");

        // Observer mode still loads the transcript + knowledge list read-only
        // (Section 5.2), so the side rail shows real status instead of stale
        // "Belum ada knowledge file" text.
        try {
          await loadTranscript();
          await loadKnowledgeDocs();
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
    const content = input.trim();
    setSendError(null);
    setRetryAfter(null);
    setIsSending(true);
    setInput("");

    // Optimistic render — show the admin message immediately and a
    // "thinking" bubble while the AI reply is generated server-side.
    const optimisticId = `pending-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const optimisticAdmin: TrainingMessage = {
      id: optimisticId,
      sender: "admin",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticAdmin]);
    setIsThinking(true);

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
          body: { content },
        }),
      );

      setMessages((prev) => [
        ...prev.filter((message) => message.id !== optimisticId),
        data.adminMessage,
        data.aiMessage,
      ]);
      setStatus(data.role.status);
      setCompleteness(data.role.completenessScore);
    } catch (err) {
      // The server rolled the admin message back on AI failure — remove the
      // optimistic copy and restore the text so nothing is lost.
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      setInput(content);
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
      setIsThinking(false);
      setIsSending(false);
    }
  }

  async function generateGuide() {
    if (!canGenerate) return;
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const data = await withToken((token) =>
        apiFetch<{
          draft: { targetVersion: number };
          role: { id: string; status: RoleStatus };
        }>(`/api/roles/${role.id}/guide/generate`, {
          method: "POST",
          token,
        }),
      );
      // Generation no longer publishes immediately — it produces a reviewable
      // draft. Status stays READY/PUBLISHED until the admin publishes it.
      setStatus(data.role.status);
      setDraftCreated(true);
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

  function triggerFilePicker() {
    if (!isLocked || uploadingFile) return;
    fileInputRef.current?.click();
  }

  function beginDrag() {
    if (!isLocked || uploadingFile) return;
    dragDepth.current += 1;
    setIsDraggingFile(true);
  }

  function endDrag() {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDraggingFile(false);
  }

  function endAllDrag() {
    dragDepth.current = 0;
    setIsDraggingFile(false);
  }

  async function uploadKnowledgeFile(file: File) {
    setUploadNotice(null);
    setGenerateError(null);

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setGenerateError("File melebihi batas 10 MB per dokumen.");
      return;
    }
    const supported = KNOWLEDGE_FILE_ACCEPT.split(",")
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean)
      .some((token) =>
        token.startsWith(".")
          ? file.name.toLowerCase().endsWith(token)
          : file.type.toLowerCase() === token,
      );
    if (!supported) {
      setGenerateError(
        "Jenis file tidak didukung. Gunakan PDF, DOCX, XLSX, CSV, TXT, Markdown, HTML, JSON, XML, atau YAML.",
      );
      return;
    }

    setUploadingFile(true);
    endAllDrag();
    try {
      const title = file.name.replace(/\.[^.]+$/, "") || "Knowledge File";
      const token = await getToken();
      if (!token) {
        throw new Error("Sesi tidak valid. Silakan login ulang.");
      }

      const body = new FormData();
      body.set("file", file);
      body.set("title", title);
      body.set("description", `Diunggah dari Training Room · ${role.name}`);

      const uploaded = await apiFetch<{ document: { id: string } }>(
        "/api/knowledge/upload",
        {
          method: "POST",
          token,
          body,
        },
      );

      if (justUploadedTimer.current) window.clearTimeout(justUploadedTimer.current);
      setJustUploadedId(uploaded.document.id);
      justUploadedTimer.current = window.setTimeout(
        () => setJustUploadedId(null),
        10_000,
      );

      setUploadNotice(
        `File ${file.name} berhasil diunggah. File masih DRAFT, konfirmasi dulu lewat panel Knowledge Library sebelum dipakai AI.`,
      );
      await loadKnowledgeDocs();
    } catch (err) {
      setUploadNotice(null);
      setGenerateError(err instanceof Error ? err.message : "Gagal mengunggah file.");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  useEffect(() => {
    if (!isLoaded) return; // wait for Clerk before acquiring the lock
    void acquireLockAndLoad();
    void pollStatus();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (statusPollRef.current) window.clearInterval(statusPollRef.current);
      if (justUploadedTimer.current) window.clearTimeout(justUploadedTimer.current);
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
  }, [role.id, isLoaded]);

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
    // Suppress the browser default for stray file drops anywhere in the room
    // so a miss never navigates the tab to the dropped file.
    function preventDefault(event: DragEvent) {
      event.preventDefault();
    }
    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);
    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);

  useEffect(() => {
    // Jump to the newest message whenever new ones arrive (including the
    // optimistic "thinking" bubble).
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isThinking]);

  // On first open, place the chat at the newest message without an animation,
  // so the user never lands mid-conversation and has to scroll down.
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight });
    }
  }, [isLoading, messages.length]);

  return (
    <>
      {/* ── Main chat column (center) ─────────────────────────────────── */}
      <section className="flex h-[calc(100vh-14rem)] min-h-[560px] flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm lg:col-span-6">
        {/* Header */}
        <div className="border-b border-outline-variant bg-surface-container-lowest p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="max-w-2xl">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  {role.name}
                </h2>
                <StatusBadge status={status} />
              </div>
              <p className="max-w-3xl font-body-sm text-body-sm text-on-surface-variant">
                Chat dengan AI Brain untuk mengekstrak prosedur standar role ini, lalu lampirkan file SOP langsung dari composer untuk memperkaya knowledge library.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={KNOWLEDGE_FILE_ACCEPT}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void uploadKnowledgeFile(file);
                }
              }}
            />
          </div>
        </div>

        {loadError ? (
          <p className="mx-5 mt-4 rounded-lg border border-error-container bg-error-container/40 p-4 font-body-sm text-body-sm text-error">
            {loadError}
          </p>
        ) : null}

        {observerName ? (
          <div className="mx-5 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface-container-low p-4">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Mode observer. Role ini sedang dilatih oleh{" "}
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
        <div
          ref={historyRef}
          className="scroll-slim flex flex-1 flex-col gap-5 overflow-y-auto bg-surface-container-low p-5"
        >
          {isLoading || !isLoaded ? (
            <div className="flex flex-col gap-6" aria-busy="true" aria-label="Memuat percakapan">
              {[0, 1].map((i) => (
                <div key={i} className="flex max-w-[85%] gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ai-border text-primary">
                <span className="material-symbols-outlined ms-fill">psychology</span>
              </div>
              <h3 className="mt-4 font-headline-sm text-headline-sm text-on-surface">
                Mulai melatih {role.name}
              </h3>
              <p className="mt-1 max-w-sm font-body-sm text-body-sm text-secondary">
                Jelaskan SOP utamanya, cara menangani kasus khusus, alat yang
                dipakai, dan gaya melayani pelanggan. AI akan bertanya balik
                untuk mengisi celah pengetahuan.
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isAI = message.sender === "ai";
              return (
                <div
                  key={message.id}
                  className={`animate-fade-rise flex max-w-[85%] items-start gap-4 ${
                    isAI ? "self-start" : "flex-row-reverse self-end"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${
                      isAI
                        ? "bg-ai-border text-primary"
                        : "bg-surface-container-high text-on-surface-variant"
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
                    {isAI ? (
                      <div className="chat-markdown">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeSanitize]}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {isThinking ? (
            <div
              role="status"
              aria-live="polite"
              className="flex max-w-[85%] items-start gap-4 self-start"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ai-border text-primary">
                <span className="material-symbols-outlined text-sm">
                  psychology
                </span>
              </div>
              <div className="ai-bubble rounded-tl-sm rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span aria-hidden className="flex items-center gap-1">
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                      style={{ animationDelay: "300ms" }}
                    />
                  </span>
                  <span className="font-body-sm text-[12px] text-secondary">
                    AI sedang berpikir...
                  </span>
                </div>
              </div>
            </div>
          ) : null}
          <div ref={endOfMessagesRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-outline-variant bg-surface-container-lowest p-4">
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
          <div
            className={`relative flex items-end gap-2 rounded-lg border p-3 transition-all ${
              isDraggingFile && isLocked && !uploadingFile
                ? "border-primary bg-primary/5 ring-2 ring-primary-fixed-dim/40"
                : uploadingFile
                  ? "border-outline-variant bg-surface-container-low"
                  : "border-outline-variant bg-surface-container-lowest focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-fixed-dim/50"
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              beginDrag();
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!isLocked || uploadingFile) return;
              event.dataTransfer.dropEffect = "copy";
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              endDrag();
            }}
            onDrop={(event) => {
              event.preventDefault();
              endAllDrag();
              if (!isLocked || uploadingFile) return;
              const file = event.dataTransfer.files?.[0];
              if (file) {
                void uploadKnowledgeFile(file);
              }
            }}
          >
            {isDraggingFile && isLocked && !uploadingFile ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-primary/5"
              >
                <span className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-label-caps text-label-caps text-on-primary shadow-sm">
                  <span className="material-symbols-outlined text-[16px]">
                    upload_file
                  </span>
                  LEPASKAN FILE UNTUK UPLOAD
                </span>
              </div>
            ) : null}

            <button
              type="button"
              onClick={triggerFilePicker}
              disabled={uploadingFile || !isLocked}
              aria-label="Lampirkan file knowledge ke Knowledge Library"
              title="Unggah file SOP ke Knowledge Library"
              className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-secondary transition-colors hover:border-primary hover:bg-surface-container-low hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">
                {uploadingFile ? "progress_activity" : "attach_file"}
              </span>
            </button>
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
                isThinking
                  ? "AI sedang memproses pesan..."
                  : isLocked
                    ? "Jelaskan prosedurnya di sini..."
                    : observerName
                      ? "Mode observer. Baca saja"
                      : "Training Room terkunci"
              }
              className="w-full resize-none rounded-lg border-0 bg-transparent px-2 py-3 font-body-md text-body-md text-on-surface outline-none transition-colors placeholder:text-outline disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void submitMessage()}
              disabled={!canSend}
              aria-label="Kirim pesan"
              className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-lg bg-primary p-3 text-white transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              <span
                className={`material-symbols-outlined${
                  isSending ? " animate-spin" : ""
                }`}
              >
                {isSending ? "progress_activity" : "send"}
              </span>
            </button>
          </div>
          <p className="mt-2 flex items-start gap-1.5 font-body-sm text-[12px] text-secondary">
            <span className="material-symbols-outlined mt-[1px] text-[14px]">
              attach_file
            </span>
            Seret &amp; letakkan file SOP ke kotak ini, atau klik tombol untuk
            mengunggah ke Knowledge Library (maks. 10 MB).
          </p>
        </div>
      </section>

      {/* ── Sidebar (right rail) ──────────────────────────────────────── */}
      <aside className="flex flex-col gap-4 lg:col-span-3">
        {/* Celah Pengetahuan — mobile only (desktop shows it in Roles Context) */}
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm lg:hidden">
          <KnowledgeGaps gaps={missingAreas} />
        </div>

        {/* Kesiapan AI + Guide Generation */}
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 text-center shadow-sm">
          <h3 className="mb-4 font-headline-sm text-[18px] text-on-surface">
            Kesiapan AI
          </h3>
          <ReadinessRing percent={completeness} />
          <p className="font-body-sm text-body-sm text-secondary">
            Kelengkapan
          </p>

          {/* Guide Generation — below Kelengkapan */}
          <div className="mt-4 border-t border-outline-variant pt-4">
            {generateError ? (
              <p className="mb-2 font-body-sm text-body-sm text-error">
                {generateError}
              </p>
            ) : null}
            {draftCreated ? (
              <div className="space-y-2">
                <p className="flex items-center justify-center gap-2 font-body-sm text-body-sm font-medium text-primary">
                  <span className="material-symbols-outlined text-[18px]">
                    draft
                  </span>
                  Panduan dibuat sebagai draf pembaruan.
                </p>
                <Link
                  href={`/app/roles/${role.id}`}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 px-4 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
                >
                  <span className="material-symbols-outlined">rate_review</span>
                  TINJAU &amp; TERBITKAN
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
                      : "cursor-not-allowed border border-outline-variant bg-surface-container-high text-outline"
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
                  <p className="mt-2 text-center text-[11px] uppercase tracking-wider text-outline">
                    Butuh status READY (≥ 75% completeness)
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
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-label-caps text-label-caps text-secondary">
                PENGETAHUAN TRAINING
              </p>
              <h3 className="mt-1 font-headline-sm text-[18px] text-on-surface">
                Knowledge Library
              </h3>
            </div>
            <span className="rounded-full border border-outline-variant px-3 py-1 font-label-caps text-[10px] text-secondary">
              {knowledgeDocs.length} file
              {draftCount > 0 ? (
                <span className="ml-1.5 text-status-locked">
                  · {draftCount} DRAFT
                </span>
              ) : null}
            </span>
          </div>
          {draftCount > 0 ? (
            <div className="rounded-lg border border-status-locked bg-status-locked/10 p-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-status-locked">
                  schedule
                </span>
                <p className="font-label-caps text-label-caps text-status-locked">
                  {draftCount} DARI {knowledgeQuota?.draftLimit ?? "—"} SLOT FILE DRAFT
                </p>
              </div>
              <p className="mt-1 font-body-sm text-[12px] leading-5 text-on-surface-variant">
                File belum dikonfirmasi, jadi belum dipakai AI. Klik KONFIRMASI
                pada tiap file untuk mengaktifkannya sebagai materi training.
                Konfirmasi atau hapus file DRAFT yang tidak terpakai agar tersisa
                ruang untuk file baru.
              </p>
            </div>
          ) : null}

          {uploadNotice ? (
            <p className="rounded-lg border border-status-ready/30 bg-status-ready/10 p-4 font-body-sm text-body-sm text-on-surface">
              {uploadNotice}
            </p>
          ) : null}

          <div className="mt-4 space-y-3">
            {visibleDocs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-4 font-body-sm text-body-sm text-secondary">
                Belum ada knowledge file. Seret file SOP ke composer atau klik
                ikon lampiran untuk mengunggah.
              </p>
            ) : (
              visibleDocs.map((doc) => (
                <div
                  key={doc.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    justUploadedId === doc.id
                      ? "border-status-ready/60 bg-status-ready/5"
                      : "border-outline-variant bg-surface-container-low"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-body-md text-body-md font-semibold text-on-surface">
                          {doc.title}
                        </p>
                        {justUploadedId === doc.id ? (
                          <span className="shrink-0 rounded-full bg-status-ready px-2 py-0.5 font-label-caps text-[10px] text-white">
                            BARU
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate font-body-sm text-[12px] text-secondary">
                        {doc.fileName ?? doc.sourceType} ·{" "}
                        {Math.round(doc.sourceBytes / 1024)} KB
                      </p>
                    </div>
                    {doc.status === "DRAFT" ? (
                      <span className="shrink-0 rounded-full border border-status-locked px-2 py-0.5 font-label-caps text-[10px] text-status-locked">
                        DRAFT
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full border border-status-ready px-2 py-0.5 font-label-caps text-[10px] text-status-ready">
                        AKTIF
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-outline-variant px-2 py-1 font-label-caps text-[10px] text-secondary">
                      v{doc.version}
                    </span>
                    {doc.status === "DRAFT" ? (
                      <button
                        type="button"
                        onClick={() => void confirmKnowledgeDocument(doc.id)}
                        disabled={approvingId === doc.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-status-ready px-2.5 py-1 font-label-caps text-[10px] text-status-ready transition-colors hover:bg-status-ready/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {approvingId === doc.id ? (
                          <span className="material-symbols-outlined animate-spin text-[14px]">
                            progress_activity
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-[14px]">
                            check_circle
                          </span>
                        )}
                        KONFIRMASI
                      </button>
                    ) : (
                      <span className="font-data-point text-[11px] text-secondary">
                        Dipakai AI
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void deleteKnowledgeDocument(doc.id)}
                      disabled={deletingId === doc.id}
                      aria-label={`Hapus file ${doc.title}`}
                      title="Hapus file"
                      className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-secondary transition-colors hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span
                        className={`material-symbols-outlined text-[16px]${
                          deletingId === doc.id ? " animate-spin" : ""
                        }`}
                      >
                        {deletingId === doc.id ? "progress_activity" : "delete"}
                      </span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <p className="mt-3 font-body-sm text-[12px] leading-5 text-secondary">
            File yang ditambahkan otomatis menjadi DRAFT. Konfirmasi lewat panel
            ini atau Knowledge Library sebelum dipakai AI. Maksimal{" "}
            {knowledgeQuota?.draftLimit ?? "5"} file DRAFT dapat menunggu
            konfirmasi sekaligus.
          </p>
        </div>
      </aside>
    </>
  );
}
