import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { KnowledgeLibrary } from "@/components/knowledge/knowledge-library";
import { Reveal } from "@/components/motion/reveal";

export default async function KnowledgePage() {
  const { orgRole } = await auth();

  if (orgRole !== "org:admin") {
    redirect("/app");
  }

  return (
    <div className="mx-auto w-full max-w-container space-y-8">
      <Reveal y={18} x={0} delay={0} duration={0.7}>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface">
              Knowledge Library
            </h1>
            <p className="mt-1 max-w-2xl font-body-md text-body-md text-on-surface-variant">
              Simpan SOP, catatan manual, dan file operasional organisasi di satu
              tempat yang dipakai juga oleh AI training dan AI tutor.
            </p>
          </div>
        </div>
      </Reveal>

      <KnowledgeLibrary />
    </div>
  );
}