import { SignIn } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--brand-muted)_0%,_var(--background)_55%)] px-4">
      <Link href="/" className="mb-8">
        <Image src="/logo.png" alt="Emplobo" width={160} height={40} priority />
      </Link>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/app"
      />
    </div>
  );
}
