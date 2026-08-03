import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TrainingRoom } from "@/components/roles/training-room";
import { apiFetch } from "@/lib/api";
import type { TrainingRoleSummary } from "@/lib/roles";

export default async function TrainingIndexPage() {
  const { orgRole, getToken } = await auth();

  if (orgRole !== "org:admin") {
    redirect("/app");
  }

  const token = await getToken();
  if (!token) {
    redirect("/sign-in");
  }

  let roles: TrainingRoleSummary[] = [];
  try {
    const data = await apiFetch<{ roles: TrainingRoleSummary[] }>("/api/roles", {
      token,
    });
    roles = data.roles;
  } catch {
    roles = [];
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Training Room
        </h1>
        <p className="mt-1 text-muted-foreground">
          Halaman training terpusat. Pilih role di sisi kiri lalu latih AI dengan format chat.
        </p>
      </div>

      {roles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          Belum ada role. Buat role baru dulu di halaman Roles.
        </div>
      ) : (
        <TrainingRoom roles={roles} />
      )}
    </div>
  );
}
