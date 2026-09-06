"use client";

import { CreateOrganization, OrganizationList } from "@clerk/nextjs";
import { useState } from "react";
import { Reveal } from "@/components/motion/reveal";

type Step = "choose" | "create" | "join";

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
  const [step, setStep] = useState<Step>("choose");

  return (
    <Reveal y={18} duration={0.7}>
      <div className="w-full max-w-lg rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-sm md:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-container">
          <span className="material-symbols-outlined ms-fill text-[28px] text-on-primary-container">
            storefront
          </span>
        </div>
        <h1 className="mt-5 font-headline-sm text-headline-sm text-on-surface">
          Mulai di Emplobo
        </h1>
        <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
          Apakah Anda pemilik bisnis atau karyawan yang baru diundang untuk belajar?
        </p>

        {step === "choose" ? (
          <div className="mt-8 grid gap-4">
            <button
              type="button"
              onClick={() => setStep("create")}
              className="group flex w-full cursor-pointer items-start gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-container transition-transform duration-300 group-hover:scale-105">
                <span className="material-symbols-outlined ms-fill text-[22px] text-on-primary-container">
                  add_business
                </span>
              </span>
              <span className="min-w-0">
                <span className="block font-headline-sm text-[16px] text-on-surface">
                  Saya pemilik bisnis
                </span>
                <span className="mt-1 block font-body-md text-body-md text-on-surface-variant">
                  Buat organisasi UMKM Anda, lalu latih AI untuk peran-peran di
                  dalamnya.
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStep("join")}
              className="group flex w-full cursor-pointer items-start gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-container transition-transform duration-300 group-hover:scale-105">
                <span className="material-symbols-outlined ms-fill text-[22px] text-on-primary-container">
                  badge
                </span>
              </span>
              <span className="min-w-0">
                <span className="block font-headline-sm text-[16px] text-on-surface">
                  Saya karyawan / diundang
                </span>
                <span className="mt-1 block font-body-md text-body-md text-on-surface-variant">
                  Pilih bisnis yang mengundang saya untuk memulai onboarding.
                </span>
              </span>
            </button>
          </div>
        ) : null}

        {step === "create" ? (
          <div className="mt-8 [&_.cl-cardRoot]:mx-auto [&_.cl-cardRoot]:w-full [&_.cl-cardRoot]:max-w-md [&_.cl-cardRoot]:text-left">
            <p className="mb-4 font-label-caps text-label-caps text-secondary">
              BUAT ORGANISASI BISNIS
            </p>
            <CreateOrganization afterCreateOrganizationUrl="/app" />
            <BackLink onClick={() => setStep("choose")} />
          </div>
        ) : null}

        {step === "join" ? (
          <div className="mt-8">
            <p className="mb-4 font-label-caps text-label-caps text-secondary">
              PILIH ORGANISASI BISNIS
            </p>
            <div className="[&_.cl-organizationList]:mx-auto [&_.cl-organizationList]:w-full [&_.cl-organizationList]:max-w-md [&_.cl-organizationList]:text-left">
              <OrganizationList
                hidePersonal
                afterSelectOrganizationUrl="/app"
                afterCreateOrganizationUrl="/app"
              />
            </div>
            <p className="mt-4 font-body-sm text-body-sm text-on-surface-variant">
              Tidak melihat bisnis Anda? Pemilik perlu mengirim undangan ke email
              ini lewat dashboard atau Clerk.
            </p>
            <BackLink onClick={() => setStep("choose")} />
          </div>
        ) : null}
      </div>
    </Reveal>
  );
}