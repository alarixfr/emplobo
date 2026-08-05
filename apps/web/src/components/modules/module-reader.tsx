"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { ApiError, apiFetch } from "@/lib/api";
import type { ModuleChapter, ModuleGuide } from "@/lib/modules";

type ModuleReaderProps = {
  roleId: string;
};

export function ModuleReader({ roleId }: ModuleReaderProps) {
  const { getToken } = useAuth();
  const [guide, setGuide] = useState<ModuleGuide | null>(null);
  const [chapters, setChapters] = useState<ModuleChapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === activeChapterId) ?? null,
    [chapters, activeChapterId],
  );

  const completedCount = useMemo(
    () => chapters.filter((chapter) => chapter.completedAt !== null).length,
    [chapters],
  );

  async function load() {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        setError("Sesi tidak valid. Silakan login ulang.");
        return;
      }

      const data = await apiFetch<{ guide: ModuleGuide; chapters: ModuleChapter[] }>(
        `/api/my/modules/${roleId}/chapters`,
        { token },
      );

      setGuide(data.guide);
      setChapters(data.chapters);
      setActiveChapterId((prev) => prev ?? data.chapters[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat modul.");
    } finally {
      setIsLoading(false);
    }
  }

  async function markComplete(chapterId: string) {
    setIsSaving(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        setError("Sesi tidak valid. Silakan login ulang.");
        return;
      }

      const data = await apiFetch<{ progress: { chapterId: string; completedAt: string | null } }>(
        `/api/my/chapters/${chapterId}/complete`,
        {
          method: "POST",
          token,
        },
      );

      setChapters((prev) =>
        prev.map((chapter) =>
          chapter.id === data.progress.chapterId
            ? { ...chapter, completedAt: data.progress.completedAt }
            : chapter,
        ),
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("Anda tidak memiliki akses ke chapter ini.");
      } else {
        setError(err instanceof Error ? err.message : "Gagal menyimpan progress.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Memuat modul...</p>;
  }

  if (error) {
    return <p className="text-sm text-accent">{error}</p>;
  }

  if (!guide || chapters.length === 0 || !activeChapter) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
        Modul belum tersedia.
      </p>
    );
  }

  const progressPercent = Math.round((completedCount / chapters.length) * 100);

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-lg border border-border bg-card p-3">
        <h2 className="text-sm font-semibold text-foreground">{guide.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Progress: {completedCount}/{chapters.length} ({progressPercent}%)
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-brand" style={{ width: `${progressPercent}%` }} />
        </div>

        <ul className="mt-3 space-y-1">
          {chapters.map((chapter) => {
            const isActive = chapter.id === activeChapter.id;
            return (
              <li key={chapter.id}>
                <button
                  type="button"
                  onClick={() => setActiveChapterId(chapter.id)}
                  className={`w-full rounded-md px-2 py-2 text-left text-sm transition ${
                    isActive ? "bg-brand-muted text-foreground" : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="block truncate">{chapter.order}. {chapter.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {chapter.completedAt ? "Selesai" : "Belum selesai"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Chapter {activeChapter.order}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-foreground">{activeChapter.title}</h3>

        <div className="prose prose-sm mt-4 max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-code:text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {activeChapter.content}
          </ReactMarkdown>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => void markComplete(activeChapter.id)}
            disabled={isSaving}
            className="inline-flex rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {isSaving
              ? "Menyimpan..."
              : activeChapter.completedAt
                ? "Tandai ulang selesai"
                : "Tandai selesai"}
          </button>
        </div>
      </section>
    </div>
  );
}
