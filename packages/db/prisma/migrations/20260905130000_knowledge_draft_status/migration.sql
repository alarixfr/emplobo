-- Knowledge workflow gate, step 1: introduce the DRAFT enum value.
-- (SET DEFAULT is deliberately a separate migration — Neon only allows new enum
-- values to be used after the transaction that created them has committed.)
ALTER TYPE "KnowledgeDocumentStatus" ADD VALUE 'DRAFT';
