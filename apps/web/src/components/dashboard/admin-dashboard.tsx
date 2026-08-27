"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";

type DashboardSummary = {
  roles: {
    total: number;
    draft: number;
    ready: number;
    published: number;
  };
  employees: number;
  assignments: number;
  quiz: {
    attempts: number;
    avgBestScore: number | null;
  };
  aiUsage30d: {
    training: number;
    chat: number;
    guideGen: number;
    tokensIn: number;
    tokensOut: number;
  };
  perRole: Array<{
    roleId: string;
    roleName: string;
    status: string;
    assignedEmployees: number;
    totalChapters: number;
    avgCompletionPct: number;
    avgQuizBestScore: number | null;
  }>;
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function AdminDashboard() {
  const { getToken } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError("Sesi tidak valid. Silakan login ulang.");
        return;
      }
      const data = await apiFetch<{ summary: DashboardSummary }>("/api/dashboard/summary", {
        token,
      });
      setSummary(data.summary);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("Terlalu banyak permintaan. Coba lagi sebentar lagi.");
      } else {
        setError(err instanceof Error ? err.message : "Gagal memuat dashboard.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading && !summary) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-accent">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
        >
          Muat Ulang
        </button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      {/* ── Stat cards ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Roles" value={summary.roles.total} />
        <StatCard
          label="Guide Dipublikasikan"
          value={summary.roles.published}
          hint={`${summary.roles.draft} draft · ${summary.roles.ready} siap`}
        />
        <StatCard label="Karyawan" value={summary.employees} />
        <StatCard
          label="Penugasan Modul"
          value={summary.assignments}
          hint="Total assignment karyawan ke role"
        />
        <StatCard
          label="Rata-rata Nilai Kuis"
          value={summary.quiz.avgBestScore !== null ? `${summary.quiz.avgBestScore}` : "—"}
          hint={
            summary.quiz.attempts > 0
              ? `${summary.quiz.attempts} percobaan kuis`
              : "Belum ada percobaan kuis"
          }
        />
        <StatCard
          label="Pemakaian AI (30 hari)"
          value={formatTokens(summary.aiUsage30d.tokensIn + summary.aiUsage30d.tokensOut)}
          hint={`${summary.aiUsage30d.training} training · ${summary.aiUsage30d.chat} chat · ${summary.aiUsage30d.guideGen} guide`}
        />
      </div>

      {/* ── Per-role progress ──────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Progress per Role
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Rata-rata penyelesaian chapter dan nilai kuis karyawan.
            </p>
          </div>
        </div>

        {summary.perRole.length === 0 ? (
          <p className="mt-4 rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
            Belum ada guide yang dipublikasikan. Buat role, latih AI sampai READY, lalu generate
            guide untuk melihat progress di sini.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {summary.perRole.map((role) => (
              <li key={role.roleId} className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{role.roleName}</p>
                    <p className="text-xs text-muted-foreground">
                      {role.assignedEmployees} karyawan · {role.totalChapters} chapter
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Quiz:{" "}
                      <span className="font-semibold text-foreground">
                        {role.avgQuizBestScore !== null ? `${role.avgQuizBestScore}` : "—"}
                      </span>
                    </span>
                    <span className="font-display text-2xl font-semibold text-brand">
                      {role.avgCompletionPct}%
                    </span>
                  </div>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${Math.min(100, role.avgCompletionPct)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
