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
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 py-20 text-center">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        Terjadi kesalahan
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Gagal memuat bagian aplikasi ini. Coba lagi, atau kembali ke dashboard.
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">Kode: {error.digest}</p>
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
          href="/app"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
