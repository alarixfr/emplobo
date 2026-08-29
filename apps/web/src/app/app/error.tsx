"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[emplobo/app] route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-5 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error-container">
        <span className="material-symbols-outlined text-[28px] text-on-error-container">
          error
        </span>
      </div>
      <h1 className="font-headline-sm text-headline-sm text-on-surface">
        Terjadi kesalahan
      </h1>
      <p className="max-w-md font-body-md text-body-md text-on-surface-variant">
        Gagal memuat bagian aplikasi ini. Coba lagi, atau kembali ke dashboard.
      </p>
      {error.digest ? (
        <p className="font-data-point text-data-point text-secondary">
          KODE: {error.digest}
        </p>
      ) : null}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-primary px-5 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
        >
          COBA LAGI
        </button>
        <Link
          href="/app"
          className="rounded-lg border border-secondary px-5 py-2.5 font-label-caps text-label-caps text-secondary transition-colors hover:bg-surface-container-low"
        >
          DASHBOARD
        </Link>
      </div>
    </div>
  );
}
