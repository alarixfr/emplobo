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

export const STATUS_LABEL: Record<RoleStatus, string> = {
  DRAFT: "Draft",
  READY: "Siap",
  PUBLISHED: "Dipublikasikan",
};
