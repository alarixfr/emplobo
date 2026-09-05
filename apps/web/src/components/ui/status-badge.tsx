import type { RoleStatus } from "@/lib/roles";

/**
 * Label-caps pill status badge — DESIGN.md §Components:
 * Draft = gray, Ready = light blue, Published = light green (Forest Green).
 */
export function StatusBadge({ status }: { status: RoleStatus }) {
  const styles: Record<RoleStatus, string> = {
    DRAFT: "bg-surface-container-high text-on-surface-variant border-outline-variant",
    READY: "bg-status-ready/10 text-status-ready border-status-ready/40",
    PUBLISHED: "bg-primary-fixed/40 text-on-primary-fixed-variant border-primary-fixed-dim",
  };

  const labels: Record<RoleStatus, string> = {
    DRAFT: "DRAFT",
    READY: "READY",
    PUBLISHED: "PUBLISHED",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-label-caps text-label-caps border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
