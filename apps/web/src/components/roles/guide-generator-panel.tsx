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

      const data = await apiFetch<{ role: { id: string; status: RoleStatus } }>(
        `/api/roles/${roleId}/guide/generate`,
        {
          method: "POST",
          token,
        },
      );

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
    <section className="rounded-lg border border-slate-200 bg-surface-container-lowest p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">
            Panduan (Guide)
          </h3>
          <p className="mt-1 font-body-sm text-body-sm text-secondary">
            Hasilkan panduan onboarding terstruktur dari hasil training role{" "}
            {roleName}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void generateGuide()}
          disabled={!canGenerate}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-label-caps text-label-caps transition-colors ${
            canGenerate
              ? "bg-status-ready text-white hover:brightness-95"
              : "cursor-not-allowed border border-slate-300 bg-slate-200 text-slate-400"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isGenerating ? "progress_activity" : "auto_awesome"}
          </span>
          {isGenerating
            ? "MEMBUAT…"
            : guide
              ? "PERBARUI PANDUAN"
              : "HASILKAN PANDUAN"}
        </button>
      </div>

      {roleStatus === "DRAFT" ? (
        <p className="mt-3 rounded-lg border border-status-locked border-l-4 bg-surface-bright p-3 font-body-sm text-body-sm text-on-surface-variant">
          Role masih DRAFT. Lanjutkan training sampai status SIAP (≥ 75%) untuk
          mengaktifkan pembuatan panduan.
        </p>
      ) : null}

      {error ? <p className="mt-3 font-body-sm text-body-sm text-error">{error}</p> : null}
      {retryAfter ? (
        <p className="mt-2 font-body-sm text-[12px] text-secondary">
          Rate limit aktif. Coba lagi dalam ~{retryAfter} detik.
        </p>
      ) : null}

      {guide ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg border border-outline-variant bg-surface-bright p-4">
            <p className="font-label-caps text-label-caps text-secondary">
              PANDUAN v{guide.version}
            </p>
            <h4 className="mt-1 font-headline-sm text-[18px] text-on-surface">
              {guide.title}
            </h4>
            <p className="mt-1 font-data-point text-data-point text-secondary">
              {guide.publishedAt
                ? `Terbit: ${new Date(guide.publishedAt).toLocaleString("id-ID")}`
                : `Diperbarui: ${new Date(guide.updatedAt).toLocaleString("id-ID")}`}
            </p>
          </div>

          <div className="space-y-3">
            {guide.chapters.map((chapter) => (
              <article
                key={chapter.id}
                className="rounded-lg border border-slate-200 bg-surface-bright p-5"
              >
                <p className="font-label-caps text-label-caps text-secondary">
                  BAB {chapter.order}
                </p>
                <h5 className="mt-1 font-headline-sm text-[18px] text-on-surface">
                  {chapter.title}
                </h5>

                <div className="guide-content mt-3">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                    {chapter.content}
                  </ReactMarkdown>
                </div>

                {chapter.quiz ? (
                  <div className="mt-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
                    <p className="font-label-caps text-label-caps text-secondary">
                      KUIS ({chapter.quiz.questions.length} SOAL)
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 font-body-sm text-body-sm text-on-surface-variant">
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
        <p className="mt-4 font-body-md text-body-md text-on-surface-variant">
          Belum ada guide untuk role ini.
        </p>
      )}
    </section>
  );
}
