import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MyModulesList } from "@/components/modules/my-modules-list";

export default async function MyModulesPage() {
  const { orgRole } = await auth();

  if (orgRole !== "org:member") {
    redirect("/app");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">Modul Saya</h1>
        <p className="mt-1 text-muted-foreground">
          Daftar role yang sudah di-assign admin untuk dipelajari.
        </p>
      </div>

      <MyModulesList />
    </div>
  );
}
