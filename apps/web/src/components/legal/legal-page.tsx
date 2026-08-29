"use client";

import { useEffect, useState } from "react";

export type LegalSection = {
  id: string;
  title: string;
  heading: string;
  paragraphs: string[];
};

function useScrollSpy(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

export function LegalPage({
  title,
  lastUpdated,
  intro,
  sections,
}: {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}) {
  const active = useScrollSpy(sections.map((s) => s.id));

  function go(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="mx-auto w-full max-w-container flex-1 px-4 py-12 md:px-10">
      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        {/* Sticky outline */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <p className="font-label-caps text-label-caps text-secondary">
              DOKUMEN
            </p>
            <h1 className="mt-1 font-headline-sm text-headline-sm text-primary">
              {title}
            </h1>
            <nav className="mt-6 space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => go(section.id)}
                  className={`block w-full rounded-lg px-3 py-2 text-left font-body-sm text-body-sm transition-colors ${
                    active === section.id
                      ? "bg-primary-container font-medium text-on-primary-container"
                      : "text-secondary hover:bg-surface-container-high hover:text-on-surface"
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Article column */}
        <article className="mx-auto w-full max-w-[720px]">
          <div className="rounded-lg border border-slate-200 bg-surface-container-lowest p-6 shadow-sm md:p-10">
            <h1 className="font-headline-md text-headline-md text-primary">
              {title}
            </h1>
            <p className="mt-3 font-body-lg text-body-lg text-on-surface-variant">
              {intro}
            </p>
            <p className="mt-2 font-data-point text-data-point text-secondary">
              Terakhir diperbarui: {lastUpdated}
            </p>

            <div className="mt-8 space-y-10">
              {sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <h2 className="font-headline-sm text-headline-sm text-primary">
                    {section.heading}
                  </h2>
                  <div className="mt-3 space-y-3">
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
