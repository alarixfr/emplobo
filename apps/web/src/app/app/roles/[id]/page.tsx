import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { RoleDetailPanels } from "@/components/roles/role-detail-panels";
import { ApiError, apiFetch } from "@/lib/api";
import { STATUS_LABEL, type RoleGuide, type TrainingRoleDetail } from "@/lib/roles";

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
  let guide: RoleGuide | null = null;
  try {
    const data = await apiFetch<{ role: TrainingRoleDetail }>(
      `/api/roles/${id}`,
      { token },
    );
    role = data.role;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/app/roles"
          className="text-sm font-medium text-brand hover:underline"
        >
          ← Semua roles
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">
          {role.name}
        </h1>
        {role.description ? (
          <p className="mt-1 text-muted-foreground">{role.description}</p>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Latih AI dengan SOP dan know-how untuk role ini. Semakin lengkap
          materinya, semakin tinggi skor kesiapan hingga panduan siap dibuat.
        </p>
        <div className="mt-3">
          <Link
            href={`/app/training/${role.id}`}
            className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
          >
            Buka Training Room
          </Link>
        </div>
      </div>

      <RoleDetailPanels
        roleId={role.id}
        roleName={role.name}
        initialStatus={role.status}
        initialGuide={guide}
      />

      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </dt>
          <dd className="mt-1 font-medium text-foreground">
            {STATUS_LABEL[role.status]}
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Completeness
          </dt>
          <dd className="mt-1 font-medium text-foreground">
            {role.completenessScore}%
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pesan training
          </dt>
          <dd className="mt-1 font-medium text-foreground">
            {role.trainingMessageCount}
          </dd>
        </div>
      </dl>

      <div className="rounded-lg border border-dashed border-border bg-brand-muted/40 p-4 text-sm text-foreground">
        <p className="font-medium">Cara kerja training</p>
        <p className="mt-1 text-muted-foreground">
          Admin melatih AI di halaman Training Room sampai materi dirasa cukup.
          AI mengevaluasi skor kelengkapan (0–100) dan menyarankan kapan
          panduan siap dibuat — mulai 75% status berubah menjadi READY.
        </p>
      </div>
    </div>
  );
}
