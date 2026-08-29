import type { RoleStatus } from "@/lib/roles";

/**
 * Label-caps pill status badge — DESIGN.md §Components:
 * Draft = gray, Ready = light blue, Published = light green (Forest Green).
 */
export function StatusBadge({ status }: { status: RoleStatus }) {
  const styles: Record<RoleStatus, string> = {
    DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
    READY: "bg-blue-100 text-blue-700 border-blue-200",
    PUBLISHED: "bg-green-100 text-primary border-green-200",
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
