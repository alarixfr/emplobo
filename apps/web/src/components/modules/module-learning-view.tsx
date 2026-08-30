"use client";

import { useState } from "react";
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
  const [activeTab, setActiveTab] = useState<"reader" | "tutor">(initialTab);

  return (
    <div className="space-y-6">
      {/* Tab bar — label-caps, active tab in bold primary with underline */}
      <div className="flex gap-6 border-b border-outline-variant">
        <button
          type="button"
          onClick={() => setActiveTab("reader")}
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

      <div className={activeTab === "reader" ? "block" : "hidden"}>
        <ModuleReader roleId={roleId} />
      </div>
      <div className={activeTab === "tutor" ? "block" : "hidden"}>
        <EmployeeChatTutor roleId={roleId} />
      </div>
    </div>
  );
}
