"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[emplobo] route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-surface-muted px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error-container">
        <span className="material-symbols-outlined text-[28px] text-on-error-container">
          error
        </span>
      </div>
      <h1 className="font-headline-md text-headline-md text-on-surface">
        Terjadi kesalahan
      </h1>
      <p className="max-w-md font-body-md text-body-md text-on-surface-variant">
        Maaf, sesuatu tidak beres. Anda bisa mencoba lagi atau kembali ke
        beranda.
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
          href="/"
          className="rounded-lg border border-secondary px-5 py-2.5 font-label-caps text-label-caps text-secondary transition-colors hover:bg-surface-container-low"
        >
          BERANDA
        </Link>
      </div>
    </div>
  );
}
