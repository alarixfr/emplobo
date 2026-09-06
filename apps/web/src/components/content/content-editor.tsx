"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { apiFetch } from "@/lib/api";
import type {
  EditorChapter,
  EditorGuide,
  EditorQuestion,
  EditorQuiz,
  EditorResponse,
} from "@/lib/content";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Reveal } from "@/components/motion/reveal";

const MAX_CHAPTERS = 60;
const MAX_QUESTIONS = 25;

function newQuestion() {
  return {
    id: null,
    order: 0,
    question: "",
    options: ["", "", "", ""],
    correctIndex: 0,
  };
}

function newChapter(): EditorChapter {
  return {
    id: null,
    order: 0,
    title: "",
    content: "",
    quiz: null,
  };
}

function formatDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function EditorSkeleton() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    </div>
  );
}

const fieldClass =
  "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary-fixed-dim/50 disabled:cursor-not-allowed disabled:opacity-60";

export function ContentEditor({ roleId }: { roleId: string }) {
  const { getToken, isLoaded } = useAuth();
  const [role, setRole] = useState<EditorResponse["role"] | null>(null);
  const [guide, setGuide] = useState<EditorGuide | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const activeChapter = guide?.chapters[Math.min(activeIndex, guide.chapters.length - 1)] ?? null;
  const chapterQuiz = activeChapter?.quiz ?? null;
  const questionCount = useMemo(
    () =>
      guide?.chapters.reduce(
        (sum, chapter) => sum + (chapter.quiz?.questions.length ?? 0),
        0,
      ) ?? 0,
    [guide],
  );

  async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
    const token = await getToken();
    if (!token) {
      throw new Error("Sesi tidak valid. Silakan login ulang.");
    }
    return fn(token);
  }

  useEffect(() => {
    if (!isLoaded) return;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await withToken((token) =>
          apiFetch<EditorResponse>(`/api/content/${roleId}`, { token }),
        );
        setRole(data.role);
        setGuide(data.guide);
        setActiveIndex(0);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Gagal memuat konten guide.");
      } finally {
        setLoading(false);
      }
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId, isLoaded]);

  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function markDirty() {
    setDirty(true);
    setNotice(null);
  }

  function setChapters(chapters: EditorChapter[]) {
    if (!guide) return;
    setGuide({ ...guide, chapters });
    markDirty();
  }

  function updateChapter(index: number, patch: Partial<EditorChapter>) {
    if (!guide) return;
    const chapters = guide.chapters.map((chapter, i) =>
      i === index ? { ...chapter, ...patch } : chapter,
    );
    setChapters(chapters);
  }

  function addChapter() {
    if (!guide) return;
    if (guide.chapters.length >= MAX_CHAPTERS) {
      setError(`Maksimal ${MAX_CHAPTERS} chapter per guide.`);
      return;
    }
    setError(null);
    const chapters = [...guide.chapters, newChapter()];
    setChapters(chapters);
    setActiveIndex(chapters.length - 1);
  }

  function deleteChapter(index: number) {
    if (!guide) return;
    if (index < 0 || index >= guide.chapters.length) return;
    const chapters = guide.chapters.filter((_, i) => i !== index);
    setChapters(chapters);
    setActiveIndex(Math.max(0, Math.min(index, chapters.length - 1)));
  }

  function moveChapter(index: number, direction: -1 | 1) {
    if (!guide) return;
    const target = index + direction;
    if (target < 0 || target >= guide.chapters.length) return;
    const chapters = [...guide.chapters];
    [chapters[index], chapters[target]] = [chapters[target], chapters[index]];
    setChapters(chapters);
    setActiveIndex(target);
  }

  function attachQuizToChapter(quiz: EditorQuiz | null) {
    if (activeIndex === null) return;
    updateChapter(activeIndex, { quiz });
  }

  function addQuestion() {
    if (!guide || !activeChapter) return;
    const quiz = activeChapter.quiz;
    if (!quiz) return;
    if (quiz.questions.length >= MAX_QUESTIONS) {
      setError(`Maksimal ${MAX_QUESTIONS} soal per kuis.`);
      return;
    }
    setError(null);
    attachQuizToChapter({
      ...quiz,
      questions: [...quiz.questions, newQuestion()],
    });
  }

  function updateQuestion(qIndex: number, patch: Partial<EditorQuestion>) {
    if (!guide || !activeChapter?.quiz) return;
    const quiz = activeChapter.quiz;
    attachQuizToChapter({
      ...quiz,
      questions: quiz.questions.map((question, i) =>
        i === qIndex ? { ...question, ...patch } : question,
      ),
    });
  }

  function removeQuestion(qIndex: number) {
    if (!guide || !activeChapter?.quiz) return;
    const quiz = activeChapter.quiz;
    attachQuizToChapter({
      ...quiz,
      questions: quiz.questions.filter((_, i) => i !== qIndex),
    });
  }

  function moveQuestion(qIndex: number, direction: -1 | 1) {
    if (!guide || !activeChapter?.quiz) return;
    const quiz = activeChapter.quiz;
    const target = qIndex + direction;
    if (target < 0 || target >= quiz.questions.length) return;
    const questions = [...quiz.questions];
    [questions[qIndex], questions[target]] = [questions[target], questions[qIndex]];
    attachQuizToChapter({ ...quiz, questions });
  }

  function setQuizOption(qIndex: number, optionIndex: number, value: string) {
    if (!guide || !activeChapter?.quiz) return;
    const quiz = activeChapter.quiz;
    attachQuizToChapter({
      ...quiz,
      questions: quiz.questions.map((question, i) =>
        i === qIndex
          ? {
              ...question,
              options: question.options.map((option, oi) =>
                oi === optionIndex ? value : option,
              ),
            }
          : question,
      ),
    });
  }

  async function handleSave() {
    if (!guide || saving) return;

    const rawChapters = guide.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      content: chapter.content,
      quiz: chapter.quiz
        ? {
            id: chapter.quiz.id,
            questions: chapter.quiz.questions.map((question) => ({
              id: question.id,
              question: question.question,
              options: question.options,
              correctIndex: question.correctIndex,
            })),
          }
        : null,
    }));

    const trimmed = rawChapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title.trim(),
      content: chapter.content.trim(),
      quiz: chapter.quiz,
    }));

    if (!guide.title.trim()) {
      setError("Judul guide tidak boleh kosong.");
      return;
    }
    const invalidChapter = trimmed.find(
      (chapter) => !chapter.title || !chapter.content,
    );
    if (invalidChapter) {
      const index = trimmed.indexOf(invalidChapter);
      setActiveIndex(index);
      setPreviewMode(false);
      setError(
        `Chapter ${index + 1} masih kosong. Isi judul dan konten sebelum menyimpan.`,
      );
      return;
    }

    if (trimmed.some((chapter) => chapter.quiz && chapter.quiz.questions.length === 0)) {
      setError("Kuis tidak boleh kosong. Tambahkan minimal satu soal atau hapus kuis chapter ini.");
      return;
    }

    for (const [chapterIndex, chapter] of trimmed.entries()) {
      if (!chapter.quiz) continue;
      for (const [qIndex, question] of chapter.quiz.questions.entries()) {
        if (!question.question.trim()) {
          setActiveIndex(chapterIndex);
          setPreviewMode(false);
          setError(`Chapter ${chapterIndex + 1}: pertanyaan ${qIndex + 1} masih kosong.`);
          return;
        }
        const emptyOption = question.options.findIndex((option) => !option.trim());
        if (emptyOption !== -1) {
          setActiveIndex(chapterIndex);
          setPreviewMode(false);
          setError(
            `Chapter ${chapterIndex + 1}: pilihan ${String.fromCharCode(65 + emptyOption)} di soal ${qIndex + 1} masih kosong.`,
          );
          return;
        }
      }
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const data = await withToken((token) =>
        apiFetch<EditorResponse>(`/api/content/${roleId}`, {
          method: "POST",
          token,
          body: { title: guide.title.trim(), chapters: trimmed },
        }),
      );
      setRole(data.role);
      setGuide(data.guide);
      setActiveIndex(Math.min(activeIndex, data.guide.chapters.length - 1));
      setDirty(false);
      setNotice("Konten guide berhasil disimpan dan langsung berlaku untuk karyawan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan konten guide.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <EditorSkeleton />;
  }

  if (loadError || !guide || !role) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-error-container bg-error-container/40 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error-container/60 text-error">
          <span className="material-symbols-outlined">error</span>
        </div>
        <h2 className="mt-4 font-headline-sm text-headline-sm text-on-surface">
          Konten guide tidak bisa dimuat
        </h2>
        <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
          {loadError ?? "Konten guide belum tersedia untuk role ini."}
        </p>
        <Link
          href={`/app/training/${roleId}`}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
        >
          <span className="material-symbols-outlined text-[18px]">school</span>
          BUKA TRAINING ROOM
        </Link>
      </div>
    );
  }

  const chaptersCount = guide.chapters.length;

  return (
    <div className="mx-auto w-full max-w-container space-y-6">
      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 font-label-caps text-label-caps text-secondary"
      >
        <Link href="/app/content" className="transition-colors hover:text-primary">
          KONTEN
        </Link>
        <span className="material-symbols-outlined text-[14px]">
          chevron_right
        </span>
        <span className="text-on-surface">{role.name.toUpperCase()}</span>
      </nav>

      {/* Hero */}
      <Reveal y={18} x={0} delay={0} duration={0.7}>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-headline-md text-headline-md text-on-surface">
                {role.name}
              </h1>
              <StatusBadge status={role.status} />
            </div>
            <p className="mt-1 max-w-2xl font-body-md text-body-md text-on-surface-variant">
              Editor panduan yang dihasilkan AI. Perubahan tersimpan sekali klik
              dan langsung berlaku untuk karyawan yang mempelajari role ini.
              v{guide.version} · {chaptersCount} chapter · {questionCount} soal ·
              diperbarui {formatDate(guide.updatedAt)}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {dirty ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-status-locked px-3 py-2 font-label-caps text-[11px] text-status-locked">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                PERUBAHAN BELUM DISIMPAN
              </span>
            ) : notice ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-status-ready px-3 py-2 font-label-caps text-[11px] text-status-ready">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                TERSIMPAN
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                {saving ? "progress_activity animate-spin" : "save"}
              </span>
              {saving ? "MENYIMPAN…" : "SIMPAN"}
            </button>
          </div>
        </div>
      </Reveal>

      {error ? (
        <p role="alert" className="rounded-lg border border-error-container bg-error-container/40 p-4 font-body-sm text-body-sm text-error">
          {error}
        </p>
      ) : null}

      {/* Workspace */}
      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Chapter rail */}
        <aside className="rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-3 border-b border-outline-variant p-4">
            <h2 className="font-label-caps text-label-caps text-secondary">
              CHAPTER {chaptersCount}
            </h2>
            <button
              type="button"
              onClick={addChapter}
              disabled={chaptersCount >= MAX_CHAPTERS}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-label-caps text-[11px] text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              BARU
            </button>
          </div>
          <div className="scroll-slim max-h-[32rem] space-y-2 overflow-y-auto p-3">
            {guide.chapters.length === 0 ? (
              <p className="rounded-lg border border-dashed border-outline-variant bg-surface-bright p-5 text-center font-body-sm text-body-sm text-secondary">
                Belum ada chapter. Klik BARU untuk menambahkan.
              </p>
            ) : (
              guide.chapters.map((chapter, index) => {
                const selected = index === activeIndex;
                const hasQuiz = Boolean(chapter.quiz);
                return (
                  <div
                    key={chapter.id ?? `new-${index}`}
                    className={`rounded-lg border transition-colors ${
                      selected
                        ? "border-primary bg-primary-fixed-dim/40 ring-1 ring-primary"
                        : "border-outline-variant bg-surface-container-lowest hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start gap-2 p-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-data-point text-[11px] font-bold text-on-primary-fixed-variant">
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className={`truncate font-body-md text-body-md font-semibold ${selected ? "text-primary" : "text-on-surface"}`}>
                          {chapter.title || `Chapter ${index + 1}`}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-secondary">
                          {chapter.content ? `${chapter.content.length.toLocaleString("id-ID")} char` : "Kosong"}
                          {hasQuiz ? (
                            <span className="material-symbols-outlined text-[12px]">quiz</span>
                          ) : null}
                        </p>
                      </button>
                    </div>
                    <div className="flex items-center justify-end gap-1 border-t border-outline-variant/70 px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => moveChapter(index, -1)}
                        disabled={index === 0}
                        aria-label="Pindah ke atas"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-secondary transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveChapter(index, 1)}
                        disabled={index === guide.chapters.length - 1}
                        aria-label="Pindah ke bawah"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-secondary transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm(`Hapus chapter "${chapter.title || `Chapter ${index + 1}`}"?`)) return;
                          deleteChapter(index);
                        }}
                        aria-label="Hapus chapter"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-secondary transition-colors hover:bg-error-container/40 hover:text-error"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Editor pane */}
        <section className="min-w-0 space-y-6">
          {/* Guide title */}
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
            <label
              htmlFor="guide-title"
              className="font-label-caps text-label-caps text-secondary"
            >
              JUDUL GUIDE
            </label>
            <input
              id="guide-title"
              value={guide.title}
              onChange={(e) => {
                setGuide({ ...guide, title: e.target.value });
                markDirty();
              }}
              maxLength={200}
              className={`${fieldClass} mt-2`}
            />
          </div>

          {activeChapter ? (
            <>
              {/* Chapter header */}
              <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
                <label
                  htmlFor="chapter-title"
                  className="font-label-caps text-label-caps text-secondary"
                >
                  JUDUL CHAPTER {activeIndex + 1}
                </label>
                <input
                  id="chapter-title"
                  value={activeChapter.title}
                  onChange={(e) => updateChapter(activeIndex, { title: e.target.value })}
                  maxLength={200}
                  className={`${fieldClass} mt-2`}
                />
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewMode(false)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 font-label-caps text-label-caps transition-colors ${
                    !previewMode
                      ? "bg-primary-fixed-dim/50 text-on-surface"
                      : "bg-surface-container-low text-secondary hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  TULIS
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode(true)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 font-label-caps text-label-caps transition-colors ${
                    previewMode
                      ? "bg-primary-fixed-dim/50 text-on-surface"
                      : "bg-surface-container-low text-secondary hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  PRATINJAU
                </button>
                <span className="ml-auto font-data-point text-[11px] text-secondary">
                  Markdown didukung
                </span>
              </div>

              {/* Chapter content */}
              <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
                {previewMode ? (
                  <div className="chat-markdown max-h-[36rem] overflow-y-auto p-6 md:p-8">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                      {activeChapter.content || "_Belum ada konten._"}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <textarea
                    value={activeChapter.content}
                    onChange={(e) => updateChapter(activeIndex, { content: e.target.value })}
                    rows={18}
                    placeholder="Tulis konten chapter dalam format markdown (judul, SOP, langkah, catatan penting)…"
                    className={`${fieldClass} resize-y rounded-none border-0 leading-7 focus:ring-0`}
                  />
                )}
              </div>

              {/* Quiz builder */}
              <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-label-caps text-label-caps text-secondary">
                      KUIS CHAPTER {activeIndex + 1}
                    </h2>
                    <p className="mt-1 font-body-sm text-[12px] text-on-surface-variant">
                      Soal ditampilkan ke karyawan setelah membaca chapter. Jawaban dikoreksi otomatis.
                    </p>
                  </div>
                  {chapterQuiz ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm("Hapus seluruh soal kuis chapter ini?")) return;
                        attachQuizToChapter(null);
                      }}
                      disabled={!chapterQuiz}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-error px-3 py-1.5 font-label-caps text-[11px] text-error transition-colors hover:bg-error-container/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                      HAPUS KUIS
                    </button>
                  ) : null}
                </div>

                {chapterQuiz ? (
                  <div className="mt-5 space-y-5">
                    {chapterQuiz.questions.map((question, qIndex) => (
                      <div
                        key={qIndex}
                        className="rounded-lg border border-outline-variant bg-surface-bright p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tertiary-fixed font-data-point text-[11px] font-bold text-on-tertiary-fixed-variant">
                            Q{qIndex + 1}
                          </span>
                          <textarea
                            value={question.question}
                            onChange={(e) =>
                              updateQuestion(qIndex, { question: e.target.value })
                            }
                            rows={2}
                            placeholder={`Pertanyaan ${qIndex + 1}…`}
                            maxLength={1000}
                            className={`${fieldClass} resize-y`}
                          />
                          <div className="flex shrink-0 flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => moveQuestion(qIndex, -1)}
                              disabled={qIndex === 0}
                              aria-label="Pindah soal ke atas"
                              className="flex h-7 w-7 items-center justify-center rounded-md text-secondary transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => moveQuestion(qIndex, 1)}
                              disabled={qIndex === chapterQuiz.questions.length - 1}
                              aria-label="Pindah soal ke bawah"
                              className="flex h-7 w-7 items-center justify-center rounded-md text-secondary transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!window.confirm("Hapus soal ini?")) return;
                                removeQuestion(qIndex);
                              }}
                              aria-label="Hapus soal"
                              className="flex h-7 w-7 items-center justify-center rounded-md text-secondary transition-colors hover:bg-error-container/40 hover:text-error"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          <p className="font-label-caps text-[10px] text-secondary">
                            PILIHAN JAWABAN (4). Centang yang benar
                          </p>
                          {question.options.map((option, optionIndex) => (
                            <label
                              key={optionIndex}
                              className={`flex items-center gap-3 rounded-lg border p-2.5 transition-colors ${
                                question.correctIndex === optionIndex
                                  ? "border-status-ready bg-status-ready/10"
                                  : "border-outline-variant bg-surface-container-lowest hover:border-primary/40"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`correct-${qIndex}`}
                                checked={question.correctIndex === optionIndex}
                                onChange={() => {
                                  if (question.correctIndex !== optionIndex) {
                                    updateQuestion(qIndex, { correctIndex: optionIndex });
                                  }
                                }}
                                className="h-4 w-4 accent-primary"
                              />
                              <span className="font-data-point text-[11px] text-secondary">
                                {String.fromCharCode(65 + optionIndex)}
                              </span>
                              <input
                                value={option}
                                onChange={(e) =>
                                  setQuizOption(qIndex, optionIndex, e.target.value)
                                }
                                placeholder={`Pilihan ${String.fromCharCode(65 + optionIndex)}…`}
                                maxLength={300}
                                className="min-w-0 flex-1 border-none bg-transparent font-body-md text-body-md text-on-surface outline-none placeholder:text-outline"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addQuestion}
                      disabled={chapterQuiz.questions.length >= MAX_QUESTIONS}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary px-4 py-2.5 font-label-caps text-label-caps text-primary transition-colors hover:bg-primary-fixed-dim/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      TAMBAH SOAL
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      attachQuizToChapter({ id: null, questions: [newQuestion()] })
                    }
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary px-4 py-3 font-label-caps text-label-caps text-primary transition-colors hover:bg-primary-fixed-dim/30"
                  >
                    <span className="material-symbols-outlined text-[16px]">quiz</span>
                    BUAT KUIS UNTUK CHAPTER INI
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center font-body-md text-body-md text-on-surface-variant">
              Tambahkan chapter terlebih dahulu untuk mulai menyusun konten.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}