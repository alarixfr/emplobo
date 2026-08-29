import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CreateRoleForm } from "@/components/roles/create-role-form";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { apiFetch } from "@/lib/api";
import type { TrainingRoleSummary } from "@/lib/roles";

async function fetchRoles(token: string): Promise<TrainingRoleSummary[]> {
  const data = await apiFetch<{ roles: TrainingRoleSummary[] }>("/api/roles", {
    token,
  });
  return data.roles;
}

function roleIcon(name: string): string {
  const n = name.toLowerCase();
  if (/(barista|kopi|coffee|cafe)/.test(n)) return "local_cafe";
  if (/(kasir|cashier)/.test(n)) return "point_of_sale";
  if (/(waiter|pelayan|server|resto)/.test(n)) return "restaurant";
  if (/(koki|dapur|chef|cook)/.test(n)) return "skillet";
  if (/(gudang|warehouse|stock|stok)/.test(n)) return "warehouse";
  return "work";
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
  } catch (err) {
    if (err instanceof Error && "status" in err && (err as { status?: number }).status === 503) {
      loadError =
        "Database sedang tidak tersedia. Coba lagi beberapa saat atau periksa koneksi Neon.";
    } else {
      loadError =
        "Gagal memuat daftar role. Pastikan API berjalan dan sesi masih aktif.";
    }
  }

  return (
    <div className="mx-auto w-full max-w-container space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">
            Roles &amp; Guides
          </h1>
          <p className="mt-1 max-w-2xl font-body-md text-body-md text-on-surface-variant">
            Buat peran kerja (Kasir, Barista, …) lalu latih AI per role di
            Training Room untuk menghasilkan panduan SOP.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Role list */}
        <section>
          <h2 className="font-label-caps text-label-caps text-secondary">
            DAFTAR ROLE
          </h2>

          {loadError ? (
            <p className="mt-4 rounded-lg border border-error-container bg-error-container/40 p-4 font-body-sm text-body-sm text-error">
              {loadError}
            </p>
          ) : roles.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest p-6 font-body-md text-body-md text-on-surface-variant">
              Belum ada role. Buat yang pertama lewat formulir di samping.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {roles.map((role) => (
                <li key={role.id}>
                  <div className="rounded-lg border border-slate-200 bg-surface-container-lowest p-5 shadow-sm transition-colors hover:bg-surface-bright">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed">
                          <span className="material-symbols-outlined text-[20px] text-on-primary-fixed-variant">
                            {roleIcon(role.name)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/app/roles/${role.id}`}
                            className="truncate font-data-point text-data-point font-bold text-on-surface hover:text-primary"
                          >
                            {role.name}
                          </Link>
                          {role.description ? (
                            <p className="mt-0.5 truncate font-body-sm text-body-sm text-secondary">
                              {role.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <StatusBadge status={role.status} />
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <ProgressBar
                        percent={role.completenessScore}
                        fillClass={
                          role.status === "PUBLISHED"
                            ? "bg-primary"
                            : role.status === "READY"
                              ? "bg-status-ready"
                              : "bg-status-locked"
                        }
                        className="w-40"
                      />
                      <span className="font-data-point text-data-point text-on-surface">
                        {role.completenessScore}%
                      </span>
                      <span className="font-body-sm text-[12px] text-secondary">
                        {role.trainingMessageCount} pesan training
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/app/training/${role.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          school
                        </span>
                        TRAIN
                      </Link>
                      <Link
                        href={`/app/roles/${role.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-secondary px-3.5 py-2 font-label-caps text-label-caps text-secondary transition-colors hover:bg-surface-container-low"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          visibility
                        </span>
                        DETAIL
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Create role form */}
        <aside>
          <h2 className="font-label-caps text-label-caps text-secondary">
            ROLE BARU
          </h2>
          <div className="mt-4">
            <CreateRoleForm />
          </div>
        </aside>
      </div>
    </div>
  );
}
