import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ModuleLearningView } from "@/components/modules/module-learning-view";

type PageProps = {
  params: Promise<{ roleId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function MyModuleRolePage({ params, searchParams }: PageProps) {
  const { roleId } = await params;
  const { tab } = await searchParams;
  const { orgRole } = await auth();

  if (orgRole !== "org:member") {
    redirect("/app");
  }

  return (
    <div className="mx-auto h-full w-full max-w-container space-y-6">
      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 font-label-caps text-label-caps text-secondary"
      >
        <Link
          href="/app/my/modules"
          className="transition-colors hover:text-primary"
        >
          LEARNING CENTER
        </Link>
        <span className="material-symbols-outlined text-[14px]">
          chevron_right
        </span>
        <span className="text-on-surface">MODUL</span>
      </nav>

      <ModuleLearningView roleId={roleId} initialTab={tab === "tutor" ? "tutor" : "reader"} />
    </div>
  );
}
