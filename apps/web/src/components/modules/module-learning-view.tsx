"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { EmployeeModuleSummary } from "@/lib/modules";
import { EmployeeChatTutor } from "./employee-chat-tutor";
import { ModuleReader } from "./module-reader";

type ModuleLearningViewProps = {
  roleId: string;
  initialTab?: "reader" | "tutor";
};

/**
 * Both panels stay mounted; switching tabs only toggles visibility so the
 * guide-reader position AND the AI-tutor conversation thread (session,
 * messages, scroll) survive a tab switch instead of remounting fresh.
 */
export function ModuleLearningView({ roleId, initialTab = "reader" }: ModuleLearningViewProps) {
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState<"reader" | "tutor">(initialTab);
  const [roleName, setRoleName] = useState<string | null>(null);

  // Best-effort: give the tutor a friendlier "AI Tutor: <Peran>" header.
  // Not worth gating the whole page on; default to plain "AI Tutor" if it
  // fails or the role can't be found.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const data = await apiFetch<EmployeeModuleSummary[]>(`/api/my/modules`, {
          token,
        });
        const match = data.find((m) => m.role.id === roleId);
        if (!cancelled && match) setRoleName(match.role.name);
      } catch {
        // ignore — cosmetic label only
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, roleId]);

  return (
    <div className="space-y-6">
      {/* Tab bar — label-caps, active tab in bold primary with underline */}
      <div className="flex gap-6 border-b border-outline-variant">
        <button
          type="button"
          onClick={() => setActiveTab("reader")}
          aria-pressed={activeTab === "reader"}
          aria-controls="panel-reader"
          className={`flex items-center gap-2 border-b-2 pb-3 pt-2 font-label-caps text-label-caps transition-colors ${
            activeTab === "reader"
              ? "border-primary font-bold text-primary"
              : "border-transparent text-secondary hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            menu_book
          </span>
          PANDUAN & KUIS
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tutor")}
          aria-pressed={activeTab === "tutor"}
          aria-controls="panel-tutor"
          className={`flex items-center gap-2 border-b-2 pb-3 pt-2 font-label-caps text-label-caps transition-colors ${
            activeTab === "tutor"
              ? "border-primary font-bold text-primary"
              : "border-transparent text-secondary hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            psychology
          </span>
          AI TUTOR (24/7)
        </button>
      </div>

      <div id="panel-reader" className={activeTab === "reader" ? "block" : "hidden"}>
        <ModuleReader roleId={roleId} />
      </div>
      <div id="panel-tutor" className={activeTab === "tutor" ? "block" : "hidden"}>
        <EmployeeChatTutor roleId={roleId} roleName={roleName ?? undefined} />
      </div>
    </div>
  );
}
