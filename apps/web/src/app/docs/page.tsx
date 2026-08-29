import { DeveloperDocs } from "@/components/docs/developer-docs";
import { MarketingFooter } from "@/components/shell/marketing-footer";
import { MarketingHeader } from "@/components/shell/marketing-header";

export default function DocsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-container flex-1 px-4 py-12 md:px-10">
        <DeveloperDocs />
      </main>
      <MarketingFooter />
    </div>
  );
}
