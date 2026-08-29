"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { UsersIcon } from "@/components/icons";
import { ApiError, apiFetch } from "@/lib/api";
import type { RoleStatus } from "@/lib/roles";

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
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <UsersIcon className="h-5 w-5 text-brand" />
            Tugaskan Karyawan
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tugaskan role ini ke karyawan agar modul pembelajaran muncul di akun mereka.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void assignUsers()}
          disabled={!canAssign}
          className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {isAssigning ? "Menyimpan..." : `Tugaskan (${selected.size})`}
        </button>
      </div>

      {status !== "PUBLISHED" ? (
        <p className="mt-3 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
          Role belum dipublikasikan. Hasilkan panduan dulu agar penugasan aktif.
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-accent">{error}</p> : null}
      {result ? <p className="mt-3 text-sm text-foreground">{result}</p> : null}

      <div className="mt-4 rounded-lg border border-border bg-background">
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Memuat karyawan...</p>
        ) : users.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Belum ada karyawan di organisasi ini.
          </p>
        ) : (
          <ul className="divide-y divide-border">
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
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {user.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </span>
                  </label>

                  <div className="text-right text-xs">
                    {user.isAssigned ? (
                      <>
                        <p className="font-semibold text-foreground">Ditugaskan</p>
                        <p className="text-muted-foreground">
                          {user.assignedAt
                            ? new Date(user.assignedAt).toLocaleDateString("id-ID")
                            : "—"}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Belum ditugaskan</p>
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
