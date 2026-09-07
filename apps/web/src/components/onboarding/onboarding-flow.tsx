"use client";

import { CreateOrganization, useOrganizationList, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { EASE_OUT, gsap, prefersReducedMotion } from "@/lib/motion";

type Step = "auto" | "choose" | "create" | "join" | "select";

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-6 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M19 12H5" />
        <path d="m11 18-6-6 6-6" />
      </svg>
      Kembali
    </button>
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const { user } = useUser();
  const { isLoaded, userInvitations, userMemberships, setActive } = useOrganizationList({
    userMemberships: true,
    userInvitations: true,
  });
  const [step, setStep] = useState<Step>("auto");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const pendingInvitations = (userInvitations.data ?? []).filter(
    (inv) => inv.status === "pending",
  );
  const memberships = userMemberships.data ?? [];

  // Decide the entry step from the user's actual state instead of asking:
  // an employee who already has a pending invitation is routed straight to
  // accepting it; someone already in a business is offered that business.
  // The "create organization" screen is only reachable through the explicit
  // owner/HR choice — never a default landing for confused employees.
  const effectiveStep =
    !isLoaded || step !== "auto"
      ? step
      : pendingInvitations.length > 0
        ? "join"
        : memberships.length > 0
          ? "select"
          : "choose";

  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  // GSAP choreography: on first load and on every step change, the card's
  // top-level blocks (icon, heading, then the interactive rows) rise in
  // sequence. Honors prefers-reduced-motion — content stays visible.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el || !isLoaded) return;
    if (prefersReducedMotion()) return;
    const items = Array.from(el.children) as HTMLElement[];
    if (items.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        items,
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.06, ease: EASE_OUT },
      );
    }, el);
    return () => ctx.revert();
  }, [isLoaded, effectiveStep]);

  const handleJoin = async (invitation: NonNullable<typeof userInvitations.data>[number]) => {
    setBusyId(invitation.id);
    setError(null);
    try {
      await invitation.accept();
      router.push("/app");
      router.refresh();
    } catch {
      setError("Gagal menerima undangan. Silakan coba lagi.");
      setBusyId(null);
    }
  };

  const handleSelect = async (orgId: string) => {
    setBusyId(orgId);
    setError(null);
    try {
      await setActive?.({ organization: orgId });
      router.push("/app");
      router.refresh();
    } catch {
      setError("Gagal memilih bisnis. Silakan coba lagi.");
      setBusyId(null);
    }
  };

  return (
    <div
      ref={cardRef}
      className="w-full max-w-lg rounded-lg border border-outline-variant bg-surface-container-lowest p-6 text-center shadow-sm sm:p-8 md:p-10"
    >
      {!isLoaded ? (
          <div role="status" aria-label="Memuat" className="mx-auto flex max-w-xs flex-col items-center py-8">
            <div className="h-14 w-14 animate-pulse rounded-full bg-surface-container-high" />
            <div className="mt-5 h-5 w-44 animate-pulse rounded bg-surface-container-high" />
            <div className="mt-3 h-4 w-64 animate-pulse rounded bg-surface-container-high" />
            <span className="sr-only">Memuat…</span>
          </div>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-container">
              <span className="material-symbols-outlined ms-fill text-[28px] text-on-primary-container">
                {effectiveStep === "create" ? "add_business" : effectiveStep === "join" ? "mail" : "storefront"}
              </span>
            </div>

            {effectiveStep === "auto" || effectiveStep === "choose" ? (
              <>
                <h1 className="mt-5 font-headline-sm text-headline-sm text-balance text-on-surface">
                  Mulai di Emplobo
                </h1>
                <p className="mt-2 font-body-md text-body-md text-pretty text-on-surface-variant">
                  Pilih cara masuk: sebagai karyawan yang diundang, atau sebagai pemilik
                  yang mendaftarkan bisnisnya.
                </p>
              </>
            ) : effectiveStep === "join" ? (
              <>
                <h1 className="mt-5 font-headline-sm text-headline-sm text-balance text-on-surface">
                  Anda diundang bergabung
                </h1>
                <p className="mt-2 font-body-md text-body-md text-pretty text-on-surface-variant">
                  Pemilik bisnis sudah mengirim undangan belajar untuk Anda.
                  Terima untuk mulai onboarding.
                </p>
              </>
            ) : effectiveStep === "select" ? (
              <>
                <h1 className="mt-5 font-headline-sm text-headline-sm text-balance text-on-surface">
                  Pilih bisnis Anda
                </h1>
                <p className="mt-2 font-body-md text-body-md text-pretty text-on-surface-variant">
                  Anda sudah terdaftar di bisnis berikut. Pilih untuk melanjutkan.
                </p>
              </>
            ) : (
              <>
                <h1 className="mt-5 font-headline-sm text-headline-sm text-balance text-on-surface">
                  Daftarkan bisnis Anda
                </h1>
                <p className="mt-2 font-body-md text-body-md text-pretty text-on-surface-variant">
                  Buat organisasi UMKM Anda, lalu latih AI untuk peran-peran di dalamnya.
                </p>
              </>
            )}

            {effectiveStep === "choose" ? (
              <div className="mt-8 grid gap-4">
                <button
                  type="button"
                  onClick={() => setStep("join")}
                  className="group flex w-full cursor-pointer items-center gap-3.5 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:items-start sm:gap-4 sm:p-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container transition-transform duration-300 group-hover:scale-105 sm:h-11 sm:w-11">
                    <span className="material-symbols-outlined ms-fill text-[20px] text-on-primary-container sm:text-[22px]">
                      badge
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block font-headline-sm text-[15px] text-on-surface sm:text-[16px]">
                      Saya karyawan / diundang belajar
                    </span>
                    <span className="mt-1 block font-body-md text-body-md text-on-surface-variant">
                      Saya sudah diundang oleh pemilik. Saya hanya perlu menerima undangan
                      dan mulai belajar.
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep("create")}
                  className="group flex w-full cursor-pointer items-center gap-3.5 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:items-start sm:gap-4 sm:p-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container transition-transform duration-300 group-hover:scale-105 sm:h-11 sm:w-11">
                    <span className="material-symbols-outlined ms-fill text-[20px] text-on-primary-container sm:text-[22px]">
                      add_business
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block font-headline-sm text-[15px] text-on-surface sm:text-[16px]">
                      Saya pemilik / HR
                    </span>
                    <span className="mt-1 block font-body-md text-body-md text-on-surface-variant">
                      Saya mendaftarkan bisnis saya sendiri untuk melatih AI.
                    </span>
                  </span>
                </button>
              </div>
            ) : null}

            {effectiveStep === "join" && pendingInvitations.length > 0 ? (
              <>
                <div className="mt-8 grid gap-3 text-left">
                  {pendingInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5"
                    >
                      <div className="min-w-0 break-words">
                        <p className="font-headline-sm text-[16px] text-on-surface">
                          {inv.publicOrganizationData.name}
                        </p>
                        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                          Undangan belajar dari pemilik bisnis
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => handleJoin(inv)}
                        className="w-full shrink-0 cursor-pointer rounded-lg bg-primary px-4 py-3 font-label-md text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2.5"
                      >
                        {busyId === inv.id ? "Menerima…" : "Terima"}
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-4 font-body-sm text-body-sm text-on-surface-variant">
                  Setelah menerima, Anda akan diarahkan ke materi pelatihan Anda.
                </p>
              </>
            ) : null}

            {effectiveStep === "join" && pendingInvitations.length === 0 ? (
              <div className="mt-8 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-left">
                <p className="font-label-caps text-label-caps text-secondary">
                  BELUM ADA UNDANGAN MASUK
                </p>
                <p className="mt-2 font-body-md text-body-md text-pretty text-on-surface">
                  Belum ada undangan untuk {email || "email Anda"}.
                </p>
                <p className="mt-2 font-body-sm text-body-sm text-pretty text-on-surface-variant">
                  Pemilik bisnis perlu mengirim undangan lewat dashboard Emplobo ke email
                  tersebut. Setelah undangan terkirim, cek email Anda dan buka link
                  undangannya. Undangan yang masuk akan muncul di sini.
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-4 cursor-pointer rounded-lg py-2 font-label-md text-label-md text-primary underline-offset-4 hover:underline"
                >
                  Periksa lagi
                </button>
              </div>
            ) : null}

            {effectiveStep === "select" && memberships.length > 0 ? (
              <>
                <div className="mt-8 grid gap-3 text-left">
                  {memberships.map((membership) => (
                    <div
                      key={membership.id}
                      className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5"
                    >
                      <div className="min-w-0 break-words">
                        <p className="font-headline-sm text-[16px] text-on-surface">
                          {membership.organization.name}
                        </p>
                        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                          {membership.role === "org:admin" ? "Pemilik / HR" : "Karyawan"}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => handleSelect(membership.organization.id)}
                        className="w-full shrink-0 cursor-pointer rounded-lg bg-primary px-4 py-3 font-label-md text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2.5"
                      >
                        {busyId === membership.organization.id ? "Membuka…" : "Pilih"}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {error ? (
              <p className="mt-4 font-body-sm text-body-sm text-error" role="alert">
                {error}
              </p>
            ) : null}

            {effectiveStep === "create" ? (
              <div className="mt-8 [&_.cl-cardRoot]:mx-auto [&_.cl-cardRoot]:w-full [&_.cl-cardRoot]:max-w-md [&_.cl-cardRoot]:text-left">
                <CreateOrganization afterCreateOrganizationUrl="/app" />
                <BackLink onClick={() => setStep("choose")} />
              </div>
            ) : null}

            {effectiveStep === "join" || effectiveStep === "select" ? (
              <div className="mt-6 border-t border-outline-variant pt-4">
                <button
                  type="button"
                  onClick={() => setStep("create")}
                  className="cursor-pointer rounded-lg px-2 py-2 font-label-md text-label-md text-on-surface-variant underline-offset-4 hover:text-primary hover:underline"
                >
                  Saya pemilik bisnis, daftarkan bisnis saya
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
  );
}