import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { RoleDetailPanels } from "@/components/roles/role-detail-panels";
import { ReadinessRing } from "@/components/ui/readiness-ring";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiError, apiFetch } from "@/lib/api";
import type { RoleGuide, TrainingRoleDetail } from "@/lib/roles";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RoleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { orgRole, getToken } = await auth();

  if (orgRole !== "org:admin") {
    redirect("/app");
  }

  const token = await getToken();
  if (!token) {
    redirect("/sign-in");
  }

  let role: TrainingRoleDetail;
  let missingAreas: string[] = [];
  try {
    const data = await apiFetch<{ role: TrainingRoleDetail; missingAreas?: string[] }>(
      `/api/roles/${id}`,
      { token },
    );
    role = data.role;
    missingAreas = data.missingAreas ?? [];
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  let guide: RoleGuide | null = null;
  try {
    const guideData = await apiFetch<{ guide: RoleGuide }>(`/api/roles/${id}/guide`, {
      token,
    });
    guide = guideData.guide;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      guide = null;
    } else {
      throw err;
    }
  }

  return (
    <div className="mx-auto w-full max-w-container space-y-6">
      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 font-label-caps text-label-caps text-secondary"
      >
        <Link href="/app/roles" className="transition-colors hover:text-primary">
          ROLES
        </Link>
        <span className="material-symbols-outlined text-[14px]">
          chevron_right
        </span>
        <span className="text-on-surface">{role.name.toUpperCase()}</span>
      </nav>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-headline-md text-headline-md text-on-surface">
              {role.name}
            </h1>
            <StatusBadge status={role.status} />
          </div>
          {role.description ? (
            <p className="mt-1 max-w-2xl font-body-md text-body-md text-on-surface-variant">
              {role.description}
            </p>
          ) : null}
        </div>
        <Link
          href={`/app/training/${role.id}`}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
        >
          <span className="material-symbols-outlined text-[18px]">school</span>
          BUKA TRAINING ROOM
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left column: guide generation + assignment */}
        <div className="space-y-6">
          <RoleDetailPanels
            roleId={role.id}
            roleName={role.name}
            initialStatus={role.status}
            initialGuide={guide}
          />
        </div>

        {/* Right rail: readiness + gaps */}
        <aside className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-surface-container-lowest p-5 text-center shadow-sm">
            <h2 className="mb-4 font-headline-sm text-[18px] text-on-surface">
              Brain Readiness
            </h2>
            <ReadinessRing percent={role.completenessScore} />
            <p className="font-body-sm text-body-sm text-secondary">
              Completeness
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 bg-surface-container-lowest p-4 shadow-sm">
              <dt className="font-label-caps text-[10px] text-secondary">
                PESAN TRAINING
              </dt>
              <dd className="mt-1 font-headline-sm text-[24px] text-on-surface">
                {role.trainingMessageCount}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-200 bg-surface-container-lowest p-4 shadow-sm">
              <dt className="font-label-caps text-[10px] text-secondary">
                CHAPTER GUIDE
              </dt>
              <dd className="mt-1 font-headline-sm text-[24px] text-on-surface">
                {guide ? guide.chapters.length : "—"}
              </dd>
            </div>
          </dl>

          <div className="rounded-lg border border-slate-200 bg-surface-container-lowest p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 font-headline-sm text-[18px] text-on-surface">
              <span className="material-symbols-outlined text-status-locked">
                error
              </span>
              Knowledge Gaps
            </h2>
            {missingAreas.length === 0 ? (
              <p className="font-body-sm text-body-sm text-secondary">
                AI mengevaluasi kelengkapan setiap 5 pesan training. Celah
                pengetahuan yang terdeteksi akan muncul di sini.
              </p>
            ) : (
              <ul className="space-y-2">
                {missingAreas.map((gap, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 rounded-lg border border-status-locked border-l-4 bg-surface-bright p-3"
                  >
                    <span className="material-symbols-outlined mt-0.5 text-[18px] text-status-locked">
                      pending
                    </span>
                    <span className="font-data-point text-data-point font-bold text-on-surface">
                      {gap}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-4">
            <p className="font-body-sm text-body-sm font-medium text-on-surface">
              Cara kerja training
            </p>
            <p className="mt-1 font-body-sm text-[12px] leading-5 text-secondary">
              Admin melatih AI di Training Room sampai materi dirasa cukup. AI
              mengevaluasi skor kelengkapan (0–100) dan menyarankan kapan
              panduan siap dibuat — mulai 75% status berubah menjadi SIAP.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
