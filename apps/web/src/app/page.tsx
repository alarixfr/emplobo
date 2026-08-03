import Image from "next/image";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

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

      <main className="relative z-10 mx-auto flex min-h-[70vh] w-full max-w-5xl flex-col justify-center px-6 pb-20 pt-8">
        <p className="mb-4 font-display text-5xl font-semibold tracking-tight text-brand sm:text-6xl md:text-7xl">
          Emplobo
        </p>
        <h1 className="max-w-2xl text-2xl font-medium leading-snug text-foreground sm:text-3xl">
          Latih AI sekali dengan SOP bisnis Anda — AI mengajari karyawan tanpa
          batas, 24/7.
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          Otak SDM untuk UMKM. Satu bisnis, satu AI business brain.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
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
      </main>
    </div>
  );
}
