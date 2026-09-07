import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { KnowledgeGaps } from "@/components/roles/knowledge-gaps";
import { RoleDetailPanels } from "@/components/roles/role-detail-panels";
import { RoleActions } from "@/components/roles/role-actions";
import { ReadinessRing } from "@/components/ui/readiness-ring";
import { StatusBadge } from "@/components/ui/status-badge";
import { Reveal } from "@/components/motion/reveal";
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
  let pendingGuideDraft: {
    id: string;
    title: string;
    baseVersion: number;
    createdAt: string;
    updatedAt: string;
  } | null = null;
  try {
    const data = await apiFetch<{
      role: TrainingRoleDetail;
      missingAreas?: string[];
      guideDraft?: typeof pendingGuideDraft;
    }>(`/api/roles/${id}`, { token });
    role = data.role;
    missingAreas = data.missingAreas ?? [];
    pendingGuideDraft = data.guideDraft ?? null;
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

      <Reveal y={18} x={0} delay={0} duration={0.7}>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-headline-md text-headline-md text-on-surface">
                {role.name}
              </h1>
              <StatusBadge status={role.status} />
              {pendingGuideDraft ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-status-ready/10 px-2.5 py-1 font-label-caps text-[10px] text-status-ready">
                  <span className="material-symbols-outlined ms-fill text-[12px]">
                    update
                  </span>
                  DRAF PERUBAHAN MENUNGGU TINJAUAN
                </span>
              ) : null}
            </div>
            {role.description ? (
              <p className="mt-1 max-w-2xl font-body-md text-body-md text-on-surface-variant">
                {role.description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {guide ? (
              <Link
                href={`/app/content/${role.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2.5 font-label-caps text-label-caps text-primary transition-colors hover:bg-primary-fixed-dim/40"
              >
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                EDIT KONTEN
              </Link>
            ) : null}
            <Link
              href={`/app/training/${role.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
            >
              <span className="material-symbols-outlined text-[18px]">school</span>
              BUKA TRAINING ROOM
            </Link>
            <RoleActions role={role} redirectOnDelete="/app/roles" />
          </div>
        </div>
      </Reveal>

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
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 text-center shadow-sm">
            <h2 className="mb-4 font-headline-sm text-[18px] text-on-surface">
              Kesiapan AI
            </h2>
            <ReadinessRing percent={role.completenessScore} />
            <p className="font-body-sm text-body-sm text-secondary">
              Kelengkapan
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
              <dt className="font-label-caps text-[10px] text-secondary">
                PESAN TRAINING
              </dt>
              <dd className="mt-1 font-headline-sm text-headline-sm text-on-surface">
                {role.trainingMessageCount}
              </dd>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
              <dt className="font-label-caps text-[10px] text-secondary">
                CHAPTER GUIDE
              </dt>
              <dd className="mt-1 font-headline-sm text-headline-sm text-on-surface">
                {guide ? guide.chapters.length : "—"}
              </dd>
            </div>
          </dl>

          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
            <KnowledgeGaps gaps={missingAreas} />
          </div>

          <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-4">
            <p className="font-body-sm text-body-sm font-medium text-on-surface">
              Cara kerja training
            </p>
            <p className="mt-1 font-body-sm text-[12px] leading-5 text-secondary">
              Admin melatih AI di Training Room sampai materi dirasa cukup. AI
              mengevaluasi skor kelengkapan (0-100) dan menyarankan kapan
              panduan siap dibuat. Mulai 70%, status berubah menjadi READY.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
