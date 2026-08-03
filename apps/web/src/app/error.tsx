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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        Terjadi kesalahan
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Maaf, sesuatu tidak beres. Anda bisa mencoba lagi atau kembali ke
        beranda.
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">
          Kode: {error.digest}
        </p>
      ) : null}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
        >
          Coba lagi
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          Beranda
        </Link>
      </div>
    </div>
  );
}
