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
