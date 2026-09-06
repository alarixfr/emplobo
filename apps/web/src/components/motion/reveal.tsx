"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { EASE_OUT, REVEAL_START, ScrollTrigger, gsap, prefersReducedMotion } from "@/lib/motion";

type RevealProps = {
  children: ReactNode;
  /** Vertical travel distance in px. */
  y?: number;
  /** Horizontal travel distance in px (negative = from left). */
  x?: number;
  delay?: number;
  duration?: number;
  scale?: number;
  once?: boolean;
  /** ScrollTrigger start position, e.g. "top 85%". */
  start?: string;
  className?: string;
};

/**
 * Reveal — fades + rises a block into view the first time it enters the
 * viewport. Honors prefers-reduced-motion (content stays visible, no tween).
 * The default state is the visible state; hiding only happens once JS is
 * running, so the page is never blank if a script fails.
 */
export function Reveal({
  children,
  y = 24,
  x = 0,
  delay = 0,
  duration = 0.9,
  scale = 1,
  once = true,
  start = REVEAL_START,
  className,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y, x, scale, transformOrigin: "center" },
        {
          autoAlpha: 1,
          y: 0,
          x: 0,
          scale: 1,
          duration,
          delay,
          ease: EASE_OUT,
          scrollTrigger: {
            trigger: el,
            start,
            once,
            toggleActions: once ? "play none none none" : "play none none reverse",
          },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [y, x, delay, duration, scale, once, start]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

type StaggerProps = {
  children: ReactNode;
  y?: number;
  /** Seconds between each child's arrival. */
  stagger?: number;
  delay?: number;
  duration?: number;
  once?: boolean;
  start?: string;
  className?: string;
};

/**
 * Stagger — plays a choreographed rise across direct children (grids, lists.
 * Use only when the children read as one list, per the motion thesis).
 */
export function Stagger({
  children,
  y = 22,
  stagger = 0.08,
  delay = 0,
  duration = 0.75,
  once = true,
  start = REVEAL_START,
  className,
}: StaggerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;

    const items = Array.from(el.children) as HTMLElement[];
    if (items.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        items,
        { autoAlpha: 0, y },
        {
          autoAlpha: 1,
          y: 0,
          duration,
          stagger,
          delay,
          ease: EASE_OUT,
          scrollTrigger: {
            trigger: el,
            start,
            once,
            toggleActions: once ? "play none none none" : "play none none reverse",
          },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [y, stagger, delay, duration, once, start]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// Re-export so page-level code only imports from one place.
export { ScrollTrigger };

/**
 * LineStretch — a hairline that draws itself the first time it scrolls into
 * view. Vertical lines grow downward (scaleY from top); horizontal lines
 * grow rightward (scaleX from left). Used for the Business Brain Loop spine
 * and the How-it-works connector.
 */
export function LineStretch({
  className = "",
  orientation = "vertical",
}: {
  className?: string;
  orientation?: "vertical" | "horizontal";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;

    if (orientation === "vertical") {
      gsap.set(el, { scaleY: 0, transformOrigin: "top" });
    } else {
      gsap.set(el, { scaleX: 0, transformOrigin: "left" });
    }
    const ctx = gsap.context(() => {
      const vars = {
        [orientation === "vertical" ? "scaleY" : "scaleX"]: 1,
        duration: 1.1,
        ease: "power2.inOut",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      } as gsap.TweenVars;
      gsap.to(el, vars);
    }, el);

    return () => ctx.revert();
  }, [orientation]);

  return <div ref={ref} className={className} />;
}