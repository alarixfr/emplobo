"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { EmployeeModuleSummary } from "@/lib/modules";
import { STATUS_LABEL } from "@/lib/roles";

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

      const data = await apiFetch<{ modules: EmployeeModuleSummary[] }>("/api/my/modules", {
        token,
      });
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

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Memuat modul...</p>;
  }

  if (error) {
    return <p className="text-sm text-accent">{error}</p>;
  }

  if (modules.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
        Belum ada modul yang ditugaskan ke akun Anda.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {modules.map((module) => (
        <li key={module.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{module.role.name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {module.role.guide?.title ?? "Guide belum tersedia"}
              </p>
            </div>
            <span className="rounded border border-border px-2 py-1 text-xs text-foreground">
              {STATUS_LABEL[module.role.status]}
            </span>
          </div>

          <div className="mt-3">
            <Link
              href={`/app/my/modules/${module.role.id}`}
              className="inline-flex rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground transition hover:opacity-90"
            >
              Buka Modul
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
