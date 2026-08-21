"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizSubmitResponse | null>(null);
  const [attempts, setAttempts] = useState<QuizAttemptSummary[]>(quiz.attempts);
  const [bestScore, setBestScore] = useState<number | null>(quiz.bestScore);

  const questions = quiz.questions;
  const isAllAnswered =
    questions.length > 0 &&
    questions.every((_, idx) => selectedAnswers[idx] !== undefined);

  function handleSelectOption(questionIndex: number, optionIndex: number) {
    if (result) return; // Locked while viewing results
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
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
  }

  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h4 className="font-display text-lg font-semibold text-foreground">
            Kuis Pemahaman Chapter
          </h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {questions.length} pertanyaan pilihan ganda · Nilai kelulusan minimum: 70%
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {bestScore !== null ? (
            <span
              className={`rounded-full px-2.5 py-1 font-semibold ${
                bestScore >= 70
                  ? "bg-brand-muted text-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              Skor Terbaik: {bestScore}%
            </span>
          ) : null}
          {attempts.length > 0 ? (
            <span className="text-muted-foreground">
              ({attempts.length}x percobaan)
            </span>
          ) : null}
        </div>
      </div>

      {result ? (
        <div className="mt-5 space-y-4">
          <div
            className={`rounded-lg border p-4 ${
              result.passed
                ? "border-border bg-brand-muted/30 text-foreground"
                : "border-border bg-accent/10 text-foreground"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold">
                  {result.passed
                    ? "🎉 Selamat! Anda Lulus Kuis Chapter Ini"
                    : "Belum Mencapai Nilai Kelulusan"}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Skor: <span className="font-bold text-foreground">{result.score}%</span> (
                  {result.correctCount} dari {result.totalQuestions} soal benar)
                  {result.passed
                    ? " · Chapter otomatis ditandai selesai."
                    : " · Anda dapat mengulang kuis untuk memperbaiki nilai."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
              >
                Ulangi Kuis
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
                  className={`rounded-lg border p-4 ${
                    isCorrect
                      ? "border-border bg-background"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {qIdx + 1}. {q.question}
                    </p>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                        isCorrect
                          ? "bg-brand-muted text-foreground"
                          : "bg-accent/20 text-accent"
                      }`}
                    >
                      {isCorrect ? "✓ Benar" : "✗ Salah"}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = selectedOptIdx === optIdx;
                      const isRevealedCorrect = revealedCorrectIdx === optIdx;

                      let itemStyle = "border-border bg-card text-foreground";
                      if (isRevealedCorrect) {
                        itemStyle = "border-brand bg-brand-muted/50 text-foreground font-medium";
                      } else if (isSelected && !isCorrect) {
                        itemStyle = "border-accent bg-accent/10 text-foreground";
                      } else if (isSelected && isCorrect) {
                        itemStyle = "border-brand bg-brand-muted text-foreground";
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`flex items-center gap-3 rounded-md border px-3 py-2 text-xs transition ${itemStyle}`}
                        >
                          <span className="font-semibold text-muted-foreground">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span className="flex-1">{opt}</span>
                          {isSelected ? (
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              (Jawaban Anda)
                            </span>
                          ) : null}
                          {isRevealedCorrect ? (
                            <span className="text-[10px] font-semibold text-brand">
                              (Kunci Jawaban)
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
        <div className="mt-5 space-y-5">
          {error ? (
            <p className="rounded-md border border-accent/30 bg-accent/10 p-3 text-xs text-accent">
              {error}
            </p>
          ) : null}

          <div className="space-y-5">
            {questions.map((q, qIdx) => (
              <fieldset key={q.id} className="space-y-2">
                <legend className="text-sm font-medium text-foreground">
                  {qIdx + 1}. {q.question}
                </legend>

                <div className="grid gap-2">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[qIdx] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(qIdx, optIdx)}
                        className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-xs transition ${
                          isSelected
                            ? "border-brand bg-brand-muted text-foreground ring-1 ring-brand"
                            : "border-border bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                            isSelected
                              ? "border-brand bg-brand text-brand-foreground"
                              : "border-border bg-card text-muted-foreground"
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
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              {Object.keys(selectedAnswers).length} dari {questions.length} soal terjawab
            </p>

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!isAllAnswered || isSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? "Memeriksa Jawaban..." : "Kirim Jawaban Kuis"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
