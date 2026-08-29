import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-5 py-20 text-center">
      <p className="font-data-point text-data-point text-secondary">ERROR 404</p>
      <h1 className="font-headline-sm text-headline-sm text-on-surface">
        Halaman tidak ditemukan
      </h1>
      <p className="max-w-md font-body-md text-body-md text-on-surface-variant">
        Halaman yang Anda cari tidak ditemukan di dalam aplikasi.
      </p>
      <Link
        href="/app"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        DASHBOARD
      </Link>
    </div>
  );
}
