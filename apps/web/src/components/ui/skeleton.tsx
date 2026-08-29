/**
 * Skeleton loading primitives — shown while Clerk is still initializing or
 * while data is in flight, so the UI never flashes an error/empty state on
 * first load.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-lg bg-surface-container-low ${className}`}
    />
  );
}

export function SkeletonText({
  className = "",
  lines = 2,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={i === lines - 1 ? "h-3 w-2/3" : "h-3 w-full"}
        />
      ))}
    </div>
  );
}
