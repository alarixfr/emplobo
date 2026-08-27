export type ChatSessionSummary = {
  id: string;
  roleId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
  };
};

export type ChatMessageItem = {
  id: string;
  sender: "user" | "ai";
  content: string;
  createdAt: string;
};
