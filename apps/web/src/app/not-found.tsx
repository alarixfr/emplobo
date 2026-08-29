import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-surface-muted px-6 text-center">
      <p className="font-data-point text-data-point text-secondary">ERROR 404</p>
      <h1 className="font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">
        Halaman tidak ditemukan
      </h1>
      <p className="max-w-md font-body-md text-body-md text-on-surface-variant">
        Halaman yang Anda cari tidak ditemukan atau telah dipindahkan.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        KEMBALI KE BERANDA
      </Link>
    </div>
  );
}
