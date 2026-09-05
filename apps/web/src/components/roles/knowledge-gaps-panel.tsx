import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type KnowledgeGapsPanelProps = {
  missingAreas: string[];
  /** null = belum pernah ada evaluasi (scoring belum berjalan) */
  evaluatedAt: string | null;
  completeness: number;
  headingLevel?: 2 | 3;
  className?: string;
};

/**
 * Celah Pengetahuan — shows the AI's self-assessment of what's still missing
 * in the role's training. Three deliberate states:
 *  1. Belum dievaluasi (no scoring yet) → guidance to keep training.
 *  2. Ada celah → the actual missing areas with a count badge.
 *  3. Tidak ada celah → positive confirmation, tied to the readiness score.
 */
export function KnowledgeGapsPanel({
  missingAreas,
  evaluatedAt,
  completeness,
  headingLevel = 2,
  className = "",
}: KnowledgeGapsPanelProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const evaluated = evaluatedAt !== null;
  const gapCount = missingAreas.length;

  const lastEvaluation =
    evaluated && evaluatedAt
      ? formatDistanceToNow(new Date(evaluatedAt), {
          addSuffix: true,
          locale: idLocale,
        })
      : null;

  return (
    <div className={className}>
      <Heading className="mb-3 flex items-center gap-2 font-headline-sm text-[18px] text-on-surface">
        <span className="material-symbols-outlined text-[18px] text-status-locked">
          error
        </span>
        Celah Pengetahuan
        {evaluated && gapCount > 0 ? (
          <span className="ml-auto rounded-full border border-status-locked px-2 py-0.5 font-label-caps text-[10px] text-status-locked">
            {gapCount} CELAH
          </span>
        ) : null}
      </Heading>

      {!evaluated ? (
        <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-3">
          <p className="font-body-sm text-[13px] leading-5 text-secondary">
            Belum ada hasil evaluasi. AI mengulas kelengkapan materi secara
            otomatis setiap 5 pesan training — celah pengetahuan yang
            terdeteksi akan muncul di sini.
          </p>
        </div>
      ) : gapCount === 0 ? (
        <div className="rounded-lg border border-status-ready/40 bg-status-ready/10 p-3">
          <p className="flex items-center gap-2 font-body-md font-medium text-status-ready">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            Tidak ada celah terdeteksi
          </p>
          <p className="mt-1 font-body-sm text-[12px] leading-5 text-on-surface-variant">
            {completeness >= 75
              ? "Materi dinilai cukup untuk membuat guide. Jalankan Generate Guide bila perlu, atau lanjutkan training untuk memperdalam materi."
              : "Evaluasi terakhir tidak menemukan celah. Lanjutkan training untuk memperdalam materi dan hasil lebih matang."}
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {missingAreas.map((gap, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 rounded-lg border border-status-locked border-l-4 bg-surface-bright p-2.5"
              >
                <span className="material-symbols-outlined mt-0.5 text-base text-status-locked">
                  pending
                </span>
                <span className="font-data-point text-[13px] font-bold leading-5 text-on-surface">
                  {gap}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-body-sm text-[11px] text-secondary">
            <span className="material-symbols-outlined text-[13px]">refresh</span>
            <span>Diperbarui otomatis saat training berlanjut</span>
            {lastEvaluation ? (
              <span className="hidden items-center gap-1 sm:flex">
                <span aria-hidden>·</span>
                <span>Evaluasi terakhir {lastEvaluation}</span>
              </span>
            ) : null}
          </p>
        </>
      )}
    </div>
  );
}