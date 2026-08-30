"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const ADMIN_NAV: NavItem[] = [
  { href: "/app", label: "Home", icon: "dashboard" },
  { href: "/app/training", label: "Training", icon: "school" },
  { href: "/app/employees", label: "Karyawan", icon: "group" },
  { href: "/app/roles", label: "Roles", icon: "menu_book" },
];

const EMPLOYEE_NAV: NavItem[] = [
  { href: "/app", label: "Home", icon: "dashboard" },
  { href: "/app/my/modules", label: "Belajar", icon: "school" },
];

/**
 * Reference mobile bottom tab bar — active tab gets a primary-fixed-dim
 * pill behind a filled icon (admin_dashboard_employees_progress).
 */
export function MobileBottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const nav = isAdmin ? ADMIN_NAV : EMPLOYEE_NAV;

  function isActive(href: string): boolean {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-surface-container-lowest md:hidden">
      <div className="flex items-stretch justify-around px-2 py-1.5">
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 ${
                active ? "bg-primary-fixed-dim/60" : ""
              }`}
            >
              <span
                className={`material-symbols-outlined text-[22px] ${
                  active ? "text-primary ms-fill" : "text-secondary"
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`font-label-caps text-[10px] ${
                  active ? "text-primary" : "text-secondary"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
