export type KnowledgeSourceType = "UPLOAD" | "MANUAL";

export type KnowledgeDocumentSummary = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  sourceType: KnowledgeSourceType;
  fileName: string | null;
  mimeType: string | null;
  sourceBytes: number;
  contentHash: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  chunkCount: number;
  excerpt: string;
};

export type KnowledgeDocumentDetail = KnowledgeDocumentSummary & {
  content: string;
  chunks: Array<{
    id: string;
    order: number;
    heading: string | null;
    content: string;
    tokenEst: number;
  }>;
};

export type KnowledgeQuota = {
  usedBytes: number;
  documentCount: number;
  limitBytes: number;
  remainingBytes: number;
  usedPct: number;
  draftCount: number;
  draftLimit: number;
};

export type KnowledgeLibraryResponse = {
  quota: KnowledgeQuota;
  documents: KnowledgeDocumentSummary[];
};
