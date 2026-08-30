"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { z } from "zod";
import { ApiError, apiFetch } from "@/lib/api";
import type { TrainingRoleSummary } from "@/lib/roles";

const formSchema = z
  .object({
    name: z.string().trim().min(1, "Nama wajib diisi").max(100),
    description: z.string().trim().max(500).optional(),
  })
  .strict();

type CreateRoleFormProps = {
  onCreated?: (role: TrainingRoleSummary) => void;
};

export function CreateRoleForm({ onCreated }: CreateRoleFormProps) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = formSchema.safeParse({
      name,
      description: description || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Input tidak valid");
      return;
    }

    startTransition(async () => {
      try {
        const token = await getToken();
        if (!token) {
          setError("Sesi tidak valid. Silakan login ulang.");
          return;
        }

        const result = await apiFetch<{ role: TrainingRoleSummary }>(
          "/api/roles",
          {
            method: "POST",
            token,
            body: parsed.data,
          },
        );

        setName("");
        setDescription("");
        onCreated?.(result.role);
        router.refresh();
        router.push(`/app/roles/${result.role.id}`);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Gagal membuat role. Coba lagi.");
        }
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-slate-200 bg-surface-container-lowest p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed">
          <span className="material-symbols-outlined text-[20px] text-on-primary-fixed-variant">
            add_circle
          </span>
        </div>
        <div>
          <h3 className="font-headline-sm text-[18px] text-on-surface">
            Buat role baru
          </h3>
          <p className="mt-0.5 font-body-sm text-body-sm text-secondary">
            Contoh: Kasir, Barista, Waiter. AI akan dilatih khusus untuk peran
            ini.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="role-name"
          className="font-label-caps text-label-caps text-secondary"
        >
          NAMA ROLE
        </label>
        <input
          id="role-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
          disabled={isPending}
          placeholder="Kasir"
          className="w-full rounded-lg border border-slate-300 bg-surface-muted px-3 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary-fixed-dim/50 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="role-description"
          className="font-label-caps text-label-caps text-secondary"
        >
          DESKRIPSI (OPSIONAL)
        </label>
        <textarea
          id="role-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          disabled={isPending}
          placeholder="Melayani pembayaran, mengoperasikan POS, menangani refund…"
          className="w-full resize-y rounded-lg border border-slate-300 bg-surface-muted px-3 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary-fixed-dim/50 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {error ? (
        <p className="font-body-sm text-body-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        {isPending ? "MENYIMPAN…" : "BUAT ROLE"}
      </button>
    </form>
  );
}
