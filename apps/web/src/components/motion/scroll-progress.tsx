"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";

/**
 * ScrollProgressBar — a 2px primary line under the marketing header that
 * fills as the page scrolls. Motion-only accent; hidden for reduced-motion.
 */
export function ScrollProgressBar({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.set(el, { scaleX: 0 });
      gsap.to(el, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "max",
          scrub: 0.3,
        },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div
      role="presentation"
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 h-0.5 origin-left scale-x-0 bg-primary ${className}`}
      ref={ref}
    />
  );
}