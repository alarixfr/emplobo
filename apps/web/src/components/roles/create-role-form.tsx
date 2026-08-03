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
      className="space-y-4 rounded-lg border border-border bg-card p-4"
    >
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Buat Role baru
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Contoh: Kasir, Barista, Waiter. AI akan dilatih khusus untuk peran
          ini.
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="role-name"
          className="text-sm font-medium text-foreground"
        >
          Nama role
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
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2 disabled:opacity-60"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="role-description"
          className="text-sm font-medium text-foreground"
        >
          Deskripsi{" "}
          <span className="font-normal text-muted-foreground">(opsional)</span>
        </label>
        <textarea
          id="role-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          disabled={isPending}
          placeholder="Melayani pembayaran, mengoperasikan POS, menangani refund…"
          className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2 disabled:opacity-60"
        />
      </div>

      {error ? (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? "Menyimpan…" : "Buat Role"}
      </button>
    </form>
  );
}
