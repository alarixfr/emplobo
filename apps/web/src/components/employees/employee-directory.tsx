"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { EmployeeDirectoryEntry } from "@/lib/employees";
import { initialsOf } from "@/components/shell/app-sidebar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";

function completionFill(pct: number): string {
  if (pct >= 90) return "bg-primary";
  if (pct >= 50) return "bg-status-locked";
  if (pct > 0) return "bg-error";
  return "bg-secondary";
}

function DirectorySkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat karyawan">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-slate-200 bg-surface-container-lowest p-5 shadow-sm"
          >
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-2 h-8 w-16" />
            <Skeleton className="mt-2 h-1.5 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-full md:w-72" />
      <div className="rounded-lg border border-slate-200 bg-surface-container-lowest shadow-sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-slate-100 p-4 last:border-0"
          >
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-2 w-1/2" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmployeeDirectory() {
  const { getToken, isLoaded } = useAuth();
  const [employees, setEmployees] = useState<EmployeeDirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeRoleFilter, setActiveRoleFilter] = useState<string | null>(null);

  async function load() {
    if (!isLoaded) return; // wait for Clerk before calling getToken()
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError("Sesi tidak valid. Silakan login ulang.");
        return;
      }
      const data = await apiFetch<{ employees: EmployeeDirectoryEntry[] }>(
        "/api/employees",
        { token },
      );
      setEmployees(data.employees);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data karyawan.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isLoaded) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  const roleNames = useMemo(() => {
    const set = new Set<string>();
    for (const e of employees) {
      for (const a of e.assignments) set.add(a.roleName);
    }
    return [...set].sort();
  }, [employees]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      const matchesQuery =
        q.length === 0 ||
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q);
      const matchesRole =
        activeRoleFilter === null ||
        e.assignments.some((a) => a.roleName === activeRoleFilter);
      return matchesQuery && matchesRole;
    });
  }, [employees, query, activeRoleFilter]);

  const totalWorkforce = employees.length;
  const avgCompletion = useMemo(() => {
    const withProgress = employees.filter((e) => e.assignments.length > 0);
    if (withProgress.length === 0) return 0;
    return Math.round(
      withProgress.reduce((acc, e) => acc + e.avgCompletionPct, 0) /
        withProgress.length,
    );
  }, [employees]);

  const weakestRole = useMemo(() => {
    const byRole = new Map<string, number[]>();
    for (const e of employees) {
      for (const a of e.assignments) {
        const list = byRole.get(a.roleName) ?? [];
        list.push(a.completionPct);
        byRole.set(a.roleName, list);
      }
    }
    let worst: { roleName: string; avg: number } | null = null;
    for (const [roleName, scores] of byRole) {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      if (!worst || avg < worst.avg) {
        worst = { roleName, avg };
      }
    }
    return worst;
  }, [employees]);

  if (isLoading || !isLoaded) {
    return <DirectorySkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-slate-200 bg-surface-container-lowest p-6 shadow-sm">
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

  return (
    <div className="space-y-6">
      {/* ── Metrics bento ─────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-surface-container-lowest p-5 shadow-sm">
          <p className="font-label-caps text-label-caps text-secondary">
            TOTAL WORKFORCE
          </p>
          <p className="mt-2 font-headline-md text-[32px] leading-10 text-on-surface">
            {totalWorkforce}
          </p>
          <p className="mt-1 font-body-sm text-body-sm text-secondary">
            Pengguna terdaftar di organisasi ini
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-surface-container-lowest p-5 shadow-sm">
          <p className="font-label-caps text-label-caps text-secondary">
            TRAINING COMPLETION
          </p>
          <p className="mt-2 font-headline-md text-[32px] leading-10 text-on-surface">
            {avgCompletion}%
          </p>
          <ProgressBar percent={avgCompletion} className="mt-2" />
        </div>

        <div className="relative overflow-hidden rounded-lg border border-ai-border bg-ai-accent p-5 shadow-sm">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-ai-border/60 to-transparent"
          />
          <p className="flex items-center gap-2 font-label-caps text-label-caps text-primary">
            <span className="material-symbols-outlined text-[18px]">
              psychology
            </span>
            AI INSIGHT
          </p>
          {weakestRole ? (
            <>
              <p className="mt-2 font-body-sm text-body-sm text-on-surface">
                Trainee role{" "}
                <span className="font-semibold">{weakestRole.roleName}</span>{" "}
                punya completion terendah ({weakestRole.avg}%). Pertimbangkan
                tambahan training atau regenerasi guide.
              </p>
              <Link
                href="/app/training"
                className="mt-2 inline-flex items-center gap-1 font-data-point text-data-point font-bold text-status-ready hover:underline"
              >
                Generate Guide
                <span className="material-symbols-outlined text-[16px]">
                  arrow_forward
                </span>
              </Link>
            </>
          ) : (
            <p className="mt-2 font-body-sm text-body-sm text-on-surface">
              Tugaskan karyawan ke role untuk melihat insight AI di sini.
            </p>
          )}
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xs">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama atau email…"
            className="w-full rounded-xl border border-slate-300 bg-surface-container-lowest py-2.5 pl-10 pr-4 font-body-sm text-body-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary-fixed-dim/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveRoleFilter(null)}
            className={`rounded-full px-4 py-1.5 font-label-caps text-label-caps transition-colors ${
              activeRoleFilter === null
                ? "border border-secondary bg-surface-container-lowest text-on-surface"
                : "text-secondary hover:text-on-surface"
            }`}
          >
            ALL ROLES
          </button>
          {roleNames.map((roleName) => (
            <button
              key={roleName}
              type="button"
              onClick={() =>
                setActiveRoleFilter(activeRoleFilter === roleName ? null : roleName)
              }
              className={`rounded-full px-4 py-1.5 font-label-caps text-label-caps transition-colors ${
                activeRoleFilter === roleName
                  ? "border border-secondary bg-surface-container-lowest text-on-surface"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              {roleName.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Directory table ───────────────────────────────────────────── */}
      <section className="rounded-lg border border-slate-200 bg-surface-container-lowest shadow-sm">
        {filtered.length === 0 ? (
          <p className="p-6 font-body-md text-body-md text-on-surface-variant">
            Tidak ada karyawan yang cocok dengan filter.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-3 font-label-caps text-label-caps text-secondary">
                    EMPLOYEE
                  </th>
                  <th className="px-5 py-3 font-label-caps text-label-caps text-secondary">
                    ROLES
                  </th>
                  <th className="px-5 py-3 font-label-caps text-label-caps text-secondary">
                    PROGRESS
                  </th>
                  <th className="px-5 py-3 font-label-caps text-label-caps text-secondary">
                    AVG SCORE
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((employee) => (
                  <tr
                    key={employee.id}
                    className="border-b border-slate-100 transition-colors last:border-0 hover:bg-surface-bright"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-label-caps text-label-caps text-on-primary">
                          {initialsOf(employee.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-body-md text-body-md font-medium text-on-surface">
                            {employee.name}
                          </p>
                          <p className="truncate text-[12px] text-secondary">
                            {employee.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {employee.role === "ADMIN" ? (
                          <span className="rounded-full bg-primary-container px-2.5 py-1 font-label-caps text-[10px] text-on-primary-container">
                            MANAGER
                          </span>
                        ) : null}
                        {employee.assignments.length === 0 ? (
                          <span className="rounded-full bg-surface-variant px-2.5 py-1 font-label-caps text-[10px] text-secondary">
                            BELUM DITUGASKAN
                          </span>
                        ) : (
                          employee.assignments.map((a) => (
                            <span
                              key={a.roleId}
                              className="rounded-full bg-surface-variant px-2.5 py-1 font-label-caps text-[10px] text-on-surface-variant"
                            >
                              {a.roleName.toUpperCase()}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <ProgressBar
                          percent={employee.avgCompletionPct}
                          fillClass={completionFill(employee.avgCompletionPct)}
                          className="w-32"
                        />
                        <span className="font-data-point text-data-point text-on-surface">
                          {employee.avgCompletionPct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-data-point text-data-point text-on-surface">
                      {employee.avgQuizBestScore !== null
                        ? `${employee.avgQuizBestScore}/100`
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href="/app/roles"
                        className="inline-flex text-secondary transition-colors hover:text-primary"
                        aria-label={`Kelola ${employee.name}`}
                      >
                        <span className="material-symbols-outlined">
                          more_vert
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
          <p className="font-data-point text-data-point text-secondary">
            {filtered.length} dari {employees.length} karyawan
          </p>
        </div>
      </section>
    </div>
  );
}
