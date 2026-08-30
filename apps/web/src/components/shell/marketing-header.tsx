"use client";

import { UserButton } from "@clerk/nextjs";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/#advantage", label: "Platform" },
  { href: "/#how-it-works", label: "Cara Kerja" },
  { href: "/docs", label: "Docs" },
];

/**
 * Reference marketing TopNavBar — sticky h-16, label-caps links, the active
 * link in bold primary with a 2px primary underline. On mobile the links
 * collapse behind a hamburger menu.
 */
export function MarketingHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(href: string): boolean {
    if (href === "/docs") return pathname.startsWith("/docs");
    // Anchor links (/#advantage) can never match a pathname — only highlight
    // real routes.
    return false;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant bg-surface-container-lowest/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-container items-center justify-between px-4 md:px-10">
        <Link href="/" aria-label="Emplobo">
          <Image src="/logo.png" alt="Emplobo" width={132} height={34} priority />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`font-label-caps text-label-caps border-b-2 pb-1 pt-1 transition-colors ${
                  active
                    ? "border-primary font-bold text-primary"
                    : "border-transparent text-on-surface-variant hover:text-primary"
                }`}
              >
                {link.label}
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
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
            >
              MULAI GRATIS
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/app"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
            >
              BUKA APP
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
            <span className="material-symbols-outlined">
              {menuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen ? (
        <nav className="border-t border-outline-variant bg-surface-container-lowest px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 font-body-md text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
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
