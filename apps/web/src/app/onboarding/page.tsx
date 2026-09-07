import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { MarketingFooter } from "@/components/shell/marketing-footer";

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // NOTE: no `if (orgId) redirect("/app")` here on purpose. OnboardingFlow is
  // the entry point for every signed-in user after login, and whether they go
  // to the dashboard, the business picker, or the invite-accept screen depends
  // on the full org list + pending invitations — data only Clerk exposes
  // client-side. Routing everyone here lets that decision happen in one place.

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-surface-muted">
      <header className="border-b border-outline-variant bg-surface-container-lowest/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-container items-center justify-between px-4 md:px-10">
          <Link href="/" aria-label="Emplobo">
            <Image src="/logo.png" alt="Emplobo" width={132} height={34} priority />
          </Link>
        </div>
      </header>

      <main className="flex w-full flex-1 items-center justify-center px-4 py-10 sm:py-12">
        <OnboardingFlow />
      </main>

      <MarketingFooter />
    </div>
  );
}
