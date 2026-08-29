export type EmployeeDirectoryEntry = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  joinedAt: string;
  assignments: Array<{
    roleId: string;
    roleName: string;
    completionPct: number;
  }>;
  avgCompletionPct: number;
  avgQuizBestScore: number | null;
};
