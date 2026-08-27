import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export default async function AppHomePage() {
  const { orgId, orgRole, orgSlug } = await auth();
  const user = await currentUser();

  const isAdmin = orgRole === "org:admin";
  const appRole = isAdmin ? "ADMIN" : "EMPLOYEE";
  const displayName =
    user?.fullName ??
    user?.firstName ??
    user?.primaryEmailAddress?.emailAddress ??
    "Pengguna";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Halo, {displayName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isAdmin
            ? "Kelola roles dan latih AI bisnis Anda."
            : "Modul pembelajaran Anda akan muncul di sini."}
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Organisasi
          </dt>
          <dd className="mt-1 font-medium text-foreground">
            {orgSlug ?? orgId ?? "—"}
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Peran di app
          </dt>
          <dd className="mt-1 font-medium text-foreground">
            {appRole}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({orgRole})
            </span>
          </dd>
        </div>
      </dl>

      {isAdmin ? (
        <>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-medium text-foreground">Langkah berikutnya</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Buat role kerja (Kasir, Barista, …) lalu latih AI di Training Room untuk menghasilkan panduan SOP.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/app/roles"
                className="inline-flex rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
              >
                Kelola Roles
              </Link>
              <Link
                href="/app/training"
                className="inline-flex rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Buka Training Room
              </Link>
            </div>
          </div>

          <AdminDashboard />
        </>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="font-medium text-foreground">Pembelajaran Anda</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Buka modul yang sudah di-assign admin dan lanjutkan progress chapter.
          </p>
          <Link
            href="/app/my/modules"
            className="mt-3 inline-flex rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
          >
            Buka Modul Saya
          </Link>
        </div>
      )}
    </div>
  );
}
