"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";

type RoleActionsProps = {
  role: { id: string; name: string; description: string | null };
  redirectOnDelete?: string;
};

function ModalShell({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-on-surface/45 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-lg sm:p-8">
        {children}
      </div>
    </div>
  );
}

export function RoleActions({ role, redirectOnDelete }: RoleActionsProps) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"closed" | "edit" | "delete">("closed");
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "edit") {
      setName(role.name);
      setDescription(role.description ?? "");
      setError(null);
      requestAnimationFrame(() => nameRef.current?.focus());
    } else if (mode === "delete") {
      setError(null);
    }
  }, [mode, role.name, role.description]);

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError("Sesi tidak valid. Silakan login ulang.");
        setSaving(false);
        return;
      }
      await apiFetch(`/api/roles/${role.id}`, {
        method: "PATCH",
        body: { name: name.trim(), description: description.trim() },
        token,
      });
      setMode("closed");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal menyimpan perubahan role.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError("Sesi tidak valid. Silakan login ulang.");
        setSaving(false);
        return;
      }
      await apiFetch(`/api/roles/${role.id}`, { method: "DELETE", token });
      setMode("closed");
      if (redirectOnDelete) {
        router.push(redirectOnDelete);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus role.");
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMode("edit")}
        className="inline-flex items-center gap-1.5 rounded-lg border border-secondary px-3.5 py-2 font-label-caps text-label-caps text-secondary transition-colors hover:bg-surface-container-low"
        aria-label={`Edit role ${role.name}`}
      >
        <span className="material-symbols-outlined text-[16px]">edit</span>
        EDIT
      </button>
      <button
        type="button"
        onClick={() => setMode("delete")}
        className="inline-flex items-center gap-1.5 rounded-lg border border-error/40 px-3.5 py-2 font-label-caps text-label-caps text-error transition-colors hover:bg-error/10"
        aria-label={`Hapus role ${role.name}`}
      >
        <span className="material-symbols-outlined text-[16px]">delete</span>
        HAPUS
      </button>

      {mode === "edit" ? (
        <ModalShell onClose={() => setMode("closed")}>
          <span className="material-symbols-outlined ms-fill text-[24px] text-primary">
            edit
          </span>
          <h2 className="mt-3 font-headline-sm text-headline-sm text-on-surface">
            Edit role
          </h2>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            Ubah nama atau deskripsi peran kerja. Training Room dan guide yang
            sudah ada tetap aman — nama baru dipakai untuk conversasi berikutnya.
          </p>

          <form onSubmit={saveEdit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor={`edit-role-name-${role.id}`}
                className="block font-label-md text-label-md text-on-surface"
              >
                Nama role
              </label>
              <input
                ref={nameRef}
                id={`edit-role-name-${role.id}`}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="mt-1.5 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary-fixed-dim/50"
              />
            </div>
            <div>
              <label
                htmlFor={`edit-role-desc-${role.id}`}
                className="block font-label-md text-label-md text-on-surface"
              >
                Deskripsi
              </label>
              <textarea
                id={`edit-role-desc-${role.id}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="mt-1.5 w-full resize-none rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary-fixed-dim/50"
              />
            </div>

            {error ? (
              <p role="alert" className="font-body-sm text-body-sm text-error">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setMode("closed")}
                disabled={saving}
                className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-secondary bg-surface-container-lowest px-4 py-2.5 font-label-caps text-label-caps text-secondary transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-60"
              >
                BATAL
              </button>
              <button
                type="submit"
                disabled={saving || name.trim().length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "MENYIMPAN…" : "SIMPAN"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {mode === "delete" ? (
        <ModalShell onClose={() => setMode("closed")}>
          <span className="material-symbols-outlined ms-fill text-[24px] text-error">
            warning
          </span>
          <h2 className="mt-3 font-headline-sm text-headline-sm text-on-surface">
            Hapus role &ldquo;{role.name}&rdquo;?
          </h2>
          <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
            Tindakan ini permanen dan tidak bisa dibatalkan. Berikut ikut
            terhapus selamanya:
          </p>
          <ul className="mt-3 space-y-1.5 font-body-sm text-body-sm text-on-surface-variant">
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-error">
                close
              </span>
              Transcript training dan skor completeness
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-error">
                close
              </span>
              Guide, kuis, draf, dan riwayat versi
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-error">
                close
              </span>
              Assignment, progress, dan nilai kuis karyawan pada role ini
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-error">
                close
              </span>
              Sesi AI Tutor karyawan untuk role ini
            </li>
          </ul>
          <p className="mt-3 rounded-lg border border-outline-variant bg-surface-container-low p-3 font-body-sm text-[12px] leading-5 text-secondary">
            Dokumen di Knowledge Library tidak terhapus — itu milik seluruh
            organisasi, bukan role ini.
          </p>

          {error ? (
            <p role="alert" className="mt-3 font-body-sm text-body-sm text-error">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setMode("closed")}
              disabled={saving}
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-secondary bg-surface-container-lowest px-4 py-2.5 font-label-caps text-label-caps text-secondary transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-60"
            >
              BATAL
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-error px-4 py-2.5 font-label-caps text-label-caps text-on-error transition-colors hover:bg-error-dim disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "MENGHAPUS…" : "HAPUS PERMANEN"}
            </button>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}