-- Guide update lifecycle: regenerating a published guide now produces a
-- reviewable GuideDraft (never a silent live clobber), publishing is atomic
-- and progress-preserving, and every publish records an immutable
-- GuideVersion snapshot (history + rollback).

-- CreateTable
CREATE TABLE "GuideDraft" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "baseVersion" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideVersion" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "summary" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "publishedBy" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuideVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuideDraft_roleId_key" ON "GuideDraft"("roleId");

-- CreateIndex
CREATE INDEX "GuideDraft_orgId_idx" ON "GuideDraft"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "GuideVersion_guideId_version_key" ON "GuideVersion"("guideId", "version");

-- CreateIndex
CREATE INDEX "GuideVersion_guideId_idx" ON "GuideVersion"("guideId");

-- CreateIndex
CREATE INDEX "GuideVersion_orgId_idx" ON "GuideVersion"("orgId");

-- AddForeignKey
ALTER TABLE "GuideDraft" ADD CONSTRAINT "GuideDraft_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "TrainingRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideVersion" ADD CONSTRAINT "GuideVersion_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (employee assignment now records which guide version was current)
ALTER TABLE "EmployeeModule" ADD COLUMN "assignedGuideVersion" INTEGER NOT NULL DEFAULT 1;