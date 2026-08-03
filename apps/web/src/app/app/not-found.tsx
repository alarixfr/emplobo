import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 py-20 text-center">
      <h1 className="font-display text-4xl font-semibold text-foreground">
        404
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Halaman tidak ditemukan di dalam aplikasi.
      </p>
      <Link
        href="/app"
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
      >
        Kembali ke dashboard
      </Link>
    </div>
  );
}
