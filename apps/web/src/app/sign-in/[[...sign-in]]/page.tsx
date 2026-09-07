import { SignIn } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { BackgroundBeams } from "@/components/ui/background-beams";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-muted px-4 py-10">
      <BackgroundBeams className="opacity-90" aria-hidden />
      <div className="relative z-10">
        <Reveal y={14} duration={0.7}>
          <Link href="/" className="mb-6 flex justify-center" aria-label="Emplobo">
            <Image src="/logo-icon.png" alt="Emplobo" width={56} height={56} priority className="rounded-2xl" />
          </Link>
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/app"
          />
        </Reveal>
      </div>
    </div>
  );
}