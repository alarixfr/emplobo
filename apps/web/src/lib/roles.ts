export type RoleStatus = "DRAFT" | "READY" | "PUBLISHED";

export type TrainingRoleSummary = {
  id: string;
  name: string;
  description: string | null;
  status: RoleStatus;
  completenessScore: number;
  trainingMessageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TrainingRoleDetail = TrainingRoleSummary & {
  isActive: boolean;
  activeTrainerId: string | null;
  activeTrainerAt: string | null;
};

export type GuideQuestion = {
  id: string;
  question: string;
  options: [string, string, string, string];
};

export type GuideChapter = {
  id: string;
  order: number;
  title: string;
  content: string;
  quiz: {
    id: string;
    questions: GuideQuestion[];
  } | null;
};

export type RoleGuide = {
  id: string;
  title: string;
  version: number;
  publishedAt: string | null;
  updatedAt: string;
  chapters: GuideChapter[];
};

export const STATUS_LABEL: Record<RoleStatus, string> = {
  DRAFT: "Draft",
  READY: "Siap",
  PUBLISHED: "Dipublikasikan",
};

// ── Guide update lifecycle (draft review + version history) ───────────────
export type GuideChangeStats = {
  addedCount: number;
  updatedCount: number;
  removedCount: number;
  unchangedCount: number;
  hasChanges: boolean;
};

export type GuideDraftChapter = {
  title: string;
  content: string;
  quiz: {
    questions: {
      question: string;
      options: string[];
      correctIndex: number;
    }[];
  } | null;
};

export type GuideDraftFull = {
  id: string;
  title: string;
  baseVersion: number;
  targetVersion: number;
  createdAt: string;
  updatedAt: string;
  changes: GuideChangeStats & { text: string };
  summary: string;
  chapters: GuideDraftChapter[];
};

export type GuideVersionInfo = {
  id: string;
  version: number;
  title: string;
  summary: string;
  publishedBy: string;
  publishedByName: string | null;
  publishedAt: string;
};
