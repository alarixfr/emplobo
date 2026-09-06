import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { ContentEditor } from "@/components/content/content-editor";

type PageProps = {
  params: Promise<{ roleId: string }>;
};

function isCuid(value: string): boolean {
  return /^c[a-z0-9]{24}$/.test(value);
}

export default async function ContentEditorPage({ params }: PageProps) {
  const { roleId } = await params;
  const { orgRole } = await auth();

  if (orgRole !== "org:admin") {
    redirect("/app");
  }

  if (!isCuid(roleId)) {
    notFound();
  }

  return <ContentEditor roleId={roleId} />;
}