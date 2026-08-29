import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export default async function AppHomePage() {
  const { orgRole } = await auth();
  const user = await currentUser();

  const isAdmin = orgRole === "org:admin";
  const displayName =
    user?.fullName ??
    user?.firstName ??
    user?.primaryEmailAddress?.emailAddress ??
    "Pengguna";

  return (
    <div className="mx-auto w-full max-w-container space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">
            Halo, {displayName.split(" ")[0]}
          </h1>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
            {isAdmin
              ? "Pantau kesiapan AI business brain dan progress pelatihan tim Anda."
              : "Modul pembelajaran Anda akan muncul di sini. Lanjutkan progress Anda."}
          </p>
        </div>

        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/app/employees"
              className="inline-flex items-center gap-2 rounded-lg border border-secondary bg-surface-container-lowest px-4 py-2.5 font-label-caps text-label-caps text-secondary transition-colors hover:bg-surface-container-low"
            >
              <span className="material-symbols-outlined text-[18px]">
                person_add
              </span>
              KARYAWAN
            </Link>
            <Link
              href="/app/roles"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              ROLE BARU
            </Link>
          </div>
        ) : null}
      </div>

      {isAdmin ? (
        <AdminDashboard />
      ) : (
        <section className="rounded-xl border border-slate-200 bg-surface-container-lowest p-6 shadow-sm md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed">
              <span className="material-symbols-outlined ms-fill text-on-primary-fixed-variant">
                school
              </span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">
                Pembelajaran Anda
              </h2>
              <p className="mt-1 max-w-xl font-body-md text-body-md text-on-surface-variant">
                Buka modul yang sudah ditugaskan admin, selesaikan chapter,
                kerjakan kuis, dan tanya AI Tutor kapan saja.
              </p>
              <Link
                href="/app/my/modules"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
              >
                BUKA LEARNING CENTER
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
