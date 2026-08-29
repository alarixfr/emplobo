import { OrganizationList } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MarketingFooter } from "@/components/shell/marketing-footer";

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
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <header className="border-b border-outline-variant bg-surface-container-lowest/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-container items-center justify-between px-4 md:px-10">
          <Link href="/" aria-label="Emplobo">
            <Image src="/logo.png" alt="Emplobo" width={132} height={34} priority />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-surface-container-lowest p-8 text-center shadow-sm md:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-container">
            <span className="material-symbols-outlined ms-fill text-[28px] text-on-primary-container">
              storefront
            </span>
          </div>
          <h1 className="mt-5 font-headline-sm text-headline-sm text-on-surface">
            Buat atau pilih bisnis Anda
          </h1>
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
            Setiap organisasi = satu UMKM. Buat organisasi baru atau terima
            undangan, lalu lanjut ke dashboard Emplobo.
          </p>

          <div className="mt-8 [&_.cl-organizationList]:w-full">
            <OrganizationList
              hidePersonal
              afterCreateOrganizationUrl="/app"
              afterSelectOrganizationUrl="/app"
            />
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
