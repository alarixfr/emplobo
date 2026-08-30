"use client";

import { useAuth } from "@clerk/nextjs";
import { useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ProgressBar } from "@/components/ui/progress-bar";
import type {
  ModuleQuiz,
  QuizAttemptSummary,
  QuizSubmitResponse,
} from "@/lib/modules";

type ModuleQuizProps = {
  chapterId: string;
  quiz: ModuleQuiz;
  onQuizCompleted?: (result: QuizSubmitResponse) => void;
};

export function ModuleQuizCard({
  chapterId,
  quiz,
  onQuizCompleted,
}: ModuleQuizProps) {
  const { getToken } = useAuth();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizSubmitResponse | null>(null);
  const [attempts, setAttempts] = useState<QuizAttemptSummary[]>(quiz.attempts);
  const [bestScore, setBestScore] = useState<number | null>(quiz.bestScore);

  const questions = quiz.questions;
  const isAllAnswered =
    questions.length > 0 &&
    questions.every((_, idx) => selectedAnswers[idx] !== undefined);
  const isLastQuestion = currentQuestion === questions.length - 1;
  const currentQ = questions[currentQuestion];
  const progressPct =
    questions.length > 0
      ? Math.round(((currentQuestion + 1) / questions.length) * 100)
      : 0;
  const resultRef = useRef<HTMLDivElement | null>(null);

  function handleSelectOption(optionIndex: number) {
    if (result) return; // Locked while viewing results
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion]: optionIndex,
    }));
  }

  async function handleSubmit() {
    if (!isAllAnswered || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        setError("Sesi tidak valid. Silakan login ulang.");
        return;
      }

      const answers = questions.map((_, idx) => selectedAnswers[idx] ?? 0);
      const data = await apiFetch<QuizSubmitResponse>(
        `/api/my/chapters/${chapterId}/quiz/submit`,
        {
          method: "POST",
          token,
          body: { answers },
        },
      );

      setResult(data);
      setAttempts((prev) => [
        {
          id: data.attempt.id,
          score: data.attempt.score,
          createdAt: data.attempt.createdAt,
        },
        ...prev,
      ]);
      setBestScore((prev) => Math.max(prev ?? 0, data.score));

      onQuizCompleted?.(data);
      // Move focus to the result so keyboard/screen-reader users land on it.
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim jawaban kuis.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRetry() {
    setSelectedAnswers({});
    setResult(null);
    setError(null);
    setCurrentQuestion(0);
  }

  if (questions.length === 0 || !currentQ) {
    return null;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-surface-container-lowest p-6 shadow-sm md:p-10">
      {/* Header: chapter title + question counter + progress */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-headline-sm text-[18px] text-on-surface">
          Knowledge Check
        </h2>
        <span className="font-data-point text-data-point text-secondary">
          {result ? "HASIL" : `Soal ${currentQuestion + 1} dari ${questions.length}`}
        </span>
      </div>
      <ProgressBar percent={progressPct} className="mt-3" />
      <div className="mt-3 flex flex-wrap items-center gap-3 font-data-point text-[12px] text-secondary">
        {bestScore !== null ? (
          <span
            className={
              bestScore >= 70 ? "font-bold text-primary" : "text-status-locked"
            }
          >
            SKOR TERBAIK: {bestScore}
          </span>
        ) : null}
        {attempts.length > 0 ? <span>{attempts.length}x PERCOBAAN</span> : null}
        <span>MIN. LULUS: 70</span>
      </div>

      {result ? (
        /* ── Result view ─────────────────────────────────────────────── */
        <div className="mt-8 space-y-4" aria-live="polite">
          <div
            ref={resultRef}
            tabIndex={-1}
            className={`rounded-lg border p-5 outline-none ${
              result.passed
                ? "border-primary-fixed-dim bg-primary-fixed/30"
                : "border-error-container bg-error-container/40"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-headline-sm text-[18px] text-on-surface">
                  <span
                    className={`material-symbols-outlined ms-fill ${
                      result.passed ? "text-primary" : "text-error"
                    }`}
                  >
                    {result.passed ? "verified" : "error"}
                  </span>
                  {result.passed
                    ? "Selamat, Anda lulus kuis bab ini!"
                    : "Belum mencapai nilai kelulusan"}
                </p>
                <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                  Skor{" "}
                  <span className="font-data-point font-bold text-primary">
                    {result.score}%
                  </span>{" "}
                  ({result.correctCount} dari {result.totalQuestions} soal benar)
                  {result.passed
                    ? " · Bab otomatis ditandai selesai."
                    : " · Anda dapat mengulang kuis untuk memperbaiki nilai."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-2 rounded-lg border border-secondary px-4 py-2 font-label-caps text-label-caps text-secondary transition-colors hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-[18px]">
                  replay
                </span>
                ULANGI
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((q, qIdx) => {
              const qResult = result.results.find((r) => r.questionId === q.id);
              const isCorrect = qResult?.isCorrect ?? false;
              const selectedOptIdx = qResult?.selectedIndex ?? selectedAnswers[qIdx];
              const revealedCorrectIdx = qResult?.correctIndex;

              return (
                <div
                  key={q.id}
                  className="rounded-lg border border-slate-200 bg-surface-bright p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-body-md text-body-md font-medium text-on-surface">
                      {qIdx + 1}. {q.question}
                    </p>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-label-caps text-[10px] ${
                        isCorrect
                          ? "bg-primary-fixed text-on-primary-fixed-variant"
                          : "bg-error-container text-on-error-container"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {isCorrect ? "check" : "close"}
                      </span>
                      {isCorrect ? "BENAR" : "SALAH"}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = selectedOptIdx === optIdx;
                      const isRevealedCorrect = revealedCorrectIdx === optIdx;

                      let itemStyle =
                        "border-outline-variant bg-surface-container-lowest text-on-surface-variant";
                      if (isRevealedCorrect) {
                        itemStyle =
                          "border-primary border-2 bg-surface-bright font-medium text-on-surface";
                      } else if (isSelected && !isCorrect) {
                        itemStyle =
                          "border-error border-2 bg-error-container/30 text-on-surface";
                      } else if (isSelected && isCorrect) {
                        itemStyle =
                          "border-primary border-2 bg-surface-bright text-on-surface";
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 font-body-sm text-body-sm transition ${itemStyle}`}
                        >
                          <span className="font-data-point text-data-point text-secondary">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span className="flex-1">{opt}</span>
                          {isSelected && !isRevealedCorrect ? (
                            <span className="font-label-caps text-[10px] text-secondary">
                              JAWABAN ANDA
                            </span>
                          ) : null}
                          {isRevealedCorrect ? (
                            <span className="font-label-caps text-[10px] text-primary">
                              KUNCI JAWABAN
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── Question pager ──────────────────────────────────────────── */
        <div className="mt-8">
          {error ? (
            <p className="mb-4 rounded-lg border border-error-container bg-error-container/40 p-3 font-body-sm text-body-sm text-error">
              {error}
            </p>
          ) : null}

          <fieldset>
            <legend className="font-headline-md text-headline-md text-on-surface">
              {currentQ.question}
            </legend>

            <div className="mt-6 grid gap-3">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = selectedAnswers[currentQuestion] === optIdx;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(optIdx)}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-4 text-left font-body-md text-body-md transition ${
                      isSelected
                        ? "border-2 border-primary bg-surface-bright font-medium text-on-surface"
                        : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-bright"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-data-point text-[11px] ${
                        isSelected
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline-variant bg-surface-container-lowest text-secondary"
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-8 flex items-center justify-between border-t border-outline-variant pt-5">
            {currentQuestion > 0 ? (
              <button
                type="button"
                onClick={() => setCurrentQuestion((prev) => prev - 1)}
                className="font-label-caps text-label-caps text-secondary transition-colors hover:text-primary"
              >
                SEBELUMNYA
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-3">
              {!isLastQuestion ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestion((prev) => prev + 1)}
                  className="inline-flex items-center rounded-lg border border-secondary px-4 py-2.5 font-label-caps text-label-caps text-secondary transition-colors hover:bg-surface-container-low"
                >
                  LANJUT
                </button>
              ) : null}
              {isLastQuestion ? (
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!isAllAnswered || isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "MEMERIKSA…" : "KIRIM JAWABAN"}
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                </button>
              ) : null}
            </div>
          </div>
          {!isAllAnswered && isLastQuestion ? (
            <p className="mt-3 text-right font-body-sm text-[12px] text-secondary">
              Jawab semua soal untuk mengirim kuis.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
