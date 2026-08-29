import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { MarketingFooter } from "@/components/shell/marketing-footer";
import { MarketingHeader } from "@/components/shell/marketing-header";

const ADVANTAGES = [
  {
    icon: "model_training",
    title: "Latih Sekali",
    desc: "Owner/HR menuangkan SOP dan know-how ke AI Business Brain lewat chat — sekali saja, per role.",
  },
  {
    icon: "trending_up",
    title: "Skala Tanpa Batas",
    desc: "Setiap karyawan baru langsung mendapat panduan, kuis, dan tutor AI. Tanpa HR mengulang materi.",
  },
  {
    icon: "verified_user",
    title: "Konsistensi Terjamin",
    desc: "AI tutor di-grounding ketat pada materi yang benar-benar diajarkan — tidak ada prosedur yang dikarang.",
  },
];

const STEPS = [
  {
    num: "01",
    tone: "primary" as const,
    title: "Buat role kerja",
    desc: "Kasir, Barista, Waiter — definisikan peran yang perlu dilatih di bisnis Anda.",
  },
  {
    num: "02",
    tone: "ai" as const,
    title: "AI mengekstrak pengetahuan",
    desc: "Chat dengan AI Brain. Ia mengajukan pertanyaan yang tepat, menilai kelengkapan 0–100 secara mandiri.",
  },
  {
    num: "03",
    tone: "ready" as const,
    title: "AI mengajar karyawan",
    desc: "Guide ber-bab + kuis + AI Tutor 24/7 untuk seluruh karyawan yang ditugaskan.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <MarketingHeader />

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-container px-4 pb-16 pt-16 text-center md:px-10 md:pt-24">
          <h1 className="mx-auto max-w-4xl font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">
            Skalakan pengetahuan bisnis Anda dengan AI.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
            Emplobo adalah otak SDM untuk UMKM: latih AI sekali dengan SOP
            bisnis Anda, lalu biarkan AI meng-onboard dan mengajar setiap
            karyawan — tanpa batas, 24/7.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <SignedOut>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
              >
                MULAI GRATIS
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </Link>
              <SignInButton mode="redirect">
                <button
                  type="button"
                  className="inline-flex items-center rounded-lg border border-secondary px-6 py-3.5 font-label-caps text-label-caps text-secondary transition-colors hover:bg-surface-container-low"
                >
                  MASUK
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
              >
                BUKA DASHBOARD
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </Link>
            </SignedIn>
          </div>

          {/* Product frame */}
          <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-1.5 border-b border-outline-variant bg-surface-container-low px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-surface-container-highest" />
              <span className="h-2.5 w-2.5 rounded-full bg-surface-container-highest" />
              <span className="h-2.5 w-2.5 rounded-full bg-surface-container-highest" />
            </div>
            <div className="grid gap-4 p-4 text-left md:grid-cols-12 md:p-6">
              <div className="hidden rounded-xl border border-slate-200 bg-surface-container-lowest p-4 md:col-span-3 md:block">
                <p className="font-label-caps text-label-caps text-secondary">
                  ROLES CONTEXT
                </p>
                <div className="mt-3 space-y-2">
                  {["Barista", "Head Barista", "Kasir"].map((r, i) => (
                    <div
                      key={r}
                      className={`rounded-lg border p-3 ${
                        i === 0
                          ? "border-primary ring-1 ring-primary"
                          : "border-slate-200"
                      }`}
                    >
                      <p className="font-data-point text-data-point font-bold text-on-surface">
                        {r}
                      </p>
                      <p className="mt-0.5 text-[12px] text-secondary">
                        {i === 0 ? "In Progress" : "Draft"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-surface-container-lowest p-4 md:col-span-6">
                <div className="flex items-center gap-2">
                  <p className="font-headline-sm text-[18px] text-on-surface">
                    Training Room
                  </p>
                  <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 font-label-caps text-label-caps text-gray-700">
                    DRAFT
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-ai-border bg-ai-accent p-3 text-sm text-on-surface">
                    Bagaimana urutan prosedur menutup espresso machine di akhir
                    shift?
                  </div>
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm border border-slate-200 bg-white p-3 text-sm text-on-surface">
                    Backflush tiap group head dengan cafiza 10 detik, ulangi 5x…
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-ai-border bg-ai-accent p-3 text-sm text-on-surface">
                    Tercatat. Bagaimana penghitungan stok susu dan bean?
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-surface-container-lowest p-4 text-center md:col-span-3">
                <p className="font-label-caps text-label-caps text-secondary">
                  BRAIN READINESS
                </p>
                <div className="mt-3 flex items-center justify-center">
                  <div className="relative inline-flex h-24 w-24 items-center justify-center">
                    <svg
                      className="h-full w-full -rotate-90 transform"
                      viewBox="0 0 100 100"
                    >
                      <circle
                        className="text-slate-200"
                        cx="50"
                        cy="50"
                        fill="transparent"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                      />
                      <circle
                        className="text-primary"
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
                    <span className="absolute font-headline-sm text-2xl font-bold text-primary">
                      65%
                    </span>
                  </div>
                </div>
                <p className="mt-3 font-body-sm text-body-sm text-secondary">
                  Kelengkapan materi role
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Trust bar ────────────────────────────────────────────────── */}
        <section className="border-y border-outline-variant bg-surface-container-lowest">
          <div className="mx-auto flex w-full max-w-container flex-col items-center gap-4 px-4 py-8 md:px-10">
            <p className="font-label-caps text-label-caps text-secondary">
              DIPERCAYA UNTUK PELATIHAN TIM UMKM
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 font-headline-sm text-lg font-semibold text-outline">
              Kedai Kopi Nusantara · Warung Rasa · Toko Bangunan Jaya · Laundry
              Kiloan Bersih · Bengkel Motor Aman
            </div>
          </div>
        </section>

        {/* ── The Emplobo Advantage ────────────────────────────────────── */}
        <section
          id="advantage"
          className="mx-auto w-full max-w-container px-4 py-16 md:px-10 md:py-24"
        >
          <p className="text-center font-label-caps text-label-caps text-secondary">
            KEUNGGULAN EMPLOBO
          </p>
          <h2 className="mt-3 text-center font-headline-md text-headline-md text-primary">
            Dibangun untuk pertumbuhan jangka panjang
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {ADVANTAGES.map((adv) => (
              <div
                key={adv.title}
                className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 transition-colors hover:bg-surface-bright"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container">
                  <span className="material-symbols-outlined ms-fill text-on-primary-container">
                    {adv.icon}
                  </span>
                </div>
                <h3 className="mt-5 font-headline-sm text-headline-sm text-primary">
                  {adv.title}
                </h3>
                <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
                  {adv.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it Works ─────────────────────────────────────────────── */}
        <section
          id="how-it-works"
          className="border-t border-outline-variant bg-surface-container-lowest"
        >
          <div className="mx-auto w-full max-w-container px-4 py-16 md:px-10 md:py-24">
            <p className="text-center font-label-caps text-label-caps text-secondary">
              CARA KERJA
            </p>
            <h2 className="mt-3 text-center font-headline-md text-headline-md text-primary">
              Tiga langkah, dari know-how ke tim yang siap
            </h2>

            <div className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
              <div
                aria-hidden
                className="absolute left-[16%] right-[16%] top-6 hidden h-0.5 bg-outline-variant md:block"
              />
              {STEPS.map((step) => {
                const tone =
                  step.tone === "primary"
                    ? "bg-primary text-on-primary"
                    : step.tone === "ai"
                      ? "border border-ai-border bg-ai-accent text-primary"
                      : "bg-status-ready text-white";
                return (
                  <div key={step.num} className="relative text-center">
                    <div
                      className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full font-data-point text-data-point font-bold ${tone}`}
                    >
                      {step.num}
                    </div>
                    <h3 className="mt-5 font-headline-sm text-headline-sm text-on-surface">
                      {step.title}
                    </h3>
                    <p className="mx-auto mt-2 max-w-xs font-body-md text-body-md text-on-surface-variant">
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-container px-4 py-16 md:px-10 md:py-24">
          <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-outline-variant bg-primary p-8 md:flex-row md:items-center md:p-12">
            <div className="flex items-start gap-5">
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-container sm:flex">
                <span className="material-symbols-outlined ms-fill text-on-primary-container">
                  auto_stories
                </span>
              </div>
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-primary">
                  Panduan SOP siap pakai dalam hitungan menit
                </h2>
                <p className="mt-2 max-w-xl font-body-md text-body-md text-on-primary-container">
                  Begitu materi dirasa cukup, AI menyusun panduan ber-bab
                  lengkap dengan kuis untuk mengukur pemahaman setiap karyawan.
                </p>
              </div>
            </div>
            <SignedOut>
              <Link
                href="/sign-up"
                className="shrink-0 rounded-lg bg-on-primary px-6 py-3 font-label-caps text-label-caps text-primary transition-colors hover:bg-primary-fixed"
              >
                COBA GRATIS
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/app"
                className="shrink-0 rounded-lg bg-on-primary px-6 py-3 font-label-caps text-label-caps text-primary transition-colors hover:bg-primary-fixed"
              >
                BUKA APP
              </Link>
            </SignedIn>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
