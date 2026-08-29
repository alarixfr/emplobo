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
    <div className="mx-auto h-full w-full max-w-container space-y-6">
      <div>
        <h1 className="font-headline-md text-headline-md text-on-surface">
          Training Room
        </h1>
        <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
          Role sudah dipilih otomatis. Ganti role dari rail kiri jika
          diperlukan.
        </p>
      </div>

      <TrainingRoom roles={roles} initialRoleId={id} />
    </div>
  );
}
