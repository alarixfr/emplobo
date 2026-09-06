"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };

/** Signature easing for confident arrivals (institutional, not bouncy). */
export const EASE_OUT = "power3.out";
export const EASE_IN_OUT = "power2.inOut";

/** True when the visitor has asked for reduced motion (a11y, battery, vertigo). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Default viewport band where a scroll reveal triggers. */
export const REVEAL_START = "top 85%";