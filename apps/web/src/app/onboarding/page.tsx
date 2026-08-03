import { OrganizationList } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Already in an org — go to the app
  if (orgId) {
    redirect("/app");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--brand-muted)_0%,_var(--background)_55%)] px-4">
      <Image
        src="/logo.png"
        alt="Emplobo"
        width={160}
        height={40}
        priority
        className="mb-4"
      />
      <h1 className="mb-2 font-display text-2xl font-semibold text-foreground">
        Buat atau pilih bisnis
      </h1>
      <p className="mb-8 max-w-md text-center text-sm text-muted-foreground">
        Setiap organisasi Clerk = satu UMKM. Buat organisasi baru atau terima
        undangan, lalu lanjut ke dashboard.
      </p>
      <OrganizationList
        hidePersonal
        afterCreateOrganizationUrl="/app"
        afterSelectOrganizationUrl="/app"
      />
    </div>
  );
}
