import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/privacy", label: "Privasi" },
  { href: "/terms", label: "Syarat & Ketentuan" },
  { href: "/docs", label: "Developer Docs" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-outline-variant bg-surface-container-low">
      <div className="mx-auto flex w-full max-w-container flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row md:px-10">
        <p className="font-body-sm text-body-sm text-secondary">
          © {new Date().getFullYear()} Emplobo. Empowering UMKM Growth.
        </p>
        <nav className="flex flex-wrap items-center gap-5">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-label-caps text-label-caps text-secondary transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
