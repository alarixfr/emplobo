import Image from "next/image";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import {
  BookOpenIcon,
  BotIcon,
  GraduationCapIcon,
  LayersIcon,
} from "@/components/icons";

const STEPS = [
  {
    icon: LayersIcon,
    title: "Buat role kerja",
    desc: "Kasir, barista, admin gudang — definisikan peran yang perlu dilatih.",
  },
  {
    icon: BotIcon,
    title: "Latih AI sekali",
    desc: "Ajarkan SOP dan know-how lewat chat. AI menilai kesiapan materinya sendiri.",
  },
  {
    icon: GraduationCapIcon,
    title: "AI mengajar karyawan",
    desc: "Setiap karyawan baru dapat panduan, kuis, dan tutor AI 24/7 tanpa HR mengulang.",
  },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--brand-muted)_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_left,_#ffedd5_0%,_transparent_50%)]"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Image
          src="/logo.png"
          alt="Emplobo"
          width={160}
          height={40}
          priority
        />
        <nav className="flex items-center gap-3">
          <SignedOut>
            <SignInButton mode="redirect">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Masuk
              </button>
            </SignInButton>
            <Link
              href="/sign-up"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
            >
              Daftar
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/app"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
            >
              Buka App
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </nav>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-24 pt-10 md:pt-16">
        <section className="flex min-h-[62vh] flex-col justify-center">
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Latih AI sekali dengan SOP bisnis Anda — AI mengajari karyawan{" "}
            <span className="text-brand">tanpa batas, 24/7.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Otak SDM untuk UMKM. Satu bisnis, satu AI business brain yang
            mengubah pengetahuan pemilik usaha menjadi program pelatihan untuk
            seluruh karyawan.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <SignedOut>
              <Link
                href="/sign-up"
                className="rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
              >
                Mulai gratis
              </Link>
              <Link
                href="/sign-in"
                className="rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Sudah punya akun
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/app"
                className="rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
              >
                Lanjut ke dashboard
              </Link>
            </SignedIn>
          </div>
        </section>

        <section className="mt-20 grid gap-8 border-t border-border pt-14 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.title}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-muted text-brand">
                <step.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
                {step.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {step.desc}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-20 flex flex-col items-start justify-between gap-6 rounded-2xl border border-border bg-card p-8 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
              <BookOpenIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                Panduan SOP siap pakai dalam hitungan menit
              </h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Begitu materi dirasa cukup, AI menyusun panduan ber-bab dengan
                kuis untuk mengukur pemahaman setiap karyawan.
              </p>
            </div>
          </div>
          <SignedOut>
            <Link
              href="/sign-up"
              className="shrink-0 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
            >
              Coba gratis
            </Link>
          </SignedOut>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Emplobo — Otak SDM untuk UMKM Indonesia.
          </p>
          <p className="text-xs text-muted-foreground">
            Dibangun untuk ITechno Cup 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
