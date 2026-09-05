import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { TrainingRoom } from "@/components/roles/training-room";
import { ApiError, apiFetch } from "@/lib/api";
import type { TrainingRoleSummary } from "@/lib/roles";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TrainingRolePage({ params }: PageProps) {
  const { id } = await params;
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
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  if (roles.length === 0) {
    redirect("/app/training");
  }

  const exists = roles.some((role) => role.id === id);
  if (!exists) {
    notFound();
  }

  return (
    <div className="mx-auto h-full w-full max-w-container space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">
            Training Room
          </h1>
          <p className="mt-1 max-w-2xl font-body-md text-body-md text-on-surface-variant">
            Latih AI dengan SOP dan pengetahuan bisnis Anda per role. Ganti role
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

      <TrainingRoom roles={roles} initialRoleId={id} />
    </div>
  );
}
