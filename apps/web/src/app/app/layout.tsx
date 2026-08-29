import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (!orgId) {
    redirect("/onboarding");
  }

  const isAdmin = orgRole === "org:admin";

  return (
    <div className="flex h-full bg-surface-muted text-on-surface">
      <AppSidebar isAdmin={isAdmin} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-outline-variant bg-surface p-4 md:hidden">
          <Link href="/app" aria-label="Emplobo">
            <Image src="/logo.png" alt="Emplobo" width={110} height={28} />
          </Link>
          <div className="flex items-center gap-2">
            <OrganizationSwitcher
              hidePersonal
              afterCreateOrganizationUrl="/app"
              afterSelectOrganizationUrl="/app"
              appearance={{
                elements: {
                  rootBox: "flex items-center",
                },
              }}
            />
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        <main className="flex-1 p-margin-mobile md:p-margin-desktop md:pb-margin-desktop pb-24">
          {children}
        </main>
      </div>

      <MobileBottomNav isAdmin={isAdmin} />
    </div>
  );
}
