"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { apiFetch } from "@/lib/api";
import type {
  KnowledgeDocumentDetail,
  KnowledgeDocumentSummary,
  KnowledgeLibraryResponse,
  KnowledgeQuota,
} from "@/lib/knowledge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { ProgressBar } from "@/components/ui/progress-bar";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extensionOf(fileName: string | null): string {
  const ext = fileName?.split(".").pop()?.toLowerCase() ?? "";
  return ext || "doc";
}

function documentIcon(fileName: string | null, sourceType: string): string {
  if (sourceType !== "UPLOAD") return "edit_note";
  switch (extensionOf(fileName)) {
    case "pdf":
      return "picture_as_pdf";
    case "docx":
    case "doc":
      return "description";
    case "xlsx":
    case "xls":
    case "csv":
    case "tsv":
      return "table_view";
    case "html":
    case "htm":
    case "xml":
    case "json":
    case "yaml":
    case "yml":
      return "code";
    default:
      return "article";
  }
}

function KnowledgeSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Memuat knowledge library">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm"
          >
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-2 h-8 w-16" />
            <Skeleton className="mt-2 h-1.5 w-full" />
          </div>
        ))}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="border-b border-outline-variant p-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-72" />
          </div>
          <div className="space-y-4 p-5">
            <Skeleton className="h-80 w-full rounded-lg" />
          </div>
        </div>
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm"
            >
              <Skeleton className="h-4 w-36" />
              <Skeleton className="mt-4 h-32 w-full rounded-lg" />
              <Skeleton className="mt-3 h-9 w-36" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function KnowledgeLibrary() {
  const { getToken, isLoaded } = useAuth();
  const [quota, setQuota] = useState<KnowledgeQuota | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocumentSummary[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocumentDetail | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatingManual, setCreatingManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftContent, setDraftContent] = useState("");

  const filteredDocuments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return documents;
    return documents.filter((document) => {
      const haystack = [
        document.title,
        document.description ?? "",
        document.excerpt,
        document.fileName ?? "",
        document.mimeType ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [documents, search]);

  const uploadedCount = useMemo(
    () => documents.filter((document) => document.sourceType === "UPLOAD").length,
    [documents],
  );
  const draftCount = useMemo(
    () => documents.filter((document) => document.status === "DRAFT").length,
    [documents],
  );
  const totalChunks = useMemo(
    () => documents.reduce((sum, document) => sum + document.chunkCount, 0),
    [documents],
  );
  const activeChunks = useMemo(
    () =>
      documents
        .filter((document) => document.status === "ACTIVE")
        .reduce((sum, document) => sum + document.chunkCount, 0),
    [documents],
  );

  async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
    const token = await getToken();
    if (!token) {
      throw new Error("Sesi tidak valid. Silakan login ulang.");
    }
    return fn(token);
  }

  async function loadOverview(nextSelectedId?: string | null) {
    if (!isLoaded) return;
    setOverviewLoading(true);
    setError(null);
    try {
      const data = await withToken((token) =>
        apiFetch<KnowledgeLibraryResponse>("/api/knowledge", { token }),
      );
      setQuota(data.quota);
      setDocuments(data.documents);

      const selection = nextSelectedId ?? selectedDocumentId;
      const exists = data.documents.some((document) => document.id === selection);
      setSelectedDocumentId(exists ? selection : data.documents[0]?.id ?? null);

      if (data.documents.length === 0) {
        setSelectedDocument(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat knowledge library.");
    } finally {
      setOverviewLoading(false);
    }
  }

  async function loadDocument(documentId: string) {
    setDetailLoading(true);
    setError(null);
    try {
      const data = await withToken((token) =>
        apiFetch<{ document: KnowledgeDocumentDetail }>(`/api/knowledge/${documentId}`, { token }),
      );
      setSelectedDocument(data.document);
      setDraftTitle(data.document.title);
      setDraftDescription(data.document.description ?? "");
      setDraftContent(data.document.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat dokumen.");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    if (isLoaded) {
      void loadOverview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  useEffect(() => {
    if (!selectedDocumentId) {
      setSelectedDocument(null);
      return;
    }
    void loadDocument(selectedDocumentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDocumentId]);

  useEffect(() => {
    if (!selectedDocument) return;
    setDraftTitle(selectedDocument.title);
    setDraftDescription(selectedDocument.description ?? "");
    setDraftContent(selectedDocument.content);
  }, [selectedDocument]);

  function handleSelectFile(file: File) {
    setPendingFile(file);
    setUploadTitle(
      (current) =>
        current.trim() ||
        file.name.replace(/\.[^.]+$/, "") ||
        file.name,
    );
    setUploadDescription("");
    setError(null);
    setSuccess(null);
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading || !pendingFile) return;

    const submittedFile = pendingFile;
    const submittedTitle =
      uploadTitle.trim() || submittedFile.name.replace(/\.[^.]+$/, "") || submittedFile.name;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const createdDocument = await withToken((token) => {
        const body = new FormData();
        body.set("file", submittedFile);
        body.set("title", submittedTitle);
        body.set("description", uploadDescription.trim());
        return apiFetch<{ document: KnowledgeDocumentDetail }>("/api/knowledge/upload", {
          method: "POST",
          token,
          body,
        });
      });

      setPendingFile(null);
      setUploadTitle("");
      setUploadDescription("");
      await loadOverview(createdDocument.document.id);
      setSuccess(`Dokumen "${submittedTitle}" berhasil diunggah sebagai DRAFT. Konfirmasi di panel detail agar dipakai AI.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah file.");
    } finally {
      setUploading(false);
    }
  }

  function handleCancelUpload() {
    setPendingFile(null);
    setUploadTitle("");
    setUploadDescription("");
    setError(null);
  }

  async function handleCreateManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creatingManual) return;

    setCreatingManual(true);
    setError(null);
    setSuccess(null);

    try {
      const document = await withToken((token) =>
        apiFetch<{ document: KnowledgeDocumentDetail }>("/api/knowledge/documents", {
          method: "POST",
          token,
          body: {
            title: manualTitle,
            description: manualDescription || undefined,
            content: manualContent,
          },
        }),
      );

      setManualTitle("");
      setManualDescription("");
      setManualContent("");
      await loadOverview(document.document.id);
      setSuccess("Catatan pengetahuan dibuat sebagai DRAFT. Konfirmasi di panel detail agar dipakai AI.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat catatan.");
    } finally {
      setCreatingManual(false);
    }
  }

  async function handleSaveSelected() {
    if (!selectedDocument) return;
    if (saving) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const document = await withToken((token) =>
        apiFetch<{ document: KnowledgeDocumentDetail }>(`/api/knowledge/${selectedDocument.id}`, {
          method: "PATCH",
          token,
          body: {
            title: draftTitle,
            description: draftDescription.trim() ? draftDescription : null,
            content: draftContent,
          },
        }),
      );

      setSelectedDocument(document.document);
      setDocuments((prev) =>
        prev.map((item) =>
          item.id === document.document.id
            ? {
                ...item,
                title: document.document.title,
                description: document.document.description,
                sourceBytes: document.document.sourceBytes,
                version: document.document.version,
                updatedAt: document.document.updatedAt,
                excerpt: document.document.excerpt,
                chunkCount: document.document.chunkCount,
              }
            : item,
        ),
      );
      setSuccess("Perubahan knowledge tersimpan.");
      await loadOverview(document.document.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSelected() {
    if (!selectedDocument) return;
    const confirmed = window.confirm(`Hapus knowledge document "${selectedDocument.title}"?`);
    if (!confirmed || deleting) return;

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      await withToken((token) =>
        apiFetch<{ deleted: boolean }>(`/api/knowledge/${selectedDocument.id}`, {
          method: "DELETE",
          token,
        }),
      );

      setSelectedDocument(null);
      setSelectedDocumentId(null);
      setDraftTitle("");
      setDraftDescription("");
      setDraftContent("");
      await loadOverview(null);
      setSuccess("Dokumen berhasil dihapus.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus dokumen.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleApproveSelected() {
    if (!selectedDocument || selectedDocument.status === "ACTIVE") return;
    if (approving) return;

    setApproving(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await withToken((token) =>
        apiFetch<{ document: KnowledgeDocumentDetail }>(
          `/api/knowledge/${selectedDocument.id}/approve`,
          { method: "POST", token },
        ),
      );
      setSelectedDocument(data.document);
      setDocuments((prev) =>
        prev.map((item) =>
          item.id === data.document.id
            ? { ...item, status: data.document.status, updatedAt: data.document.updatedAt }
            : item,
        ),
      );
      setSuccess(`Dokumen "${data.document.title}" dikonfirmasi dan siap dipakai AI.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengonfirmasi dokumen.");
    } finally {
      setApproving(false);
    }
  }

  if (overviewLoading && !quota) {
    return <KnowledgeSkeleton />;
  }

  const usedPct = quota?.usedPct ?? 0;
  const selectedChunkCount = selectedDocument?.chunks.length ?? 0;
  const fieldClass =
    "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary-fixed-dim/50 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="space-y-8">
      {/* ── Metrics ───────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition-colors hover:bg-surface-bright">
          <p className="font-label-caps text-label-caps text-secondary">
            TOTAL DOKUMEN
          </p>
          <p className="mt-2 font-headline-md text-[32px] leading-10 text-on-surface">
            {documents.length}
          </p>
          <p className="mt-1 font-body-sm text-body-sm text-secondary">
            {uploadedCount} file · {documents.length - uploadedCount} catatan
            manual
          </p>
          {draftCount > 0 ? (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-status-locked px-2.5 py-1 font-label-caps text-[10px] text-status-locked">
              <span className="material-symbols-outlined text-[12px]">schedule</span>
              {draftCount}/{quota?.draftLimit ?? "—"} DRAFT MENUNGGU KONFIRMASI
            </span>
          ) : null}
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition-colors hover:bg-surface-bright">
          <p className="font-label-caps text-label-caps text-secondary">
            PEMAKAIAN PENYIMPANAN
          </p>
          <p className="mt-2 font-headline-md text-[32px] leading-10 text-on-surface">
            {quota ? `${usedPct}%` : "—"}
          </p>
          <ProgressBar percent={quota ? usedPct : 0} className="mt-2" />
          <p className="mt-1 font-body-sm text-body-sm text-secondary">
            {quota
              ? `${formatBytes(quota.usedBytes)} dari ${formatBytes(quota.limitBytes)}`
              : "Belum ada data quota."}
          </p>
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition-colors hover:bg-surface-bright">
          <p className="font-label-caps text-label-caps text-secondary">
            CHUNK AI AKTIF
          </p>
          <p className="mt-2 font-headline-md text-[32px] leading-10 text-on-surface">
            {activeChunks}
          </p>
          <p className="mt-1 font-body-sm text-body-sm text-secondary">
            {totalChunks > activeChunks
              ? `${totalChunks - activeChunks} chunk masih DRAFT. Aktifkan lewat konfirmasi.`
              : "Potongan teks siap dipakai AI training & tutor."}
          </p>
        </div>
      </div>

      {/* ── Notice banners ───────────────────────────────────────────── */}
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-error-container bg-error-container/40 p-4 font-body-sm text-body-sm text-error"
        >
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-lg border border-status-ready/30 bg-status-ready/10 p-4 font-body-sm text-body-sm text-on-surface">
          {success}
        </div>
      ) : null}

      {/* ── Workspace: detail (left) + action rail (right) ────────────── */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Detail / editor panel */}
        <section className="min-w-0 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm lg:order-1">
          {detailLoading ? (
            <div className="space-y-5 p-5 md:p-6" aria-busy="true" aria-label="Memuat detail dokumen">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-96 max-w-full" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          ) : selectedDocument ? (
            <>
              <div className="border-b border-outline-variant p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="font-label-caps text-label-caps text-secondary">
                      DETAIL DOKUMEN
                    </p>
                    <h2 className="mt-1 truncate font-headline-md text-headline-md text-on-surface">
                      {selectedDocument.title}
                    </h2>
                    <p className="mt-1 font-data-point text-[12px] text-secondary">
                      {selectedDocument.sourceType === "UPLOAD" ? "FILE" : "CATATAN"}
                      {selectedDocument.fileName ? ` · ${selectedDocument.fileName}` : ""} · v
                      {selectedDocument.version} · {selectedChunkCount} chunk ·{" "}
                      {formatBytes(selectedDocument.sourceBytes)} · diperbarui{" "}
                      {formatDate(selectedDocument.updatedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {selectedDocument.status === "DRAFT" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-status-locked px-3 py-1.5 font-label-caps text-[11px] text-status-locked">
                        <span className="material-symbols-outlined text-[14px]">
                          schedule
                        </span>
                        DRAFT
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-status-ready px-3 py-1.5 font-label-caps text-[11px] text-status-ready">
                        <span className="material-symbols-outlined text-[14px]">
                          check_circle
                        </span>
                        AKTIF
                      </span>
                    )}
                    {selectedDocument.status === "DRAFT" ? (
                      <button
                        type="button"
                        onClick={() => void handleApproveSelected()}
                        disabled={approving || saving || deleting}
                        className="inline-flex items-center gap-2 rounded-lg border border-status-ready bg-surface-container-lowest px-4 py-2.5 font-label-caps text-label-caps text-status-ready transition-colors hover:bg-status-ready/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {approving ? "progress_activity animate-spin" : "check_circle"}
                        </span>
                        {approving ? "MENGONFIRMASI…" : "KONFIRMASI"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleSaveSelected()}
                      disabled={saving || deleting || approving}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {saving ? "progress_activity animate-spin" : "save"}
                      </span>
                      SIMPAN
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteSelected()}
                      disabled={deleting || saving}
                      className="inline-flex items-center gap-2 rounded-lg border border-error px-4 py-2.5 font-label-caps text-label-caps text-error transition-colors hover:bg-error-container/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {deleting ? "progress_activity animate-spin" : "delete"}
                      </span>
                      HAPUS
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-5 md:p-6">
                <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="doc-title"
                        className="font-label-caps text-label-caps text-secondary"
                      >
                        JUDUL
                      </label>
                      <input
                        id="doc-title"
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        maxLength={200}
                        className={fieldClass}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="doc-description"
                        className="font-label-caps text-label-caps text-secondary"
                      >
                        DESKRIPSI
                      </label>
                      <input
                        id="doc-description"
                        value={draftDescription}
                        onChange={(e) => setDraftDescription(e.target.value)}
                        maxLength={500}
                        className={fieldClass}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4 text-center">
                    <p className="font-label-caps text-[10px] text-secondary">SIZE</p>
                    <p className="mt-1 font-headline-sm text-[18px] text-on-surface">
                      {formatBytes(selectedDocument.sourceBytes)}
                    </p>
                    <p className="mt-2 font-label-caps text-[10px] text-secondary">QUOTA</p>
                    <p className="mt-1 font-body-sm text-[12px] text-on-surface-variant">
                      {quota ? `${formatBytes(quota.remainingBytes)} tersisa` : "-"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="doc-content"
                    className="font-label-caps text-label-caps text-secondary"
                  >
                    ISI KNOWLEDGE
                  </label>
                  <textarea
                    id="doc-content"
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    rows={18}
                    className={`${fieldClass} resize-y leading-7`}
                  />
                </div>

                <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-label-caps text-label-caps text-secondary">
                      CHUNK PREVIEW
                    </p>
                    <span className="font-data-point text-[12px] text-secondary">
                      {selectedChunkCount} chunk
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 xl:grid-cols-2">
                    {selectedDocument.chunks.map((chunk) => (
                      <article
                        key={chunk.id}
                        className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4"
                      >
                        <p className="font-label-caps text-[10px] text-secondary">
                          CHUNK {chunk.order}
                        </p>
                        <h3 className="mt-1 font-headline-sm text-[18px] text-on-surface">
                          {chunk.heading ?? selectedDocument.title}
                        </h3>
                        <p className="mt-2 whitespace-pre-wrap font-body-sm text-[12px] leading-6 text-on-surface-variant">
                          {chunk.content}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
                  <p className="font-label-caps text-label-caps text-secondary">
                    AI CONTEXT SAMPLE
                  </p>
                  <div className="chat-markdown mt-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                      {selectedDocument.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[30rem] items-center justify-center p-8 text-center">
              <div className="max-w-md">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed-variant">
                  <span className="material-symbols-outlined ms-fill">database</span>
                </div>
                <h2 className="mt-4 font-headline-sm text-headline-sm text-on-surface">
                  Belum ada dokumen knowledge
                </h2>
                <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
                  Upload file SOP atau tulis catatan manual lewat panel di
                  samping untuk membangun knowledge base yang dipakai AI
                  training dan AI tutor.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Action rail */}
        <aside className="order-first space-y-6 lg:order-2">
          {/* Upload file */}
          <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed">
                <span className="material-symbols-outlined text-[20px] text-on-primary-fixed-variant">
                  upload_file
                </span>
              </div>
              <div>
                <h2 className="font-headline-sm text-[18px] text-on-surface">
                  Upload File
                </h2>
                <p className="mt-0.5 font-body-sm text-[12px] leading-5 text-secondary">
                  PDF, DOCX, XLSX, CSV, Markdown, HTML, atau teks. File
                  diekstrak jadi text, dipecah menjadi chunk AI, lalu masuk
                  sebagai DRAFT. Konfirmasi dulu sebelum dipakai AI.
                </p>
              </div>
            </div>

            <div className="mt-4">
              {pendingFile ? (
                <form onSubmit={(event) => void handleUpload(event)} className="space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed-variant">
                        <span className="material-symbols-outlined text-[18px]">
                          {documentIcon(pendingFile.name, "UPLOAD")}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-body-md text-body-md font-medium text-on-surface">
                          {pendingFile.name}
                        </p>
                        <p className="truncate text-[12px] text-secondary">
                          {formatBytes(pendingFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelUpload}
                      disabled={uploading}
                      aria-label="Batalkan pilihan file"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-container-high hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>

                  <input
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Judul dokumen (opsional)"
                    maxLength={200}
                    className={fieldClass}
                  />
                  <input
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Deskripsi singkat (opsional)"
                    maxLength={500}
                    className={fieldClass}
                  />

                  <button
                    type="submit"
                    disabled={uploading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {uploading ? "progress_activity animate-spin" : "upload"}
                    </span>
                    {uploading ? "MEMPROSES…" : "UPLOAD FILE"}
                  </button>
                </form>
              ) : (
                <FileDropzone
                  onFile={handleSelectFile}
                  disabled={uploading || creatingManual}
                  compact
                />
              )}
            </div>
          </section>

          {/* Manual note */}
          <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tertiary-fixed">
                <span className="material-symbols-outlined text-[20px] text-on-tertiary-fixed-variant">
                  edit_note
                </span>
              </div>
              <div>
                <h2 className="font-headline-sm text-[18px] text-on-surface">
                  Catatan Manual
                </h2>
                <p className="mt-0.5 font-body-sm text-[12px] leading-5 text-secondary">
                  Tulis pengetahuan organisasi langsung tanpa file. Catatan baru
                  jadi DRAFT sampai dikonfirmasi.
                </p>
              </div>
            </div>

            <form
              onSubmit={(event) => void handleCreateManual(event)}
              className="mt-4 space-y-3"
            >
              <input
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="Judul catatan"
                required
                maxLength={200}
                className={fieldClass}
              />
              <input
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder="Deskripsi singkat (opsional)"
                maxLength={500}
                className={fieldClass}
              />
              <textarea
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                placeholder="Tulis pengetahuan organisasi di sini..."
                rows={7}
                required
                maxLength={400_000}
                className={`${fieldClass} resize-y`}
              />
              <button
                type="submit"
                disabled={creatingManual || uploading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-secondary bg-surface-container-lowest px-4 py-2.5 font-label-caps text-label-caps text-secondary transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                {creatingManual ? "MENYIMPAN…" : "SIMPAN CATATAN"}
              </button>
            </form>
          </section>

          {/* Document list */}
          <section className="rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
            <div className="border-b border-outline-variant p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-headline-sm text-[18px] text-on-surface">
                  Daftar Dokumen
                </h2>
                <span className="rounded-full border border-outline-variant px-2.5 py-1 font-data-point text-[11px] text-secondary">
                  {filteredDocuments.length} item
                </span>
              </div>
              <div className="relative mt-3">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                  search
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari dokumen…"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-3 font-body-sm text-body-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary-fixed-dim/50"
                />
              </div>
            </div>

            <div className="scroll-slim max-h-[24rem] space-y-2 overflow-y-auto bg-surface-container-low p-3">
              {filteredDocuments.length === 0 ? (
                <p className="rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest p-5 text-center font-body-sm text-body-sm text-secondary">
                  {search
                    ? "Tidak ada dokumen yang cocok."
                    : "Belum ada dokumen knowledge."}
                </p>
              ) : (
                filteredDocuments.map((document) => {
                  const active = document.id === selectedDocumentId;
                  return (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => setSelectedDocumentId(document.id)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        active
                          ? "border-primary bg-primary-fixed-dim/40 shadow-sm ring-1 ring-primary"
                          : "border-outline-variant bg-surface-container-lowest shadow-sm hover:border-primary/40 hover:bg-surface-container-low"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed-variant">
                          <span className="material-symbols-outlined text-[18px]">
                            {documentIcon(document.fileName, document.sourceType)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-body-md text-body-md font-semibold text-on-surface">
                            {document.title}
                          </p>
                          <p className="mt-0.5 truncate text-[12px] text-secondary">
                            {document.fileName ?? "catatan manual"} ·{" "}
                            {formatBytes(document.sourceBytes)} ·{" "}
                            {document.chunkCount} chunk
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="rounded-full border border-outline-variant px-2 py-1 font-label-caps text-[10px] text-secondary">
                          v{document.version}
                        </span>
                        {document.status === "DRAFT" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-status-locked px-2 py-0.5 font-label-caps text-[10px] text-status-locked">
                            <span className="material-symbols-outlined text-[12px]">
                              schedule
                            </span>
                            DRAFT
                          </span>
                        ) : null}
                      </div>
                      </div>
                      <p className="mt-2 line-clamp-2 font-body-sm text-[12px] leading-5 text-on-surface-variant">
                        {document.excerpt || document.description || "Tanpa ringkasan."}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
