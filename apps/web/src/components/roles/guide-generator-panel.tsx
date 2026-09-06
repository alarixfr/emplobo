"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { ApiError, apiFetch } from "@/lib/api";
import type {
  GuideDraftFull,
  GuideVersionInfo,
  RoleGuide,
  RoleStatus,
} from "@/lib/roles";

type GuideGeneratorPanelProps = {
  roleId: string;
  roleName: string;
  roleStatus: RoleStatus;
  initialGuide: RoleGuide | null;
  onStatusUpdated?: (status: RoleStatus) => void;
};

function ChangeChip({ label, tone }: { label: string; tone: "added" | "updated" | "removed" }) {
  const className =
    tone === "added"
      ? "bg-status-ready/10 text-status-ready"
      : tone === "updated"
        ? "bg-primary-fixed/50 text-on-primary-fixed-variant"
        : "bg-error-container/40 text-error";
  return (
    <span className={`rounded-full px-2.5 py-1 font-label-caps text-[10px] ${className}`}>
      {label}
    </span>
  );
}

export function GuideGeneratorPanel({
  roleId,
  roleName,
  roleStatus,
  initialGuide,
  onStatusUpdated,
}: GuideGeneratorPanelProps) {
  const { getToken } = useAuth();
  const [guide, setGuide] = useState<RoleGuide | null>(initialGuide);
  const [draft, setDraft] = useState<GuideDraftFull | null>(null);
  const [versions, setVersions] = useState<GuideVersionInfo[]>([]);
  const [isLoadingReview, setIsLoadingReview] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [reopeningVersionId, setReopeningVersionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const canGenerate = useMemo(
    () =>
      (roleStatus === "READY" || roleStatus === "PUBLISHED") &&
      !isGenerating &&
      !isPublishing &&
      !isDiscarding,
    [roleStatus, isGenerating, isPublishing, isDiscarding],
  );

  const loadReview = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const [draftRes, versionsRes] = await Promise.allSettled([
        apiFetch<{ draft: GuideDraftFull }>(`/api/roles/${roleId}/guide/draft`, { token }),
        apiFetch<{ versions: GuideVersionInfo[] }>(`/api/roles/${roleId}/guide/versions`, { token }),
      ]);

      if (draftRes.status === "fulfilled") setDraft(draftRes.value.draft);
      if (versionsRes.status === "fulfilled") setVersions(versionsRes.value.versions);
    } catch {
      // Review data is decorative (badge/history); keep the rest usable.
    } finally {
      setIsLoadingReview(false);
    }
  }, [getToken, roleId]);

  useEffect(() => {
    void loadReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]);

  async function generateGuide() {
    if (!canGenerate) return;
    setError(null);
    setNotice(null);
    setRetryAfter(null);
    setIsGenerating(true);

    try {
      const token = await getToken();
      if (!token) {
        setError("Sesi tidak valid. Silakan login ulang.");
        return;
      }

      const data = await apiFetch<{
        draft: GuideDraftFull;
        role: { id: string; status: RoleStatus };
      }>(`/api/roles/${roleId}/guide/generate`, {
        method: "POST",
        token,
      });

      // Generation consumes a rate-limit slot without touching the live
      // guide — the result is the review draft shown below.
      setDraft(data.draft);
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

  async function publishDraft() {
    if (!draft) return;
    setError(null);
    setNotice(null);
    setIsPublishing(true);

    try {
      const token = await getToken();
      if (!token) {
        setError("Sesi tidak valid. Silakan login ulang.");
        return;
      }

      const data = await apiFetch<{
        guide: { version: number };
        role: { id: string; status: RoleStatus };
        summary: string;
      }>(`/api/roles/${roleId}/guide/draft/publish`, {
        method: "POST",
        body: {},
        token,
      });

      setDraft(null);
      onStatusUpdated?.(data.role.status);
      setNotice(`Diterbitkan sebagai v${data.guide.version}: ${data.summary}`);

      // Refresh the live guide once (the publish already happened, so a blip
      // here must not be reported as failure).
      try {
        const guideData = await apiFetch<{ guide: RoleGuide }>(`/api/roles/${roleId}/guide`, {
          token,
        });
        setGuide(guideData.guide);
      } catch {
        // Best-effort refresh; next page load shows the new version.
      }

      void loadReview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menerbitkan draf.");
    } finally {
      setIsPublishing(false);
    }
  }

  async function discardDraft() {
    if (!draft) return;
    setError(null);
    setNotice(null);
    setIsDiscarding(true);

    try {
      const token = await getToken();
      if (!token) {
        setError("Sesi tidak valid. Silakan login ulang.");
        return;
      }

      await apiFetch<{ ok: boolean }>(`/api/roles/${roleId}/guide/draft`, {
        method: "DELETE",
        token,
      });

      setDraft(null);
      setNotice("Draf perubahan dibatalkan. Panduan yang terbit tidak berubah.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membatalkan draf.");
    } finally {
      setIsDiscarding(false);
    }
  }

  async function reopenVersion(versionId: string, versionNumber: number) {
    setError(null);
    setNotice(null);
    setReopeningVersionId(versionId);

    try {
      const token = await getToken();
      if (!token) {
        setError("Sesi tidak valid. Silakan login ulang.");
        return;
      }

      const data = await apiFetch<{ draft: GuideDraftFull }>(
        `/api/roles/${roleId}/guide/draft/from-version`,
        {
          method: "POST",
          body: { version: versionNumber },
          token,
        },
      );

      setDraft(data.draft);
      setNotice(
        `Versi v${versionNumber} dibuka sebagai draf perubahan. Tinjau lalu terbitkan.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuka ulang versi.");
    } finally {
      setReopeningVersionId(null);
    }
  }

  return (
    <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">
            Panduan (Guide)
          </h3>
          <p className="mt-1 font-body-sm text-body-sm text-secondary">
            Hasilkan &amp; perbarui panduan onboarding dari hasil training role{" "}
            {roleName}. Hasil baru masuk sebagai draf untuk ditinjau dulu —
            tidak langsung menggantikan panduan yang sedang dipakai karyawan.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void generateGuide()}
          disabled={!canGenerate}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-label-caps text-label-caps transition-colors ${
            canGenerate
              ? "bg-status-ready text-white hover:brightness-95"
              : "cursor-not-allowed border border-outline-variant bg-surface-container-high text-outline"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isGenerating ? "progress_activity animate-spin" : "auto_awesome"}
          </span>
          {isGenerating ? "MENGHASILKAN…" : guide ? "PERBARUI GUIDE" : "GENERATE GUIDE"}
        </button>
      </div>

      {roleStatus === "DRAFT" ? (
        <p className="mt-3 rounded-lg border border-status-locked border-l-4 bg-surface-bright p-3 font-body-sm text-body-sm text-on-surface-variant">
          Role masih DRAFT. Lanjutkan training sampai status READY (≥ 75%) untuk
          mengaktifkan pembuatan panduan.
        </p>
      ) : null}

      {error ? <p className="mt-3 font-body-sm text-body-sm text-error">{error}</p> : null}
      {notice ? (
        <p className="mt-3 rounded-lg border border-status-ready/40 bg-status-ready/10 p-3 font-body-sm text-body-sm text-on-surface">
          {notice}
        </p>
      ) : null}
      {retryAfter ? (
        <p className="mt-2 font-body-sm text-[12px] text-secondary">
          Rate limit aktif. Coba lagi dalam ~{retryAfter} detik.
        </p>
      ) : null}

      {/* ── Pending draft review ──────────────────────────────────────── */}
      {draft ? (
        <div className="mt-5 space-y-4">
          <div
            className={`rounded-lg border p-4 ${
              draft.changes.hasChanges
                ? "border-status-ready bg-status-ready/10"
                : "border-outline-variant bg-surface-bright"
            }`}
          >
            <p className="font-label-caps text-label-caps text-status-ready">
              DRAF PEMBARUAN MENUNGGU TINJAUAN
            </p>
            <h4 className="mt-1 font-headline-sm text-[18px] text-on-surface">
              {draft.title} · v{draft.baseVersion} → v{draft.targetVersion}
            </h4>

            {draft.changes.hasChanges ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <ChangeChip
                  label={`+${draft.changes.addedCount} BAB BARU`}
                  tone="added"
                />
                <ChangeChip
                  label={`≈${draft.changes.updatedCount} BAB DIUBAH`}
                  tone="updated"
                />
                <ChangeChip
                  label={`−${draft.changes.removedCount} BAB DIHAPUS`}
                  tone="removed"
                />
                <ChangeChip
                  label={`${draft.changes.unchangedCount} BAB SAMA`}
                  tone="added"
                />
              </div>
            ) : null}

            <p className="mt-3 whitespace-pre-line font-body-sm text-body-sm text-on-surface-variant">
              {draft.summary}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void publishDraft()}
                disabled={isPublishing || isDiscarding}
                className="inline-flex items-center gap-2 rounded-lg bg-status-ready px-4 py-2.5 font-label-caps text-label-caps text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isPublishing ? "progress_activity animate-spin" : "publish"}
                </span>
                {isPublishing ? "MENERBITKAN…" : "TERBITKAN SEBAGAI v" + draft.targetVersion}
              </button>
              <button
                type="button"
                onClick={() => void discardDraft()}
                disabled={isPublishing || isDiscarding}
                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 font-label-caps text-label-caps text-secondary transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isDiscarding ? "progress_activity animate-spin" : "close"}
                </span>
                {isDiscarding ? "MEMBATALKAN…" : "BATALKAN DRAF"}
              </button>
            </div>
            <p className="mt-2 font-body-sm text-[12px] text-secondary">
              Menerbitkan draf tidak menghapus progres bab yang sudah diselesaikan
              karyawan — bab yang judulnya sama tetap dipetakan ke progres lama.
            </p>
          </div>

          <div className="space-y-3">
            {draft.chapters.map((chapter, index) => (
              <details
                key={`${draft.id}-${index}`}
                style={{ animationDelay: `${index * 60}ms` }}
                className="animate-fade-rise rounded-lg border border-outline-variant bg-surface-bright p-4"
              >
                <summary className="cursor-pointer font-label-caps text-label-caps text-secondary list-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-2">
                    <span>
                      BAB {index + 1} · {chapter.title}
                    </span>
                    <span className="material-symbols-outlined text-[18px]">
                      expand_more
                    </span>
                  </span>
                </summary>
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
                      {chapter.quiz.questions.map((q, qi) => (
                        <li key={qi}>{q.question}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </details>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Version history ───────────────────────────────────────────── */}
      <div className="mt-5">
        <h4 className="font-label-caps text-label-caps text-secondary">
          RIWAYAT VERSI
        </h4>
        {isLoadingReview ? (
          <p className="mt-2 font-body-sm text-body-sm text-secondary">Memuat…</p>
        ) : versions.length === 0 ? (
          <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
            Belum ada versi. Terbitkan draf untuk memulai riwayat.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {versions.map((version, index) => {
              const isActive = guide?.version === version.version;
              return (
                <li
                  key={version.id}
                  style={{ animationDelay: `${index * 60}ms` }}
                  className="animate-fade-rise rounded-lg border border-outline-variant bg-surface-bright p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-data-point text-data-point text-on-surface">
                      v{version.version} · {version.title}
                      {isActive ? (
                        <span className="ml-2 rounded-full bg-status-ready/10 px-2 py-0.5 font-label-caps text-[10px] text-status-ready">
                          VERSI AKTIF
                        </span>
                      ) : null}
                    </p>
                    {!isActive ? (
                      <button
                        type="button"
                        onClick={() => void reopenVersion(version.id, version.version)}
                        disabled={reopeningVersionId !== null || !!draft}
                        title={
                          draft
                            ? "Batalkan draf yang belum diterbitkan dulu"
                            : "Buka versi ini sebagai draf pembaruan"
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 font-label-caps text-[10px] text-secondary transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {reopeningVersionId === version.id
                            ? "progress_activity animate-spin"
                            : "history"}
                        </span>
                        BUKA ULANG
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-1 whitespace-pre-line font-body-sm text-body-sm text-on-surface-variant">
                    {version.summary}
                  </p>
                  <p className="mt-1 font-label-caps text-[10px] text-secondary">
                    {version.publishedAt
                      ? `Terbit ${new Date(version.publishedAt).toLocaleString("id-ID")}`
                      : ""}
                    {version.publishedByName ? ` · oleh ${version.publishedByName}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Live guide preview ────────────────────────────────────────── */}
      {guide ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg border border-outline-variant bg-surface-bright p-4">
            <p className="font-label-caps text-label-caps text-secondary">
              PANDUAN AKTIF v{guide.version}
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
            {guide.chapters.map((chapter, index) => (
              <article
                key={chapter.id}
                style={{ animationDelay: `${index * 60}ms` }}
                className="animate-fade-rise rounded-lg border border-outline-variant bg-surface-bright p-5"
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