"use client";

import { useEffect, useState } from "react";

/**
 * Scroll-spy that tracks which element is "active" as the page scrolls.
 *
 * Computes, on scroll, the LAST element in `ids` whose top has crossed above
 * the given page offset — i.e. the section currently at the top of the reading
 * viewport. This is more predictable than an IntersectionObserver, which can
 * flicker between two intersecting sections while scrolling quickly.
 */
export function useScrollSpy(ids: string[], offsetPx = 120): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    if (ids.length === 0) return;
    let ticking = false;

    function compute() {
      ticking = false;
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= offsetPx) {
          current = id;
        }
      }
      setActive(current ?? ids[0] ?? null);
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(compute);
    }

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // ids is a flat, stable array of section ids — recompute on change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join("\u0000"), offsetPx]);

  return active;
}