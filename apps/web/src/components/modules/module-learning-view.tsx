"use client";

import { useState } from "react";
import { BookOpenIcon, BotIcon } from "@/components/icons";
import { EmployeeChatTutor } from "./employee-chat-tutor";
import { ModuleReader } from "./module-reader";

type ModuleLearningViewProps = {
  roleId: string;
};

export function ModuleLearningView({ roleId }: ModuleLearningViewProps) {
  const [activeTab, setActiveTab] = useState<"reader" | "tutor">("reader");

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("reader")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === "reader"
              ? "border-brand text-brand"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpenIcon className="h-4 w-4" />
          <span>Panduan SOP & Kuis</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tutor")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === "tutor"
              ? "border-brand text-brand"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BotIcon className="h-4 w-4" />
          <span>Tanya AI Tutor (24/7)</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "reader" ? (
        <ModuleReader roleId={roleId} />
      ) : (
        <EmployeeChatTutor roleId={roleId} />
      )}
    </div>
  );
}
