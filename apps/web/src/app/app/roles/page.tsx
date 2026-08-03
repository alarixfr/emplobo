import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CreateRoleForm } from "@/components/roles/create-role-form";
import { apiFetch } from "@/lib/api";
import { STATUS_LABEL, type TrainingRoleSummary } from "@/lib/roles";

async function fetchRoles(token: string): Promise<TrainingRoleSummary[]> {
  const data = await apiFetch<{ roles: TrainingRoleSummary[] }>("/api/roles", {
    token,
  });
  return data.roles;
}

export default async function RolesPage() {
  const { orgRole, getToken } = await auth();

  if (orgRole !== "org:admin") {
    redirect("/app");
  }

  const token = await getToken();
  if (!token) {
    redirect("/sign-in");
  }

  let roles: TrainingRoleSummary[] = [];
  let loadError: string | null = null;
  try {
    roles = await fetchRoles(token);
  } catch {
    loadError =
      "Gagal memuat daftar role. Pastikan API berjalan dan sesi masih aktif.";
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Roles
        </h1>
        <p className="mt-1 text-muted-foreground">
          Buat peran kerja, lalu latih AI per role di Training Room (Section 4).
        </p>
      </div>

      <CreateRoleForm />

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Daftar role
        </h2>

        {loadError ? (
          <p className="rounded-md border border-border bg-card p-4 text-sm text-accent">
            {loadError}
          </p>
        ) : roles.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
            Belum ada role. Buat yang pertama di atas.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {roles.map((role) => (
              <li key={role.id}>
                <Link
                  href={`/app/roles/${role.id}`}
                  className="flex items-start justify-between gap-4 px-4 py-3 transition hover:bg-muted/60"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{role.name}</p>
                    {role.description ? (
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {role.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">
                      {STATUS_LABEL[role.status]}
                    </p>
                    <p className="mt-0.5">{role.completenessScore}% lengkap</p>
                  </div>
                </Link>
                <div className="px-4 pb-3">
                  <Link
                    href={`/app/training/${role.id}`}
                    className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
                  >
                    Train
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
