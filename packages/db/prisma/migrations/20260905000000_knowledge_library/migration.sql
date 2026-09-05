-- CreateEnum
CREATE TYPE "KnowledgeSourceType" AS ENUM ('UPLOAD', 'MANUAL');

-- CreateEnum
CREATE TYPE "KnowledgeDocumentStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "KnowledgeQuota" (
    "orgId" TEXT NOT NULL,
    "usedBytes" INTEGER NOT NULL DEFAULT 0,
    "documentCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeQuota_pkey" PRIMARY KEY ("orgId")
);

-- CreateTable
CREATE TABLE "KnowledgeDocument" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "status" "KnowledgeDocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "sourceType" "KnowledgeSourceType" NOT NULL,
    "fileName" VARCHAR(255),
    "mimeType" VARCHAR(120),
    "sourceBytes" INTEGER NOT NULL,
    "contentHash" VARCHAR(128),
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "heading" VARCHAR(200),
    "content" TEXT NOT NULL,
    "tokenEst" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeDocument_orgId_idx" ON "KnowledgeDocument"("orgId");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_orgId_status_idx" ON "KnowledgeDocument"("orgId", "status");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_orgId_updatedAt_idx" ON "KnowledgeDocument"("orgId", "updatedAt");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_sourceType_idx" ON "KnowledgeDocument"("sourceType");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_documentId_order_idx" ON "KnowledgeChunk"("documentId", "order");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_orgId_idx" ON "KnowledgeChunk"("orgId");

-- AddForeignKey
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;