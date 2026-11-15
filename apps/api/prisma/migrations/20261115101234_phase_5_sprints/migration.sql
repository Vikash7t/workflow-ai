-- AlterTable
ALTER TABLE "issues" ADD COLUMN     "sprintId" TEXT;

-- CreateTable
CREATE TABLE "sprints" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sprints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sprints_projectId_status_idx" ON "sprints"("projectId", "status");

-- CreateIndex
CREATE INDEX "sprints_workspaceId_idx" ON "sprints"("workspaceId");

-- CreateIndex
CREATE INDEX "issues_sprintId_idx" ON "issues"("sprintId");

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "sprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
