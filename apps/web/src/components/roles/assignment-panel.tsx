"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import type { RoleStatus } from "@/lib/roles";
import { initialsOf } from "@/components/shell/app-sidebar";

type AssignableUser = {
  id: string;
  name: string;
  email: string;
  assignedAt: string | null;
  isAssigned: boolean;
};

type AssignmentPanelProps = {
  roleId: string;
  roleStatus: RoleStatus;
};

export function AssignmentPanel({ roleId, roleStatus }: AssignmentPanelProps) {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<RoleStatus>(roleStatus);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const canAssign = useMemo(
    () => status === "PUBLISHED" && selected.size > 0 && !isAssigning,
    [status, selected.size, isAssigning],
  );

  async function loadUsers() {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError("Sesi tidak valid. Silakan login ulang.");
        return;
      }

      const data = await apiFetch<{
        role: { id: string; status: RoleStatus };
        users: AssignableUser[];
      }>(`/api/roles/${roleId}/assignable-users`, { token });

      setStatus(data.role.status);
      setUsers(data.users);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data assignment.");
    } finally {
      setIsLoading(false);
    }
  }

  async function assignUsers() {
    if (!canAssign) return;
    setIsAssigning(true);
    setError(null);
    setResult(null);

    try {
      const token = await getToken();
      if (!token) {
        setError("Sesi tidak valid. Silakan login ulang.");
        return;
      }

      const userIds = Array.from(selected);
      const data = await apiFetch<{
        createdCount: number;
        skippedExisting: number;
        invalidUserIds: string[];
      }>(`/api/roles/${roleId}/assignments`, {
        method: "POST",
        token,
        body: { userIds },
      });

      setResult(
        `Assigned ${data.createdCount} user(s). Skipped existing: ${data.skippedExisting}. Invalid: ${data.invalidUserIds.length}.`,
      );

      await loadUsers();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Gagal melakukan assignment.");
      }
    } finally {
      setIsAssigning(false);
    }
  }

  function toggleUser(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]);

  // Status is lifted to the parent (RoleDetailPanels) — sync it when guide
  // generation flips this role to PUBLISHED without a page reload.
  useEffect(() => {
    setStatus(roleStatus);
  }, [roleStatus]);

  return (
    <section className="rounded-lg border border-slate-200 bg-surface-container-lowest p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">
            Tugaskan Karyawan
          </h3>
          <p className="mt-1 font-body-sm text-body-sm text-secondary">
            Tugaskan role ini ke karyawan agar modul pembelajaran muncul di
            akun mereka.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void assignUsers()}
          disabled={!canAssign}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">
            assignment_ind
          </span>
          {isAssigning ? "MENYIMPAN…" : `TUGASKAN (${selected.size})`}
        </button>
      </div>

      {status !== "PUBLISHED" ? (
        <p className="mt-3 rounded-lg border border-status-locked border-l-4 bg-surface-bright p-3 font-body-sm text-body-sm text-on-surface-variant">
          Role belum dipublikasikan. Hasilkan panduan dulu agar penugasan
          aktif.
        </p>
      ) : null}

      {error ? <p className="mt-3 font-body-sm text-body-sm text-error">{error}</p> : null}
      {result ? (
        <p className="mt-3 font-body-sm text-body-sm text-on-surface">{result}</p>
      ) : null}

      <div className="mt-4 rounded-lg border border-outline-variant bg-surface-bright">
        {isLoading ? (
          <p className="p-4 font-body-sm text-body-sm text-secondary">
            Memuat karyawan...
          </p>
        ) : users.length === 0 ? (
          <p className="p-4 font-body-sm text-body-sm text-secondary">
            Belum ada karyawan di organisasi ini. Undang lewat Clerk di menu
            organisasi.
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {users.map((user) => {
              const checked = selected.has(user.id);
              const disabled = user.isAssigned;

              return (
                <li key={user.id} className="flex items-center justify-between gap-3 p-3">
                  <label className="flex min-w-0 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled || status !== "PUBLISHED"}
                      onChange={() => toggleUser(user.id)}
                      className="h-4 w-4 rounded border-outline-variant accent-[#144225]"
                    />
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-label-caps text-[10px] text-on-primary-fixed-variant">
                      {initialsOf(user.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-body-md text-body-md font-medium text-on-surface">
                        {user.name}
                      </span>
                      <span className="block truncate text-[12px] text-secondary">
                        {user.email}
                      </span>
                    </span>
                  </label>

                  <div className="text-right">
                    {user.isAssigned ? (
                      <span className="rounded-full bg-primary-fixed px-2.5 py-1 font-label-caps text-[10px] text-on-primary-fixed-variant">
                        DITUGASKAN
                      </span>
                    ) : (
                      <span className="rounded-full bg-surface-variant px-2.5 py-1 font-label-caps text-[10px] text-secondary">
                        BELUM
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
