"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { EmployeeModuleSummary } from "@/lib/modules";

function moduleIcon(name: string): string {
  const n = name.toLowerCase();
  if (/(barista|kopi|coffee|cafe)/.test(n)) return "local_cafe";
  if (/(kasir|cashier)/.test(n)) return "point_of_sale";
  if (/(waiter|pelayan|server|resto)/.test(n)) return "restaurant";
  if (/(koki|dapur|chef|cook)/.test(n)) return "skillet";
  if (/(gudang|warehouse|stock|stok)/.test(n)) return "warehouse";
  if (/(laundry)/.test(n)) return "local_laundry_service";
  return "work";
}

export function MyModulesList() {
  const { getToken } = useAuth();
  const [modules, setModules] = useState<EmployeeModuleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setError("Sesi tidak valid. Silakan login ulang.");
        return;
      }

      const data = await apiFetch<{ modules: EmployeeModuleSummary[] }>(
        "/api/my/modules",
        { token },
      );
      setModules(data.modules);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat modul.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstModuleId = modules[0]?.role.id ?? null;

  const certifications = useMemo(
    () =>
      modules.map((m) => ({
        roleId: m.role.id,
        name: m.role.name,
        passed: (m.progress.avgBestScore ?? 0) >= 70 && m.progress.completionPct >= 100,
      })),
    [modules],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-xl bg-surface-container-low" />
        <div className="h-28 animate-pulse rounded-xl bg-surface-container-low" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-error-container bg-error-container/40 p-6">
        <p className="font-body-sm text-body-sm text-error">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 inline-flex items-center rounded-lg bg-primary px-4 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
        >
          MUAT ULANG
        </button>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high">
          <span className="material-symbols-outlined text-secondary">
            school
          </span>
        </div>
        <p className="mt-4 font-body-md text-body-md text-on-surface-variant">
          Belum ada modul yang ditugaskan ke akun Anda. Hubungi admin/HR Anda
          untuk penugasan pertama.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* ── Assigned Modules ──────────────────────────────────────────── */}
      <section>
        <h2 className="font-label-caps text-label-caps text-secondary">
          MODUL DITUGASKAN
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {modules.map((module) => {
            const started = module.progress.completionPct > 0;
            const finished = module.progress.completionPct >= 100;
            return (
              <div
                key={module.id}
                className="rounded-lg border border-slate-200 bg-surface-container-lowest p-5 shadow-sm transition-colors hover:bg-surface-bright"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary-fixed">
                    <span className="material-symbols-outlined ms-fill text-[28px] text-on-primary-fixed-variant">
                      {moduleIcon(module.role.name)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 font-label-caps text-[10px] ${
                          finished
                            ? "bg-primary-fixed text-on-primary-fixed-variant"
                            : started
                              ? "bg-status-ready/10 text-status-ready"
                              : "bg-surface-variant text-secondary"
                        }`}
                      >
                        {finished
                          ? "SELESAI"
                          : started
                            ? "SEDANG BERLANGSUNG"
                            : "BELUM DIMULAI"}
                      </span>
                    </div>
                    <h3 className="mt-2 truncate font-headline-sm text-[18px] text-on-surface">
                      {module.role.name}
                    </h3>
                    <p className="mt-0.5 truncate font-body-sm text-body-sm text-secondary">
                      {module.role.guide?.title ?? "Guide belum tersedia"}
                    </p>

                    <div className="mt-3">
                      <ProgressBar percent={module.progress.completionPct} />
                      <p className="mt-1.5 font-label-caps text-[10px] text-secondary">
                        {module.progress.completionPct}% SELESAI
                        {module.progress.avgBestScore !== null
                          ? ` · NILAI KUIS ${module.progress.avgBestScore}`
                          : ""}
                      </p>
                    </div>

                    <Link
                      href={`/app/my/modules/${module.role.id}`}
                      className={`mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-label-caps text-label-caps transition-colors ${
                        started
                          ? "bg-primary text-on-primary hover:bg-primary-container"
                          : "border border-primary bg-transparent text-primary hover:bg-primary-fixed/40"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {finished ? "replay" : "play_arrow"}
                      </span>
                      {finished ? "ULANGI MODUL" : started ? "LANJUTKAN" : "MULAI MODUL"}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Certifications ────────────────────────────────────────────── */}
      <section>
        <h2 className="font-label-caps text-label-caps text-secondary">
          SERTIFIKASI KOMPETENSI
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {certifications.map((cert) => (
            <div
              key={cert.roleId}
              className={`flex flex-col items-center rounded-lg border border-slate-200 bg-surface-container-lowest p-5 text-center shadow-sm ${
                cert.passed ? "" : "opacity-50 grayscale"
              }`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  cert.passed
                    ? "bg-primary-fixed text-on-primary-fixed-variant"
                    : "bg-surface-container-high text-secondary"
                }`}
              >
                <span className="material-symbols-outlined ms-fill">
                  {cert.passed ? "workspace_premium" : "lock"}
                </span>
              </div>
              <p className="mt-3 truncate font-data-point text-data-point text-on-surface">
                {cert.name}
              </p>
              <p className="mt-0.5 font-label-caps text-[10px] text-secondary">
                {cert.passed ? "TERVERIFIKASI" : "TERKUNCI"}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Ask AI Tutor FAB ──────────────────────────────────────────── */}
      {firstModuleId ? (
        <Link
          href={`/app/my/modules/${firstModuleId}`}
          className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-status-ready px-4 py-3 text-white shadow-lg transition-transform hover:scale-105 md:bottom-8 md:right-8"
        >
          <span className="material-symbols-outlined ms-fill">psychology</span>
          <span className="hidden font-label-caps text-label-caps sm:inline">
            TANYA AI TUTOR
          </span>
        </Link>
      ) : null}
    </div>
  );
}
