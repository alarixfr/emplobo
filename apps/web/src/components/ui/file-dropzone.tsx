"use client";

import { useEffect, useRef, useState } from "react";

type FileDropzoneProps = {
  /** Single-file callback — fires once a valid file is picked or dropped. */
  onFile: (file: File) => void;
  /** Native `accept` attribute: comma-separated extensions or MIME types. */
  accept?: string;
  /** Maximum allowed file size in bytes. */
  maxSizeBytes?: number;
  /** Optional helper line rendered under the drop target. */
  hint?: string;
  disabled?: boolean;
  busy?: boolean;
  busyLabel?: string;
  /** Tighter vertical rhythm for embedding next to other controls. */
  compact?: boolean;
  className?: string;
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export const KNOWLEDGE_FILE_ACCEPT =
  ".pdf,.docx,.xlsx,.csv,.tsv,.txt,.md,.markdown,.html,.htm,.json,.xml,.yaml,.yml";

/**
 * Accessible drag-and-drop file target with a click-to-browse fallback.
 *
 * Drag state is tracked with an enter/leave depth counter (not relatedTarget
 * guesses) so the highlight never flickers while the pointer travels over the
 * icon, copy, or inner controls. Window-level dragover/drop are suppressed so
 * a file dropped just outside the target never navigates the tab away.
 */
export function FileDropzone({
  onFile,
  accept = KNOWLEDGE_FILE_ACCEPT,
  maxSizeBytes = 10 * 1024 * 1024,
  hint,
  disabled = false,
  busy = false,
  busyLabel = "Mengunggah…",
  compact = false,
  className = "",
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [invalidFile, setInvalidFile] = useState<string | null>(null);

  const blocked = disabled || busy;

  useEffect(() => {
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

  function isAccepted(file: File): boolean {
    if (!accept) return true;
    const tokens = accept
      .split(",")
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean);
    if (tokens.length === 0) return true;
    const lowerName = file.name.toLowerCase();
    return tokens.some((token) =>
      token.startsWith(".")
        ? lowerName.endsWith(token)
        : file.type.toLowerCase() === token,
    );
  }

  function handleFile(file: File | null | undefined) {
    if (!file || blocked) return;
    if (maxSizeBytes && file.size > maxSizeBytes) {
      setInvalidFile(
        `File melebihi batas ${formatBytes(maxSizeBytes)} per dokumen.`,
      );
      return;
    }
    if (!isAccepted(file)) {
      setInvalidFile(
        "Jenis file tidak didukung. Gunakan PDF, DOCX, XLSX, CSV, TXT, Markdown, HTML, JSON, XML, atau YAML.",
      );
      return;
    }
    setInvalidFile(null);
    onFile(file);
  }

  function openPicker() {
    if (blocked) return;
    setInvalidFile(null);
    inputRef.current?.click();
  }

  function resetDrag() {
    dragDepth.current = 0;
    setIsDragging(false);
  }

  return (
    <div className={className}>
      <div
        aria-disabled={blocked}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          openPicker();
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (blocked) return;
          dragDepth.current += 1;
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (blocked) return;
          event.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (blocked) return;
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          resetDrag();
          if (blocked) return;
          handleFile(event.dataTransfer.files?.[0]);
        }}
        className={`group rounded-lg border border-dashed text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-fixed-dim ${
          compact ? "px-4 py-6" : "px-4 py-9"
        } ${
          isDragging
            ? "border-primary bg-primary/5 ring-2 ring-primary-fixed-dim/40"
            : blocked
              ? "cursor-not-allowed border-outline-variant bg-surface-container-low/60 opacity-70"
              : "cursor-pointer border-outline-variant bg-surface-container-low transition-colors hover:border-primary/50 hover:bg-surface-container-low"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            handleFile(file);
          }}
        />

        <div
          className={`mx-auto flex items-center justify-center rounded-full transition-colors ${
            compact ? "h-9 w-9" : "h-11 w-11"
          } ${isDragging ? "bg-primary text-white" : "bg-primary-fixed text-on-primary-fixed-variant"}`}
        >
          <span className="material-symbols-outlined text-[22px]">
            {busy ? "progress_activity" : "upload_file"}
          </span>
        </div>

        <p className="mt-3 font-body-sm text-body-sm text-on-surface">
          {busy ? (
            busyLabel
          ) : (
            <>
              Seret &amp; letakkan file di sini, atau{" "}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  openPicker();
                }}
                disabled={blocked}
                className="font-semibold text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                pilih file
              </button>
            </>
          )}
        </p>
        <p className="mt-1 font-body-sm text-[12px] text-secondary">
          {busy
            ? "File sedang diproses menjadi knowledge chunks."
            : "Maksimal 10 MB per dokumen"}
        </p>
      </div>

      {invalidFile ? (
        <p className="mt-2 font-body-sm text-body-sm text-error" role="alert">
          {invalidFile}
        </p>
      ) : hint ? (
        <p className="mt-2 font-body-sm text-[12px] leading-5 text-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
