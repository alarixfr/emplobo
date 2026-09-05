export type EditorRoleStatus = "DRAFT" | "READY" | "PUBLISHED";

export type EditorQuestion = {
  id: string | null;
  order: number;
  question: string;
  options: string[];
  correctIndex: number;
};

export type EditorQuiz = {
  id: string | null;
  questions: EditorQuestion[];
};

export type EditorChapter = {
  id: string | null;
  order: number;
  title: string;
  content: string;
  quiz: EditorQuiz | null;
};

export type EditorRole = {
  id: string;
  name: string;
  status: EditorRoleStatus;
  completenessScore: number;
};

export type EditorGuide = {
  id: string;
  title: string;
  version: number;
  publishedAt: string | null;
  updatedAt: string;
  chapters: EditorChapter[];
};

export type EditorResponse = {
  role: EditorRole;
  guide: EditorGuide;
};

export type ContentHubRole = {
  id: string;
  name: string;
  description: string | null;
  status: EditorRoleStatus;
  completenessScore: number;
  trainingMessageCount: number;
  updatedAt: string;
  guide: {
    id: string;
    title: string;
    version: number;
    publishedAt: string | null;
    updatedAt: string;
    chapterCount: number;
    questionCount: number;
  } | null;
};

export type ContentHubResponse = {
  roles: ContentHubRole[];
};