import { SignIn } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-4">
      <Link href="/" className="mb-8" aria-label="Emplobo">
        <Image src="/logo.png" alt="Emplobo" width={160} height={40} priority />
      </Link>
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-surface-container-lowest p-8 shadow-sm">
        <h1 className="font-headline-sm text-headline-sm text-on-surface">
          Masuk ke Emplobo
        </h1>
        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
          Lanjutkan dengan akun organisasi UMKM Anda.
        </p>
        <div className="mt-6 [&_.cl-card]:shadow-none [&_.cl-card]:border-none [&_.cl-card]:p-0">
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/app"
          />
        </div>
      </div>
    </div>
  );
}
