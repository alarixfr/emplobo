import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

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
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center border-b border-border px-4">
          <Link href="/app">
            <Image src="/logo.png" alt="Emplobo" width={140} height={36} />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3 text-sm">
          <Link
            href="/app"
            className="rounded-md px-3 py-2 font-medium text-foreground transition hover:bg-muted"
          >
            Dashboard
          </Link>
          {isAdmin ? (
            <Link
              href="/app/roles"
              className="rounded-md px-3 py-2 font-medium text-foreground transition hover:bg-muted"
            >
              Roles
            </Link>
          ) : (
            <span className="rounded-md px-3 py-2 text-muted-foreground">
              Modul Saya
            </span>
          )}
          {isAdmin ? (
            <>
              <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Segera
              </p>
              <Link
                href="/app/training"
                className="rounded-md px-3 py-2 font-medium text-foreground transition hover:bg-muted"
              >
                Training Room
              </Link>
            </>
          ) : null}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
          <div className="md:hidden">
            <Link href="/app">
              <Image src="/logo.png" alt="Emplobo" width={120} height={30} />
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {isAdmin ? (
              <div className="flex items-center gap-3 md:hidden">
                <Link
                  href="/app/roles"
                  className="text-sm font-medium text-foreground"
                >
                  Roles
                </Link>
                <Link
                  href="/app/training"
                  className="text-sm font-medium text-foreground"
                >
                  Training
                </Link>
              </div>
            ) : null}
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
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
