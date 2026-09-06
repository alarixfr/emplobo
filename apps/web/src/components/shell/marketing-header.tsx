"use client";

import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "@/lib/motion";
import { prefersReducedMotion } from "@/lib/motion";
import { ScrollProgressBar } from "@/components/motion/scroll-progress";

const NAV_LINKS = [
  { href: "/#advantage", label: "Platform", anchor: "advantage" },
  { href: "/#how-it-works", label: "Cara Kerja", anchor: "how-it-works" },
  { href: "/docs", label: "Docs", anchor: null as string | null },
];

/**
 * Marketing header — overdrive on the incumbent reference TopNavBar:
 *  - transparent-born, elevates + compacts on scroll (blur, hairline shadow)
 *  - 2px scroll progress line under the edge once scrolling begins
 *  - animated sliding underlines on the desktop links
 *  - scrollspy that lights the in-view landing section
 *  - mobile drawer unfolds with a light stagger rather than popping
 * All motion respects prefers-reduced-motion.
 */
export function MarketingHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [spy, setSpy] = useState<string | null>(null);
  const menuRef = useRef<HTMLElement | null>(null);

  // Elevation + compaction on scroll.
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scrollspy for the landing anchors (route "/" only).
  useEffect(() => {
    if (pathname !== "/") return;
    const targets = ["advantage", "how-it-works"];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setSpy(visible[0].target.id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    );
    targets.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [pathname]);

  // Mobile drawer choreography.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menuOpen || !menu || prefersReducedMotion()) return;
    const items = Array.from(menu.querySelectorAll("[data-menu-item]"));
    gsap.fromTo(
      menu,
      { autoAlpha: 0, y: -6 },
      { autoAlpha: 1, y: 0, duration: 0.28, ease: "power2.out" },
    );
    if (items.length) {
      gsap.fromTo(
        items,
        { autoAlpha: 0, x: -8 },
        { autoAlpha: 1, x: 0, duration: 0.32, stagger: 0.045, ease: "power2.out", delay: 0.06 },
      );
    }
  }, [menuOpen]);

  function isActive(href: string): boolean {
    if (href === "/docs") return pathname.startsWith("/docs");
    return false;
  }

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "border-b border-outline-variant bg-surface-container-lowest/85 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(20,66,37,0.18)] backdrop-blur-md"
          : "border-b border-transparent bg-surface-container-lowest/55 backdrop-blur-sm"
      }`}
    >
      <div
        className={`mx-auto flex w-full max-w-container items-center justify-between px-4 transition-all duration-300 md:px-10 ${
          scrolled ? "h-14" : "h-16"
        }`}
      >
        <Link href="/" aria-label="Emplobo">
          <Image
            src="/logo.png"
            alt="Emplobo"
            width={scrolled ? 116 : 132}
            height={34}
            priority
            className="transition-all duration-300"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Navigasi utama">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            const spied = link.anchor !== null && spy === link.anchor;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`group relative pb-1 pt-1 font-label-caps text-label-caps transition-colors ${
                  active
                    ? "font-bold text-primary"
                    : spied
                      ? "font-bold text-primary"
                      : "text-on-surface-variant hover:text-primary"
                }`}
              >
                {link.label}
                <span
                  aria-hidden
                  className={`absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary transition-transform duration-300 ${
                    active || spied ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <SignedOut>
            <SignInButton mode="redirect">
              <button
                type="button"
                className="font-label-caps text-label-caps text-on-surface-variant transition-colors hover:text-primary"
              >
                MASUK
              </button>
            </SignInButton>
            <Link
              href="/sign-up"
              className="group inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary shadow-sm transition-all duration-300 hover:bg-primary-container hover:shadow-[0_8px_20px_-8px_rgba(20,66,37,0.5)] active:translate-y-px"
            >
              MULAI GRATIS
              <svg
                className="transition-transform duration-300 group-hover:translate-x-0.5"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/app"
              className="group inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary shadow-sm transition-all duration-300 hover:bg-primary-container hover:shadow-[0_8px_20px_-8px_rgba(20,66,37,0.5)] active:translate-y-px"
            >
              BUKA APP
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
                aria-hidden
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>

          {/* Mobile menu toggle */}
          <button
            type="button"
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-container-low hover:text-primary md:hidden"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {menuOpen ? (
                <>
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </>
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h10" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Scroll progress — only while the page scrolls */}
      {scrolled ? <ScrollProgressBar /> : null}

      {/* Mobile dropdown menu */}
      {menuOpen ? (
        <nav
          ref={menuRef}
          className="border-t border-outline-variant bg-surface-container-lowest px-4 py-3 shadow-[0_16px_32px_-16px_rgba(20,66,37,0.2)] md:hidden"
          aria-label="Navigasi utama"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                data-menu-item
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 font-body-md text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}