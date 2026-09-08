"use client";

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { BorderGlow } from "@/components/ui/border-glow";
import KineticGrid from "@/components/ui/kinetic-grid";
import { EASE_OUT, gsap, prefersReducedMotion } from "@/lib/motion";

/** Characters of a typewriter line; each is a span so GSAP can stagger them. */
function split(text: string): string[] {
  return Array.from(text);
}

const AI_LINES = [
  "Belum ada celah di materi: bagaimana SOP menutup mesin espresso di akhir shift?",
  "Tercatat. Bagaimana penghitungan stok susu dan bean setiap pagi?",
];

const ADMIN_LINE = "Backflush tiap group head 10 detik, ulangi 5x, lalu keringkan portafilter.";

const HERO_LINE_1 = "Skalakan pengetahuan bisnis";
const HERO_LINE_2_HEAD = "dengan ";
const HERO_LINE_2_TAIL = "AI.";

/**
 * Landing hero — light KineticGrid canvas (white bg, brand-green ink) as the
 * stage; one authored sequence on top: the training chat types itself, its
 * admin replies, three role cards slide in, and the readiness ring draws to
 * 65% as the numbers count up. Scrolling past the hero moves it on a subtle
 * parallax. Reduced motion skips to the final state. The grid responds to
 * cursor and click from anywhere.
 */
export function LandingHero() {
  const scopeRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;
    const reduced = prefersReducedMotion();

    const ctx = gsap.context(() => {
      if (reduced) return;

      // Readiness ring target: r=40 → circumference ≈ 251.2, 65% leaves
      // dashoffset 87.92 (mirrors the palette of the real readiness ring).
      const CIRC = 251.2;
      const TARGET_OFFSET = CIRC * (1 - 0.65);

      const countSpan = scope.querySelector<HTMLElement>(".ring-count");
      const ringArc = scope.querySelector<SVGCircleElement>(".ring-arc");

      function typeText(el: HTMLElement): gsap.core.Tween[] {
        const chars = Array.from(el.querySelectorAll<HTMLElement>(".type-char"));
        gsap.set(chars, { autoAlpha: 0 });
        return [
          gsap.fromTo(
            chars,
            { autoAlpha: 0, y: 5 },
            { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.018, ease: "power2.out" },
          ),
        ];
      }

      function caretIn(el: HTMLElement) {
        const caret = el.querySelector<HTMLElement>(".type-caret");
        if (!caret) return;
        gsap.fromTo(
          caret,
          { autoAlpha: 1 },
          { autoAlpha: 0.25, duration: 0.4, repeat: 5, yoyo: true, ease: "power2.inOut" },
        );
      }

      // Show each AI bubble, blink a caret, then type its text in.
      function animateBubble(bubble: HTMLElement): gsap.core.Timeline {
        const tl = gsap.timeline({ defaults: { ease: EASE_OUT } });
        tl.fromTo(bubble, { autoAlpha: 0, y: 14, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5 })
          .add(() => caretIn(bubble), "-=0.05")
          .add(() => {
            if (bubble.dataset.role === "ai") {
              typeText(bubble).forEach((t) => tl.add(t, "<+0.15"));
            }
          }, "-=0.1");
        return tl;
      }

      const chat: gsap.core.Timeline = gsap.timeline({ defaults: { ease: EASE_OUT } });
      const bubbles = Array.from(scope.querySelectorAll<HTMLElement>(".chat-bubble"));
      bubbles.forEach((bubble, index) => {
        const tween = animateBubble(bubble);
        const roleCard = scope.querySelector<HTMLElement>(`.role-card[data-index="${index}"]`);
        chat.add(tween, index === 0 ? undefined : "<+0.18");
        if (roleCard) chat.add(gsap.fromTo(roleCard, { autoAlpha: 0, x: -18 }, { autoAlpha: 1, x: 0, duration: 0.55 }), "<+0.05");
      });

      // Ring draws + counter climbs alongside the typed conversation.
      const ringCounter = { value: 0 };
      const ringTl = gsap.timeline({ defaults: { ease: "power2.inOut" } });
      if (ringArc) ringTl.fromTo(ringArc, { strokeDashoffset: CIRC }, { strokeDashoffset: TARGET_OFFSET, duration: 1.6 }, 0);
      if (countSpan) {
        ringTl.to(
          ringCounter,
          {
            value: 65,
            duration: 1.6,
            ease: "power2.out",
            onUpdate: () => {
              countSpan.textContent = `${Math.round(ringCounter.value)}%`;
            },
          },
          0,
        );
      }
      ringTl.fromTo(".ring-label", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.3);

      // ── Entrance choreography ──
      const intro = gsap.timeline({ defaults: { ease: EASE_OUT } });
      intro
        .from(".hero-line", { autoAlpha: 0, y: 26, duration: 0.7, stagger: 0.09 }, 0.05)
        .fromTo(".hero-underline", { strokeDasharray: 220, strokeDashoffset: 220 }, { strokeDashoffset: 0, duration: 0.7, ease: "power2.inOut" }, 0.62)
        .from(".hero-sub", { autoAlpha: 0, y: 16, duration: 0.55 }, "-=0.35")
        .from(".hero-ctas", { autoAlpha: 0, y: 12, duration: 0.45 }, "-=0.3")
        .fromTo(".cockpit", { autoAlpha: 0, y: 30, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: "power2.out" }, "-=0.2")
        .add(chat, "-=0.35")
        .add(ringTl, "<0.05");

      // ── Scroll parallax: hero yields as it leaves the viewport ──
      const parallax = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: scope,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
      parallax
        .to(".hero-copy", { y: -46, autoAlpha: 0.4, duration: 1 }, 0)
        .to(".cockpit", { y: -70, scale: 0.96, duration: 1 }, 0);
    }, scope);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={scopeRef} className="relative isolate overflow-hidden bg-surface-muted">
      {/* KineticGrid — the interactive canvas (white background, brand-green ink) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <KineticGrid globalColor="light" />
      </div>

      {/* Legibility vignette — deepens edges while the grid stays alive in the middle */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(120% 95% at 50% 8%, transparent 42%, rgba(20,66,37,0.06) 100%)",
        }}
      />

      <div className="hero-copy relative z-10 mx-auto w-full max-w-container px-4 pb-10 pt-16 text-center md:px-10 md:pt-20">
        <h1 className="mx-auto max-w-4xl font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">
          <span className="hero-line block">{HERO_LINE_1}</span>
          <span className="hero-line block">
            {HERO_LINE_2_HEAD}
            <span className="relative inline-block italic text-primary">
              {HERO_LINE_2_TAIL}
              <svg
                className="absolute -bottom-1.5 left-0 w-full"
                viewBox="0 0 120 10"
                preserveAspectRatio="none"
                aria-hidden
              >
                <path
                  className="hero-underline"
                  d="M4 7c22-4 58-5 112-2"
                  stroke="#3b6847"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </span>
          </span>
        </h1>

        <p className="hero-sub mx-auto mt-6 max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
          Emplobo adalah otak SDM untuk UMKM: latih AI sekali dengan SOP bisnis
          Anda, lalu biarkan AI menyambut, melatih, dan mengajar setiap
          karyawan baru tanpa batas, 24/7.
        </p>

        <div className="hero-ctas mt-9 flex flex-wrap items-center justify-center gap-4">
          <SignedOut>
            <Link
              href="/sign-up"
              className="group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 font-label-caps text-label-caps text-on-primary transition-all duration-300 hover:bg-primary-container hover:shadow-[0_8px_24px_-12px_rgba(20,66,37,0.5)] active:translate-y-px"
            >
              MULAI GRATIS
              <svg
                width="16"
                height="16"
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
            <SignInButton mode="redirect">
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-secondary/60 px-6 py-3.5 font-label-caps text-label-caps text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(20,66,37,0.08)] transition-all duration-300 hover:border-secondary hover:bg-surface-container-low hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_12px_-4px_rgba(20,66,37,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-muted active:translate-y-px"
              >
                MASUK
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/app"
              className="group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 font-label-caps text-label-caps text-on-primary transition-all duration-300 hover:bg-primary-container hover:shadow-[0_8px_24px_-12px_rgba(20,66,37,0.5)] active:translate-y-px"
            >
              BUKA APP
              <svg
                width="16"
                height="16"
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
          </SignedIn>
        </div>
      </div>

      {/* ── The cockpit: live product mechanism, animated on load ── */}
      <div className="cockpit mx-auto w-full max-w-4xl px-4 pb-16 md:px-10 md:pb-20">
        <BorderGlow
          edgeSensitivity={10}
          glowColor="136 36 34"
          backgroundColor="#ffffff"
          borderRadius={8}
          glowRadius={58}
          glowIntensity={2.2}
          coneSpread={32}
          fillOpacity={0.65}
          animated={!prefersReducedMotion()}
          colors={["#2d5a3a", "#7cc48f", "#144225"]}
        >
          <div className="flex items-center justify-between rounded-t-[8px] border-b border-outline-variant bg-surface-container-low px-4 py-3">
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-surface-container-highest" />
              <span className="h-2.5 w-2.5 rounded-full bg-surface-container-highest" />
              <span className="h-2.5 w-2.5 rounded-full bg-status-locked/70" />
            </div>
          </div>

          <div className="grid gap-4 p-4 text-left md:grid-cols-12 md:p-6">
            {/* Roles rail */}
            <div className="hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-4 md:col-span-3 md:block">
              <p className="font-label-caps text-label-caps text-secondary">ROLES CONTEXT</p>
              <div className="mt-3 space-y-2">
                {[
                  { name: "Barista", status: "IN PROGRESS", active: true },
                  { name: "Head Barista", status: "DRAFT", active: false },
                  { name: "Kasir", status: "DRAFT", active: false },
                ].map((role, index) => (
                  <div
                    key={role.name}
                    className={`role-card rounded-lg border p-3 ${role.active ? "border-primary ring-1 ring-primary" : "border-outline-variant opacity-60"}`}
                    data-index={index}
                  >
                    <p className="font-data-point text-data-point font-bold text-on-surface">
                      {role.name}
                    </p>
                    <p className="mt-0.5 text-[12px] text-secondary">{role.status}</p>
                    {role.active ? (
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-container-high">
                        <div className="role-bar h-1 rounded-full bg-primary" />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Training chat */}
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 md:col-span-6">
              <div className="flex items-center gap-2">
                <p className="font-headline-sm text-[18px] text-on-surface">Training Room</p>
                <span className="rounded-full border border-outline-variant bg-surface-container-low px-2 py-0.5 font-label-caps text-label-caps text-on-surface-variant">
                  DRAFT
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {AI_LINES.map((line, index) => (
                  <div
                    key={index}
                    className="chat-bubble ai-bubble flex max-w-[88%] items-start gap-2 break-words rounded-2xl rounded-tl-sm p-3 text-sm text-on-surface"
                    data-role="ai"
                  >
                    <span className="type-caret ml-1 mt-0.5 font-data-point text-primary">▍</span>
                    <span className="sr-only">AI bertanya: </span>
                    <span aria-hidden>
                      {split(line).map((char, charIndex) => (
                        <span key={charIndex} className="type-char">
                          {char}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
                <div
                  className="chat-bubble ml-auto flex max-w-[88%] items-start gap-2 break-words rounded-2xl rounded-tr-sm border border-outline-variant bg-surface-container-low p-3 text-sm text-on-surface"
                  data-role="admin"
                >
                  <span className="sr-only">Admin menjawab: </span>
                  <span aria-hidden>{ADMIN_LINE}</span>
                </div>
              </div>
            </div>

            {/* Readiness ring */}
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-center md:col-span-3">
              <p className="font-label-caps text-label-caps text-secondary">BRAIN READINESS</p>
              <div className="mt-3 flex items-center justify-center">
                <div className="relative inline-flex h-24 w-24 items-center justify-center">
                  <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                    <circle
                      className="text-outline-variant"
                      cx="50"
                      cy="50"
                      fill="transparent"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                    />
                    <circle
                      className="ring-arc text-primary"
                      cx="50"
                      cy="50"
                      fill="transparent"
                      r="40"
                      stroke="currentColor"
                      strokeDasharray="251.2"
                      strokeDashoffset="87.92"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="ring-count absolute font-headline-sm text-2xl font-bold text-primary">
                    65%
                  </span>
                </div>
              </div>
              <p className="ring-label mt-3 font-body-sm text-body-sm text-secondary">
                Kelengkapan materi role
              </p>
            </div>
          </div>
        </BorderGlow>
      </div>
    </section>
  );
}