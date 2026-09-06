import { SignIn } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-4 py-10">
      <Reveal y={14} duration={0.7}>
        <Link href="/" className="mb-6 flex justify-center" aria-label="Emplobo">
          <Image src="/logo.png" alt="Emplobo" width={160} height={40} priority />
        </Link>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/app"
        />
      </Reveal>
    </div>
  );
}