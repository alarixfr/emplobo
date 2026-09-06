type KnowledgeGapsProps = {
  gaps: string[];
  size?: "sm" | "md";
  // When the model scored the training ≥ 70 and reported no remaining gaps,
  // show a positive "all covered" state instead of the "menunggu evaluasi"
  // explainer (which would be misleading).
  allCovered?: boolean;
};

/**
 * Celah Pengetahuan — AI-detected training gaps surfaced to the admin.
 * Rendered in three places (Training Room left rail, Training Room mobile
 * card, role detail sidebar). Keep the visuals consistent across all three.
 */
export function KnowledgeGaps({ gaps, size = "md", allCovered = false }: KnowledgeGapsProps) {
  const isCompact = size === "sm";

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3
          className={`flex items-center gap-2 font-headline-sm text-on-surface ${
            isCompact ? "text-[16px]" : "text-[18px]"
          }`}
        >
          <span
            className={`material-symbols-outlined text-status-locked ${
              isCompact ? "text-[18px]" : "text-[20px]"
            }`}
          >
            flag
          </span>
          Celah Pengetahuan
        </h3>
        {gaps.length > 0 ? (
          <span className="shrink-0 rounded-full bg-status-locked/15 px-2 py-0.5 font-label-caps text-[10px] text-status-locked">
            {gaps.length}
          </span>
        ) : null}
      </div>

      {gaps.length === 0 ? (
        allCovered ? (
          <p
            className={`font-body-sm text-secondary ${
              isCompact ? "text-[12px] leading-5" : "text-body-sm"
            }`}
          >
            <span className="font-medium text-status-success">
              Semua area utama sudah tercakup.
            </span>{" "}
            Materi role ini sudah cukup untuk menghasilkan panduan.
          </p>
        ) : (
          <p
            className={`font-body-sm text-secondary ${
              isCompact ? "text-[12px] leading-5" : "text-body-sm"
            }`}
          >
            AI menilai materi secara berkala. Topik yang belum dibahas akan
            tercatat di sini sebagai celah pengetahuan.
          </p>
        )
      ) : (
        <ul className="space-y-2">
          {gaps.map((gap, idx) => (
            <li
              key={idx}
              style={{ animationDelay: `${idx * 60}ms` }}
              className={`animate-fade-rise flex items-start gap-2.5 rounded-lg border border-status-locked/40 border-l-4 border-l-status-locked bg-status-locked/5 ${
                isCompact ? "p-2.5" : "p-3"
              }`}
            >
              <span
                className={`material-symbols-outlined mt-0.5 shrink-0 text-status-locked ${
                  isCompact ? "text-base" : "text-lg"
                }`}
              >
                pending
              </span>
              <p
                className={`leading-5 font-medium text-on-surface ${
                  isCompact ? "text-[13px]" : "text-body-sm"
                }`}
              >
                {gap}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
