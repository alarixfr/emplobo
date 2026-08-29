"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { ApiError, apiFetch } from "@/lib/api";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ModuleChapter,
  ModuleGuide,
  QuizSubmitResponse,
} from "@/lib/modules";
import { ModuleQuizCard } from "./module-quiz";

type ModuleReaderProps = {
  roleId: string;
};

function ReaderSkeleton() {
  return (
    <div
      className="grid gap-8 lg:grid-cols-[1fr_280px]"
      aria-busy="true"
      aria-label="Memuat modul"
    >
      <div className="mx-auto w-full max-w-[720px]">
        <div className="rounded-lg border border-slate-200 bg-surface-container-lowest p-6 shadow-sm md:p-10">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-8 w-3/4" />
          <div className="mt-3 flex gap-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="my-6 h-px w-full" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="mt-10 rounded-lg border border-outline-variant bg-surface-bright p-6 text-center">
            <Skeleton className="mx-auto h-5 w-52" />
            <Skeleton className="mx-auto mt-2 h-3 w-72" />
            <Skeleton className="mx-auto mt-4 h-10 w-48" />
          </div>
        </div>
      </div>
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
          <div>
            <Skeleton className="h-3 w-36" />
            <Skeleton className="mt-2 h-1 w-full" />
          </div>
        </div>
      </aside>
    </div>
  );
}

export function ModuleReader({ roleId }: ModuleReaderProps) {
  const { getToken, isLoaded } = useAuth();
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

  const progressPercent =
    chapters.length > 0
      ? Math.round((completedCount / chapters.length) * 100)
      : 0;

  async function load() {
    if (!isLoaded) return; // wait for Clerk before calling getToken()
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        setError("Sesi tidak valid. Silakan login ulang.");
        return;
      }

      const data = await apiFetch<{
        guide: ModuleGuide;
        chapters: ModuleChapter[];
      }>(`/api/my/modules/${roleId}/chapters`, { token });

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

      const data = await apiFetch<{
        progress: { chapterId: string; completedAt: string | null };
      }>(`/api/my/chapters/${chapterId}/complete`, {
        method: "POST",
        token,
      });

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
    if (isLoaded) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId, isLoaded]);

  if (isLoading || !isLoaded) {
    return <ReaderSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-error-container bg-error-container/40 p-6">
        <p className="font-body-sm text-body-sm text-error">{error}</p>
      </div>
    );
  }

  if (!guide || chapters.length === 0 || !activeChapter) {
    return (
      <p className="rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest p-6 font-body-md text-body-md text-on-surface-variant">
        Modul belum tersedia.
      </p>
    );
  }

  const activeIndex = chapters.findIndex((c) => c.id === activeChapter.id);
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < chapters.length - 1;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      {/* ── Article column (720px) ────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-[720px]">
        <article className="relative rounded-lg border border-slate-200 bg-surface-container-lowest p-6 shadow-sm md:p-10">
          {/* Floating AI Verified badge */}
          <div className="absolute -top-3 right-4 flex items-center gap-1.5 rounded-full border border-ai-border bg-ai-accent px-3 py-1 shadow-sm md:-right-3">
            <span className="material-symbols-outlined ms-fill text-[16px] text-primary">
              auto_awesome
            </span>
            <span className="font-label-caps text-[10px] text-primary">
              AI VERIFIED
            </span>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-outline-variant px-3 py-1 font-label-caps text-[10px] text-secondary">
              BAB {activeChapter.order}
            </span>
            <span className="rounded-full border border-outline-variant px-3 py-1 font-label-caps text-[10px] text-secondary">
              {guide.title.toUpperCase()}
            </span>
          </div>

          <h1 className="mt-4 font-headline-lg text-[28px] leading-9 text-primary">
            {activeChapter.title}
          </h1>

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-4 font-data-point text-data-point text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">
                schedule
              </span>
              Bab {activeIndex + 1} dari {chapters.length}
            </span>
            {activeChapter.completedAt ? (
              <span className="flex items-center gap-1.5 text-primary">
                <span className="material-symbols-outlined ms-fill text-[16px]">
                  check_circle
                </span>
                Selesai dibaca
              </span>
            ) : null}
          </div>

          <hr className="my-6 border-outline-variant" />

          {/* Chapter content */}
          <div className="guide-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
              {activeChapter.content}
            </ReactMarkdown>
          </div>

          {/* End-of-chapter CTA block */}
          <div className="mt-10 rounded-lg border border-outline-variant bg-surface-bright p-6 text-center">
            <h2 className="font-headline-sm text-[18px] text-on-surface">
              Siap menguji pemahaman Anda?
            </h2>
            <p className="mt-1 font-body-sm text-body-sm text-secondary">
              Kerjakan kuis bab ini untuk mengukur seberapa baik Anda menguasai
              materinya.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => void markComplete(activeChapter.id)}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg border border-secondary px-4 py-2.5 font-label-caps text-label-caps text-secondary transition-colors hover:bg-surface-container-low disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">
                  task_alt
                </span>
                {isSaving
                  ? "MENYIMPAN…"
                  : activeChapter.completedAt
                    ? "TANDAI SELESAI"
                    : "TANDAI SELESAI DIBACA"}
              </button>
              {activeChapter.quiz ? (
                <a
                  href="#chapter-quiz"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
                >
                  KERJAKAN KUIS BAB
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                </a>
              ) : null}
            </div>
          </div>

          {/* Prev / Next */}
          <div className="mt-6 flex items-center justify-between">
            {hasPrev ? (
              <button
                type="button"
                onClick={() => setActiveChapterId(chapters[activeIndex - 1]!.id)}
                className="inline-flex items-center gap-1 font-label-caps text-label-caps text-secondary transition-colors hover:text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">
                  arrow_back
                </span>
                BAB SEBELUMNYA
              </button>
            ) : (
              <span />
            )}
            {hasNext ? (
              <button
                type="button"
                onClick={() => setActiveChapterId(chapters[activeIndex + 1]!.id)}
                className="inline-flex items-center gap-1 font-label-caps text-label-caps text-secondary transition-colors hover:text-primary"
              >
                BAB BERIKUTNYA
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </button>
            ) : null}
          </div>
        </article>

        {/* Quiz */}
        {activeChapter.quiz ? (
          <div id="chapter-quiz" className="mt-8 scroll-mt-24">
            <ModuleQuizCard
              key={activeChapter.id}
              chapterId={activeChapter.id}
              quiz={activeChapter.quiz}
              onQuizCompleted={(res: QuizSubmitResponse) => {
                // Best score/attempts update on EVERY attempt (a failed
                // attempt that improves the score must show); completion is
                // gated server-side.
                setChapters((prev) =>
                  prev.map((c) =>
                    c.id === activeChapter.id
                      ? {
                          ...c,
                          completedAt:
                            res.chapterCompleted && !c.completedAt
                              ? new Date().toISOString()
                              : c.completedAt,
                          quiz: c.quiz
                            ? {
                                ...c.quiz,
                                bestScore: Math.max(
                                  c.quiz.bestScore ?? 0,
                                  res.score,
                                ),
                                attempts: [
                                  {
                                    id: res.attempt.id,
                                    score: res.attempt.score,
                                    createdAt: res.attempt.createdAt,
                                  },
                                  ...c.quiz.attempts,
                                ],
                              }
                            : null,
                        }
                      : c,
                  ),
                );
              }}
            />
          </div>
        ) : null}
      </div>

      {/* ── Sticky TOC sidebar ────────────────────────────────────────── */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-8">
          <nav>
            <h2 className="font-label-caps text-label-caps text-secondary">
              DI HALAMAN INI
            </h2>
            <ul className="mt-4 space-y-1">
              {chapters.map((chapter) => {
                const isActive = chapter.id === activeChapter.id;
                return (
                  <li key={chapter.id}>
                    <button
                      type="button"
                      onClick={() => setActiveChapterId(chapter.id)}
                      className={`block w-full border-l-4 py-2 pl-3 pr-2 text-left font-body-sm text-body-sm transition-colors ${
                        isActive
                          ? "border-primary font-medium text-primary"
                          : "border-transparent text-secondary hover:border-outline-variant hover:text-on-surface"
                      }`}
                    >
                      <span className="block truncate">
                        {chapter.order}. {chapter.title}
                      </span>
                      {chapter.completedAt ? (
                        <span className="mt-0.5 flex items-center gap-1 text-[11px] text-primary">
                          <span className="material-symbols-outlined ms-fill text-[13px]">
                            check_circle
                          </span>
                          Selesai
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-label-caps text-label-caps text-secondary">
                CHAPTER PROGRESS
              </h2>
              <span className="font-data-point text-data-point text-primary">
                {progressPercent}%
              </span>
            </div>
            <ProgressBar percent={progressPercent} className="mt-2 h-0.5" />
            <p className="mt-2 font-body-sm text-[12px] text-secondary">
              {completedCount} dari {chapters.length} bab selesai
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
