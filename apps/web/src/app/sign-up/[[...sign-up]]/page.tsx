import { SignUp } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-4 py-10">
      <Reveal y={14} duration={0.7}>
        <Link href="/" className="mb-6 flex justify-center" aria-label="Emplobo">
          <Image src="/logo.png" alt="Emplobo" width={160} height={40} priority />
        </Link>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/onboarding"
        />
      </Reveal>
    </div>
  );
}