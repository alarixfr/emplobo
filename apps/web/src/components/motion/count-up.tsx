"use client";

import { useLayoutEffect, useRef } from "react";
import { EASE_OUT, gsap, prefersReducedMotion } from "@/lib/motion";

type CountUpProps = {
  /** Target value. */
  to: number;
  duration?: number;
  delay?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Insert thousands separator in the integer part. */
  separator?: boolean;
  className?: string;
};

function formatValue(value: number, decimals: number, separator: boolean): string {
  const fixed = value.toFixed(decimals);
  if (!separator) return fixed;
  const [int, frac] = fixed.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return frac ? `${grouped}.${frac}` : grouped;
}

/**
 * CountUp — counts to a number the first time it enters the viewport and
 * writes textContent directly (no re-render churn). Reduced-motion visitors
 * get the final value instantly. Used for readiness %, dashboard metrics,
 * and quiz scores where a number is the point of the moment.
 */
export function CountUp({
  to,
  duration = 1.2,
  delay = 0,
  decimals = 0,
  prefix = "",
  suffix = "",
  separator = false,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);

  const write = (value: number) => {
    const el = ref.current;
    if (el) el.textContent = `${prefix}${formatValue(value, decimals, separator)}${suffix}`;
  };

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reduced motion → show target immediately, no tween.
    if (prefersReducedMotion()) {
      write(to);
      return;
    }

    write(0);

    const state = { value: 0 };
    const ctx = gsap.context(() => {
      gsap.to(state, {
        value: to,
        duration,
        delay,
        ease: EASE_OUT,
        onUpdate: () => write(state.value),
        scrollTrigger: { trigger: el, start: "top 92%", once: true },
      });
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, duration, delay, decimals, prefix, suffix, separator]);

  return (
    <span ref={ref} className={className} aria-hidden>
      {prefix}
      {formatValue(to, decimals, separator)}
      {suffix}
    </span>
  );
}