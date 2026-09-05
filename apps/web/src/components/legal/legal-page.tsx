"use client";

import Link from "next/link";
import { useScrollSpy } from "@/lib/use-scroll-spy";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type LegalCrossLink = {
  label: string;
  href: string;
};

/** Smooth-scroll to a section, keeping it clear of the sticky header. */
function go(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function LegalPage({
  title,
  lastUpdated,
  intro,
  sections,
  crossLinks = [],
}: {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
  crossLinks?: LegalCrossLink[];
}) {
  const ids = sections.map((s) => s.id);
  const active = useScrollSpy(ids);

  return (
    <main className="mx-auto w-full max-w-container flex-1 px-4 py-12 md:px-10">
      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        {/* ── Sticky outline (desktop) ─────────────────────────────────── */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-body-sm text-body-sm text-secondary transition-colors hover:text-primary"
            >
              <span className="material-symbols-outlined text-[16px]">
                arrow_back
              </span>
              Beranda
            </Link>
            <p className="mt-6 font-label-caps text-label-caps text-secondary">
              DOKUMEN
            </p>
            <h1 className="mt-1 font-headline-sm text-headline-sm text-primary">
              {title}
            </h1>
            <nav className="mt-6 space-y-1" aria-label="Daftar isi dokumen">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => go(section.id)}
                  aria-current={active === section.id ? "location" : undefined}
                  className={`flex w-full items-baseline gap-3 rounded-lg px-3 py-2 text-left font-body-sm text-body-sm transition-colors ${
                    active === section.id
                      ? "bg-primary-container font-medium text-on-primary-container"
                      : "text-secondary hover:bg-surface-container-high hover:text-on-surface"
                  }`}
                >
                  <span className="font-data-point text-[11px] text-outline">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{section.title}</span>
                </button>
              ))}
            </nav>

            {crossLinks.length > 0 ? (
              <div className="mt-8 border-t border-outline-variant pt-5">
                <p className="font-label-caps text-label-caps text-secondary">
                  DOKUMEN LAIN
                </p>
                <div className="mt-3 space-y-2">
                  {crossLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="inline-flex items-center gap-1.5 font-body-sm text-body-sm text-secondary transition-colors hover:text-primary"
                    >
                      {link.label}
                      <span className="material-symbols-outlined text-[14px]">
                        arrow_forward
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        {/* ── Article column ───────────────────────────────────────────── */}
        <article className="mx-auto w-full max-w-[720px]">
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-sm md:p-10">
            {/* Mobile back + section pills (outline is hidden on mobile) */}
            <div className="flex flex-wrap items-center justify-between gap-3 lg:hidden">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 font-body-sm text-body-sm text-secondary transition-colors hover:text-primary"
              >
                <span className="material-symbols-outlined text-[16px]">
                  arrow_back
                </span>
                Beranda
              </Link>
              {crossLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-label-caps text-label-caps text-primary hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <h1 className="mt-4 font-headline-md text-headline-md text-primary lg:mt-0">
              {title}
            </h1>
            <p className="mt-3 font-body-lg text-body-lg text-on-surface-variant">
              {intro}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="font-data-point text-data-point text-secondary">
                Terakhir diperbarui: {lastUpdated}
              </p>
            </div>

            {/* Mobile section quick-nav — horizontal pills */}
            <nav
              className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-2 lg:hidden"
              aria-label="Lompat ke bagian"
            >
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => go(section.id)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 font-label-caps text-label-caps transition-colors ${
                    active === section.id
                      ? "border-primary bg-primary-container text-on-primary-container"
                      : "border-outline-variant text-secondary hover:border-primary hover:text-primary"
                  }`}
                >
                  {String(index + 1).padStart(2, "0")} · {section.title}
                </button>
              ))}
            </nav>

            <div className="mt-8 space-y-10">
              {sections.map((section, index) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-24"
                >
                  <h2 className="flex items-baseline gap-3 font-headline-sm text-headline-sm text-primary">
                    <span className="font-data-point text-[13px] text-outline">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {section.title}
                  </h2>
                  <div className="mt-4 space-y-4">
                    {section.paragraphs.map((paragraph, idx) => (
                      <p
                        key={idx}
                        className="font-body-md text-body-md leading-7 text-on-surface-variant"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}