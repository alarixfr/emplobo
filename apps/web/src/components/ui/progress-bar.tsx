"use client";

import { useLayoutEffect, useRef } from "react";
import { EASE_OUT, gsap, prefersReducedMotion } from "@/lib/motion";

/**
 * Thin 4px progress bar — DESIGN.md §Components (Progress Bars).
 * fillClass defaults to Forest Green (completeness semantics).
 * Pass `animate` to draw the fill in from 0 the first time it scrolls into
 * view (used on the dashboard so readiness reads as a living measure).
 */
export function ProgressBar({
  percent,
  fillClass = "bg-primary",
  className = "",
  animate = false,
}: {
  percent: number;
  fillClass?: string;
  className?: string;
  animate?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const fillRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = fillRef.current;
    if (!el || !animate) return;
    const start = clamped <= 0 ? 1 : 0;
    el.style.width = `${start}%`;
    if (prefersReducedMotion()) {
      el.style.width = `${clamped}%`;
      return;
    }
    const ctx = gsap.context(() => {
      gsap.to(el, {
        width: `${clamped}%`,
        duration: 1,
        ease: EASE_OUT,
        scrollTrigger: { trigger: el, start: "top 92%", once: true },
      });
    }, el);
    return () => ctx.revert();
  }, [animate, clamped]);

  return (
    <div className={`h-1 w-full overflow-hidden rounded-full bg-outline-variant/50 ${className}`}>
      <div
        ref={fillRef}
        className={`h-full rounded-full ${animate ? "" : "transition-all duration-500"} ${fillClass}`}
        style={{ width: `${animate ? "0%" : `${clamped}%`}` }}
      />
    </div>
  );
}