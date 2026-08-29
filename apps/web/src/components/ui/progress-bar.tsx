/**
 * Thin 4px progress bar — DESIGN.md §Components (Progress Bars).
 * fillClass defaults to Forest Green (completeness semantics).
 */
export function ProgressBar({
  percent,
  fillClass = "bg-primary",
  className = "",
}: {
  percent: number;
  fillClass?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={`h-1 w-full overflow-hidden rounded-full bg-slate-200 ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${fillClass}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
