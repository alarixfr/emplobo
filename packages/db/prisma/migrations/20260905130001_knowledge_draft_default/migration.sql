-- Knowledge workflow gate, step 2: new knowledge defaults to DRAFT.
ALTER TABLE "KnowledgeDocument" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
