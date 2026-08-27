import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ModuleLearningView } from "@/components/modules/module-learning-view";

type PageProps = {
  params: Promise<{ roleId: string }>;
};

export default async function MyModuleRolePage({ params }: PageProps) {
  const { roleId } = await params;
  const { orgRole } = await auth();

  if (orgRole !== "org:member") {
    redirect("/app");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link href="/app/my/modules" className="text-sm font-medium text-brand hover:underline">
          ← Semua modul saya
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">
          Modul Pembelajaran & AI Tutor
        </h1>
      </div>

      <ModuleLearningView roleId={roleId} />
    </div>
  );
}
