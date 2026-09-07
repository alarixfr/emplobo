"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Dialog — centered modal rendered into document.body via a portal.
 *
 * Portaling matters: tthis app animates most pages with GSAP (Reveal /
 * Stagger), which leaves a CSS `transform` on the animated wrapper. A
 * `position: fixed` overlay inside a transformed ancestor is positioned
 * relative to that ancestor instead of the viewport, so the dialog ends up
 * misplaced with a clipped backdrop. Mounting at <body> level sidesteps
 * transform / stacking-context traps entirely.
 */
export function Dialog({
  onClose,
  labelledBy,
  maxWidth = "max-w-md",
  children,
}: {
  onClose: () => void;
  labelledBy?: string;
  maxWidth?: string;
  children: ReactNode;
}) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // Escape to close, with a ref so the listener never relies on a stale closure.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Lock background scroll while open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-on-surface/45 backdrop-blur-sm"
      />
      <div
        className={`relative z-10 max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl sm:p-8 ${maxWidth}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}