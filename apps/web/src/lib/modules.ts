export type EmployeeModuleSummary = {
  id: string;
  assignedAt: string;
  role: {
    id: string;
    name: string;
    description: string | null;
    status: "DRAFT" | "READY" | "PUBLISHED";
    guide: {
      id: string;
      title: string;
      version: number;
      publishedAt: string | null;
    } | null;
  };
};

export type ModuleGuide = {
  id: string;
  title: string;
  version: number;
  publishedAt: string | null;
};

export type ModuleChapter = {
  id: string;
  order: number;
  title: string;
  content: string;
  completedAt: string | null;
};
