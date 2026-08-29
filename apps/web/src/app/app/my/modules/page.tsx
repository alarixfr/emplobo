import { currentUser } from "@clerk/nextjs/server";
import { MyModulesList } from "@/components/modules/my-modules-list";

export default async function MyModulesPage() {
  const user = await currentUser();
  const displayName =
    user?.fullName ??
    user?.firstName ??
    user?.primaryEmailAddress?.emailAddress ??
    "Pengguna";

  return (
    <div className="mx-auto w-full max-w-container space-y-8">
      <div>
        <h1 className="font-headline-md text-headline-md text-on-surface">
          Selamat datang kembali, {displayName.split(" ")[0]}.
        </h1>
        <p className="mt-1 font-body-lg text-body-lg text-on-surface-variant">
          Lanjutkan modul pelatihan yang ditugaskan admin Anda — baca panduan,
          kerjakan kuis, dan tanya AI Tutor kapan saja.
        </p>
      </div>

      <MyModulesList />
    </div>
  );
}
