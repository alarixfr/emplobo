import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { MarketingFooter } from "@/components/shell/marketing-footer";

export default async function OnboardingPage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

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
        <OnboardingFlow />
      </main>

      <MarketingFooter />
    </div>
  );
}
