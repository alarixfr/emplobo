import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { STATUS_LABEL, type TrainingRoleDetail } from "@/lib/roles";

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
        <p className="font-medium">Training Room — Section 4</p>
        <p className="mt-1 text-muted-foreground">
          Setelah Role dibuat (status DRAFT), admin melatih AI di Training Room.
          Fitur itu dibangun di langkah berikutnya.
        </p>
      </div>
    </div>
  );
}
