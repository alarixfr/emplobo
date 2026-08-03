import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-4xl font-semibold text-foreground">
        404
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Halaman yang Anda cari tidak ditemukan atau telah dipindahkan.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
      >
        Kembali ke beranda
      </Link>
    </div>
  );
}
