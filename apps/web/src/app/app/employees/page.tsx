import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { EmployeeDirectory } from "@/components/employees/employee-directory";

export default async function EmployeesPage() {
  const { orgRole } = await auth();

  if (orgRole !== "org:admin") {
    redirect("/app");
  }

  return (
    <div className="mx-auto w-full max-w-container space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">
            Employee Directory
          </h1>
          <p className="mt-1 max-w-2xl font-body-md text-body-md text-on-surface-variant">
            Pantau progress pelatihan setiap karyawan: modul yang diikuti,
            penyelesaian chapter, dan nilai kuis terbaik mereka.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/app/roles"
            className="inline-flex items-center gap-2 rounded-lg border border-secondary bg-surface-container-lowest px-4 py-2.5 font-label-caps text-label-caps text-secondary transition-colors hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[18px]">
              assignment
            </span>
            TUGASKAN ROLE
          </Link>
        </div>
      </div>

      <EmployeeDirectory />
    </div>
  );
}
