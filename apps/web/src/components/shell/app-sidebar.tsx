"use client";

import { OrganizationSwitcher, UserButton, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const ADMIN_NAV: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: "dashboard" },
  { href: "/app/training", label: "Training Room", icon: "school" },
  { href: "/app/roles", label: "Roles", icon: "menu_book" },
  { href: "/app/employees", label: "Karyawan", icon: "group" },
];

const EMPLOYEE_NAV: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: "dashboard" },
  { href: "/app/my/modules", label: "Learning Center", icon: "school" },
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Reference SideNavBar: w-64 tonal sheet on surface-container-low with a
 * 1px outline-variant divider, label-caps nav items, and a user footer.
 */
export function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const { user } = useUser();

  const nav = isAdmin ? ADMIN_NAV : EMPLOYEE_NAV;
  const name = user?.fullName ?? user?.firstName ?? "Pengguna";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  function isActive(href: string): boolean {
    if (href === "/app") {
      return pathname === "/app";
    }
    return pathname.startsWith(href);
  }

  return (
    <nav className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-outline-variant bg-surface-container-low transition-all duration-300 md:flex">
      <div className="flex items-center justify-between p-6">
        <Link href="/app" aria-label="Emplobo">
          <Image src="/logo.png" alt="Emplobo" width={140} height={36} />
        </Link>
      </div>

      <div className="px-4 pb-4">
        <Link
          href={isAdmin ? "/app/roles#new-role" : "/app/my/modules"}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-label-caps text-label-caps text-on-primary shadow-sm transition-colors hover:bg-primary-container"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          {isAdmin ? "Role Baru" : "Lanjut Belajar"}
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 font-body-sm text-body-sm transition-colors ${
                active
                  ? "bg-primary-container font-medium text-on-primary-container"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[20px] ${
                  active
                    ? "text-on-primary-container ms-fill"
                    : "text-secondary group-hover:text-primary"
                }`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="border-t border-outline-variant p-4">
        <div className="flex items-center gap-3 px-3 py-2">
          <UserButton afterSignOutUrl="/" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-data-point text-data-point text-on-surface">
              {name}
            </p>
            <p className="truncate font-body-sm text-[12px] text-secondary">
              {email}
            </p>
          </div>
        </div>
        <div className="mt-2 px-3 pb-1">
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/app"
            afterSelectOrganizationUrl="/app"
            appearance={{
              elements: {
                rootBox: "w-full",
                organizationSwitcherTrigger: "w-full justify-start",
              },
            }}
          />
        </div>
        <div className="mt-2 flex flex-col gap-1">
          <a
            href="mailto:support@emplobo.app"
            className="group flex items-center gap-3 rounded-lg px-3 py-2.5 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-[20px] text-secondary group-hover:text-primary">
              support_agent
            </span>
            Support
          </a>
        </div>
      </div>
    </nav>
  );
}

export { initialsOf };
