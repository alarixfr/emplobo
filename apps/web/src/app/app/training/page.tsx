import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TrainingRoom } from "@/components/roles/training-room";
import { Reveal } from "@/components/motion/reveal";
import { ApiError, apiFetch } from "@/lib/api";
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
  let loadError: string | null = null;
  try {
    const data = await apiFetch<{ roles: TrainingRoleSummary[] }>("/api/roles", {
      token,
    });
    roles = data.roles;
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) {
      loadError =
        "Database sedang tidak tersedia. Coba refresh beberapa saat lagi atau periksa koneksi Neon.";
    } else {
      loadError =
        "Gagal memuat role training. Pastikan API aktif dan sesi masih valid.";
    }
  }

  return (
    <div className="mx-auto h-full w-full max-w-container space-y-8">
      <Reveal y={18} x={0} delay={0} duration={0.7}>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface">
              Training Room
            </h1>
            <p className="mt-1 max-w-2xl font-body-md text-body-md text-on-surface-variant">
              Latih AI dengan SOP dan pengetahuan bisnis Anda per role. Pilih role
              dari rail kiri, atau lampirkan file SOP dari Knowledge Library
              sebagai bahan tambahan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/app/knowledge"
              className="inline-flex items-center gap-2 rounded-lg border border-secondary bg-surface-container-lowest px-4 py-2.5 font-label-caps text-label-caps text-secondary transition-colors hover:bg-surface-container-low"
            >
              <span className="material-symbols-outlined text-[18px]">
                database
              </span>
              KNOWLEDGE
            </Link>
          </div>
        </div>
      </Reveal>

      {loadError ? (
        <div className="rounded-lg border border-error-container bg-error-container/40 p-6 font-body-sm text-body-sm text-error">
          {loadError}
        </div>
      ) : roles.length === 0 ? (
        <section className="rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center">
          <p className="font-body-md text-body-md text-on-surface-variant">
            Belum ada role untuk dilatih. Buat role baru terlebih dahulu.
          </p>
          <Link
            href="/app/roles#new-role"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            BUAT ROLE
          </Link>
        </section>
      ) : (
        <TrainingRoom roles={roles} />
      )}
    </div>
  );
}
