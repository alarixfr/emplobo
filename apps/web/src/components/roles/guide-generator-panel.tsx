"use client";

import { useAuth } from "@clerk/nextjs";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { ApiError, apiFetch } from "@/lib/api";
import type { RoleGuide, RoleStatus } from "@/lib/roles";

type GuideGeneratorPanelProps = {
  roleId: string;
  roleName: string;
  roleStatus: RoleStatus;
  initialGuide: RoleGuide | null;
  onStatusUpdated?: (status: RoleStatus) => void;
};

export function GuideGeneratorPanel({
  roleId,
  roleName,
  roleStatus,
  initialGuide,
  onStatusUpdated,
}: GuideGeneratorPanelProps) {
  const { getToken } = useAuth();
  const [guide, setGuide] = useState<RoleGuide | null>(initialGuide);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const canGenerate = useMemo(
    () => (roleStatus === "READY" || roleStatus === "PUBLISHED") && !isGenerating,
    [roleStatus, isGenerating],
  );

  async function generateGuide() {
    if (!canGenerate) return;
    setError(null);
    setRetryAfter(null);
    setIsGenerating(true);

    try {
      const token = await getToken();
      if (!token) {
        setError("Sesi tidak valid. Silakan login ulang.");
        return;
      }

      const data = await apiFetch<{
        role: { id: string; status: RoleStatus };
      }>(`/api/roles/${roleId}/guide/generate`, {
        method: "POST",
        token,
      });

      // Generation already succeeded and consumed a rate-limit slot — retry
      // the guide fetch once so a network blip doesn't force a re-generate.
      let guideData: { guide: RoleGuide };
      try {
        guideData = await apiFetch<{ guide: RoleGuide }>(`/api/roles/${roleId}/guide`, {
          token,
        });
      } catch {
        guideData = await apiFetch<{ guide: RoleGuide }>(`/api/roles/${roleId}/guide`, {
          token,
        });
      }

      setGuide(guideData.guide);
      onStatusUpdated?.(data.role.status);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        const retry =
          typeof err.body === "object" &&
          err.body &&
          "retryAfter" in err.body &&
          typeof (err.body as { retryAfter?: unknown }).retryAfter === "number"
            ? (err.body as { retryAfter: number }).retryAfter
            : null;
        setRetryAfter(retry);
      }

      setError(err instanceof Error ? err.message : "Gagal menghasilkan guide.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            Panduan (Guide)
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Hasilkan panduan onboarding terstruktur dari hasil training role {roleName}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void generateGuide()}
          disabled={!canGenerate}
          className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {isGenerating
            ? "Membuat panduan..."
            : guide
              ? "Perbarui Panduan"
              : "Hasilkan Panduan"}
        </button>
      </div>

      {roleStatus === "DRAFT" ? (
        <p className="mt-3 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
          Role masih DRAFT. Lanjutkan training sampai status READY untuk
          mengaktifkan pembuatan panduan.
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-accent">{error}</p> : null}
      {retryAfter ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Rate limit aktif. Coba lagi dalam ~{retryAfter} detik.
        </p>
      ) : null}

      {guide ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Panduan v{guide.version}
            </p>
            <h4 className="mt-1 text-base font-semibold text-foreground">{guide.title}</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {guide.publishedAt
                ? `Terbit: ${new Date(guide.publishedAt).toLocaleString("id-ID")}`
                : `Diperbarui: ${new Date(guide.updatedAt).toLocaleString("id-ID")}`}
            </p>
          </div>

          <div className="space-y-3">
            {guide.chapters.map((chapter) => (
              <article key={chapter.id} className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Bab {chapter.order}
                </p>
                <h5 className="mt-1 text-sm font-semibold text-foreground">{chapter.title}</h5>

                <div className="prose prose-sm mt-3 max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-code:text-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                    {chapter.content}
                  </ReactMarkdown>
                </div>

                {chapter.quiz ? (
                  <div className="mt-3 rounded-md border border-border bg-card p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Kuis ({chapter.quiz.questions.length} soal)
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
                      {chapter.quiz.questions.map((q) => (
                        <li key={q.id}>{q.question}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Belum ada guide untuk role ini.
        </p>
      )}
    </section>
  );
}
