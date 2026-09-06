"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * RouteProgress — a 2px bar that sweeps across the viewport once whenever
 * the user navigates to a new route in the app shell. Pure CSS keyframes,
 * honors prefers-reduced-motion. Purely decorative (aria-hidden).
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const prev = useRef(pathname);

  useEffect(() => {
    if (prev.current === pathname) return;
    prev.current = pathname;
    setBusy(true);
    const t = setTimeout(() => setBusy(false), 520);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div
        className={`route-progress ${busy ? "route-progress--active" : ""}`}
      />
    </div>
  );
}