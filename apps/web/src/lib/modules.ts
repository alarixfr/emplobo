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
  progress: {
    totalChapters: number;
    completedChapters: number;
    completionPct: number;
    avgBestScore: number | null;
  };
};

export type ModuleGuide = {
  id: string;
  title: string;
  version: number;
  publishedAt: string | null;
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
};

export type QuizAttemptSummary = {
  id: string;
  score: number;
  createdAt: string;
};

export type ModuleQuiz = {
  id: string;
  questions: QuizQuestion[];
  attempts: QuizAttemptSummary[];
  bestScore: number | null;
};

export type ModuleChapter = {
  id: string;
  order: number;
  title: string;
  content: string;
  completedAt: string | null;
  quiz: ModuleQuiz | null;
};

export type QuizQuestionResult = {
  questionId: string;
  isCorrect: boolean;
  selectedIndex: number;
  correctIndex?: number;
};

export type QuizSubmitResponse = {
  attempt: {
    id: string;
    score: number;
    createdAt: string;
    attemptNumber: number;
  };
  passed: boolean;
  score: number;
  correctCount: number;
  totalQuestions: number;
  results: QuizQuestionResult[];
  chapterCompleted: boolean;
};
