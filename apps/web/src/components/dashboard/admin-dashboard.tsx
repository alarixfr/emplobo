"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { CountUp } from "@/components/motion/count-up";
import { Stagger } from "@/components/motion/reveal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { RoleStatus } from "@/lib/roles";

type ActivityItem = {
  id: string;
  kind: "quiz" | "assignment" | "guide";
  userName: string | null;
  roleName: string | null;
  detail: string;
  createdAt: string;
};

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
    completenessScore: number;
    assignedEmployees: number;
    totalChapters: number;
    avgCompletionPct: number;
    avgQuizBestScore: number | null;
  }>;
  recentActivity: ActivityItem[];
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Material icon heuristic per role name (reference table rows). */
function roleIcon(name: string): string {
  const n = name.toLowerCase();
  if (/(barista|kopi|coffee|cafe)/.test(n)) return "local_cafe";
  if (/(kasir|cashier)/.test(n)) return "point_of_sale";
  if (/(waiter|pelayan|server)/.test(n)) return "restaurant";
  if (/(koki|dapur|chef|cook|dapur)/.test(n)) return "skillet";
  if (/(gudang|warehouse|stock|stok)/.test(n)) return "warehouse";
  if (/(admin|hr)/.test(n)) return "admin_panel_settings";
  if (/(marketing|sales|penjualan)/.test(n)) return "campaign";
  return "work";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

const ACTIVITY_ICONS: Record<ActivityItem["kind"], string> = {
  quiz: "quiz",
  assignment: "assignment_ind",
  guide: "auto_stories",
};

const ACTIVITY_ICON_BG: Record<ActivityItem["kind"], string> = {
  quiz: "bg-ai-accent text-primary",
  assignment: "bg-primary-fixed text-on-primary-fixed-variant",
  guide: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
};

function StatCard({
  label,
  value,
  hint,
  icon,
  iconClass,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: string;
  iconClass: string;
}) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition-colors hover:bg-surface-bright">
      <div className="flex items-start justify-between">
        <p className="font-label-caps text-label-caps text-secondary">
          {label}
        </p>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 ${iconClass}`}
        >
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>
      <p className="mt-2 font-headline-md text-[32px] leading-10 tabular-nums text-on-surface">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 font-body-sm text-body-sm text-secondary">{hint}</p>
      ) : null}
    </div>
  );
}

function statusFill(status: RoleStatus, pct: number): string {
  if (status === "PUBLISHED") return "bg-primary";
  if (status === "READY") return "bg-status-ready";
  if (pct >= 50) return "bg-status-locked";
  return "bg-secondary";
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Memuat dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-8 w-20" />
            <Skeleton className="mt-2 h-3 w-36" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm lg:col-span-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-64" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <Skeleton className="h-4 w-36" />
          <div className="mt-6 space-y-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const { getToken, isLoaded } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!isLoaded) return; // wait for Clerk before calling getToken()
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError("Sesi tidak valid. Silakan login ulang.");
        return;
      }
      const data = await apiFetch<{ summary: DashboardSummary }>(
        "/api/dashboard/summary",
        { token },
      );
      setSummary(data.summary);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("Terlalu banyak permintaan. Coba lagi sebentar lagi.");
      } else {
        setError(err instanceof Error ? err.message : "Gagal memuat dashboard.");
      }
    }
  }

  useEffect(() => {
    if (isLoaded) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  if (error && !summary) {
    return (
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
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

  if (!summary) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* ── Metrics bento grid ───────────────────────────────────────── */}
      <Stagger y={18} stagger={0.07} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="JUMLAH ROLE"
          value={<CountUp to={summary.roles.total} separator />}
          hint={`${summary.roles.draft} draft · ${summary.roles.ready} siap · ${summary.roles.published} published`}
          icon="menu_book"
          iconClass="bg-ai-accent text-primary"
        />
        <StatCard
          label="KARYAWAN"
          value={<CountUp to={summary.employees} separator />}
          hint={`${summary.assignments} penugasan modul aktif`}
          icon="group"
          iconClass="bg-surface-container-low text-secondary"
        />
        <StatCard
          label="RATA-RATA NILAI KUIS"
          value={
            summary.quiz.avgBestScore !== null ? (
              <CountUp to={summary.quiz.avgBestScore} suffix="%" />
            ) : (
              "—"
            )
          }
          hint={
            summary.quiz.attempts > 0
              ? `${summary.quiz.attempts} percobaan kuis`
              : "Belum ada percobaan kuis"
          }
          icon="workspace_premium"
          iconClass="bg-tertiary-fixed text-on-tertiary-fixed-variant"
        />
        <StatCard
          label="PEMAKAIAN AI (30 HARI)"
          value={formatTokens(
            summary.aiUsage30d.tokensIn + summary.aiUsage30d.tokensOut,
          )}
          hint={`${summary.aiUsage30d.training} training · ${summary.aiUsage30d.chat} chat · ${summary.aiUsage30d.guideGen} guide`}
          icon="bolt"
          iconClass="bg-primary-fixed text-on-primary-fixed-variant"
        />
      </Stagger>

      {/* ── Kesiapan AI table + Aktivitas Terbaru ────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="min-w-0 rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm lg:col-span-2">
          <div className="border-b border-outline-variant p-5">
            <h2 className="font-headline-sm text-[18px] text-on-surface">
              Kesiapan AI
            </h2>
            <p className="mt-0.5 font-body-sm text-body-sm text-secondary">
              Status kelengkapan pengetahuan AI per role.
            </p>
          </div>

          {summary.perRole.length === 0 ? (
            <p className="p-6 font-body-md text-body-md text-on-surface-variant">
              Belum ada role. Buat role, latih AI sampai READY (≥75%), lalu
              generate guide untuk melihat progress di sini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="px-5 py-3 font-label-caps text-label-caps text-secondary">
                      ROLE
                    </th>
                    <th className="px-5 py-3 font-label-caps text-label-caps text-secondary">
                      STATUS
                    </th>
                    <th className="px-5 py-3 font-label-caps text-label-caps text-secondary">
                      KELENGKAPAN
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {summary.perRole.map((role, i) => {
                    const status = role.status as RoleStatus;
                    return (
                      <tr
                        key={role.roleId}
                        style={{ animationDelay: `${i * 40}ms` }}
                        className="animate-fade-rise border-b border-outline-variant transition-colors last:border-0 hover:bg-surface-bright"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-fixed">
                              <span className="material-symbols-outlined text-[18px] text-on-primary-fixed-variant">
                                {roleIcon(role.roleName)}
                              </span>
                            </div>
                            <div>
                              <p className="font-data-point text-data-point font-bold text-on-surface">
                                {role.roleName}
                              </p>
                              <p className="text-[12px] text-secondary">
                                {role.assignedEmployees} karyawan ·{" "}
                                {role.totalChapters} chapter
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <ProgressBar
                              percent={role.completenessScore}
                              fillClass={statusFill(
                                status,
                                role.completenessScore,
                              )}
                              animate
                              className="w-28"
                            />
                            <span className="font-data-point text-data-point text-on-surface">
                              {role.completenessScore}%
                            </span>
                          </div>
                          <p className="mt-1 text-[12px] text-secondary">
                            Tim {role.avgCompletionPct}% · Kuis{" "}
                            {role.avgQuizBestScore !== null
                              ? `${role.avgQuizBestScore}/100`
                              : "—"}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <a
                            href={`/app/roles/${role.roleId}`}
                            className="inline-flex text-secondary transition-colors hover:text-primary"
                            aria-label={`Kelola ${role.roleName}`}
                          >
                            <span className="material-symbols-outlined">
                              edit
                            </span>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent activity timeline */}
        <section className="min-w-0 rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="border-b border-outline-variant p-5">
            <h2 className="font-headline-sm text-[18px] text-on-surface">
              Aktivitas Terbaru
            </h2>
          </div>
          <div className="relative p-5">
            {summary.recentActivity.length === 0 ? (
              <p className="font-body-sm text-body-sm text-secondary">
                Belum ada aktivitas. Aktivitas muncul saat karyawan mengerjakan
                kuis atau admin menugaskan modul.
              </p>
            ) : (
              <ul className="relative space-y-6">
                <div
                  aria-hidden
                  className="absolute bottom-2 left-[15px] top-2 w-0.5 bg-gradient-to-b from-outline-variant to-transparent"
                />
                {summary.recentActivity.map((item, i) => (
                  <li
                    key={item.id}
                    style={{ animationDelay: `${i * 70}ms` }}
                    className="animate-fade-rise relative flex gap-4"
                  >
                    <div
                      className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-surface-container-lowest ${ACTIVITY_ICON_BG[item.kind]}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {ACTIVITY_ICONS[item.kind]}
                      </span>
                    </div>
                    <div className="min-w-0 pt-1">
                      <p className="font-body-sm text-body-sm text-on-surface">
                        <span className="font-semibold">
                          {item.userName ?? item.roleName ?? "Sistem"}
                        </span>{" "}
                        {item.detail}
                      </p>
                      <p className="mt-1 font-label-caps text-[10px] uppercase text-secondary">
                        {relativeTime(item.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
