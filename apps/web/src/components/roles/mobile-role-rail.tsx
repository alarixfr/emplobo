"use client";

import { useEffect, useRef } from "react";
import type { TrainingRoleSummary } from "@/lib/roles";

type MobileRoleRailProps = {
  roles: TrainingRoleSummary[];
  activeRoleId: string;
  onSelect: (roleId: string) => void;
};

function statusLabel(role: TrainingRoleSummary): string {
  if (role.status === "PUBLISHED") return "PUBLISHED";
  if (role.status === "READY") return "READY";
  return role.completenessScore > 0 ? "IN PROGRESS" : "DRAFT";
}

/**
 * Mobile role switcher — swipeable snap rail that carries the same context
 * the desktop "Roles Context" rail does (name, status, completeness, active
 * ring) instead of hiding it inside a native select. The active card is kept
 * centered so the admin always knows which role the chat below belongs to.
 */
export function MobileRoleRail({ roles, activeRoleId, onSelect }: MobileRoleRailProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const activeCardRef = useRef<HTMLButtonElement | null>(null);

  // Keep the active role centered as it changes (initial load + navigation).
  useEffect(() => {
    activeCardRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "smooth",
    });
  }, [activeRoleId]);

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between">
        <label
          htmlFor="training-role-rail"
          className="font-label-caps text-label-caps text-secondary"
        >
          PILIH ROLE
        </label>
        <span className="flex items-center gap-1 font-body-sm text-[11px] text-secondary">
          <span className="material-symbols-outlined text-[12px]">swipe</span>
          geser
        </span>
      </div>

      <div
        id="training-role-rail"
        ref={railRef}
        aria-label="Pilih role training"
        className="scroll-slim -mx-4 mt-2 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1"
      >
        {roles.map((role) => {
          const active = role.id === activeRoleId;
          return (
            <button
              key={role.id}
              ref={active ? activeCardRef : null}
              type="button"
              aria-current={active ? "true" : undefined}
              onClick={() => !active && onSelect(role.id)}
              className={`flex min-w-[150px] shrink-0 snap-start flex-col gap-2 rounded-lg border p-3 text-left transition-colors ${
                active
                  ? "border-primary bg-primary-fixed-dim/40 shadow-sm ring-1 ring-primary"
                  : "border-outline-variant bg-surface-container-lowest shadow-sm hover:border-outline"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span
                  className={`truncate font-data-point text-data-point text-on-surface ${
                    active ? "font-bold" : ""
                  }`}
                >
                  {role.name}
                </span>
                <span
                  className={`shrink-0 font-data-point text-[12px] font-bold ${
                    active ? "text-primary" : "text-secondary"
                  }`}
                >
                  {role.completenessScore}%
                </span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 font-label-caps text-[10px] ${
                  active ? "text-primary" : "text-secondary"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${
                    role.status === "PUBLISHED"
                      ? "bg-primary-fixed-dim"
                      : role.status === "READY"
                        ? "bg-status-ready"
                        : "bg-outline"
                  }`}
                />
                {statusLabel(role)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}