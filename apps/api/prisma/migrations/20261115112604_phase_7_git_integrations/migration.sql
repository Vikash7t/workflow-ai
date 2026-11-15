-- CreateTable
CREATE TABLE "git_integrations" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "git_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "git_integrations_workspaceId_idx" ON "git_integrations"("workspaceId");

-- CreateIndex
CREATE INDEX "git_integrations_projectId_idx" ON "git_integrations"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "git_integrations_projectId_provider_repository_key" ON "git_integrations"("projectId", "provider", "repository");

-- CreateIndex
CREATE INDEX "webhook_events_integrationId_idx" ON "webhook_events"("integrationId");

-- CreateIndex
CREATE INDEX "webhook_events_createdAt_idx" ON "webhook_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_integrationId_deliveryId_key" ON "webhook_events"("integrationId", "deliveryId");

-- AddForeignKey
ALTER TABLE "git_integrations" ADD CONSTRAINT "git_integrations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "git_integrations" ADD CONSTRAINT "git_integrations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "git_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
