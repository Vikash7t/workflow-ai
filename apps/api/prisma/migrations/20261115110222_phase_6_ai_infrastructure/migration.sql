-- CreateTable
CREATE TABLE "ai_session_actions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL DEFAULT 'DECOMPOSE_TASKS',
    "rawInput" TEXT NOT NULL,
    "plan" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "committedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_session_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_request_audits" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUSD" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_request_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_session_actions_workspaceId_projectId_idx" ON "ai_session_actions"("workspaceId", "projectId");

-- CreateIndex
CREATE INDEX "ai_session_actions_userId_idx" ON "ai_session_actions"("userId");

-- CreateIndex
CREATE INDEX "ai_session_actions_status_idx" ON "ai_session_actions"("status");

-- CreateIndex
CREATE INDEX "ai_request_audits_workspaceId_idx" ON "ai_request_audits"("workspaceId");

-- CreateIndex
CREATE INDEX "ai_request_audits_userId_idx" ON "ai_request_audits"("userId");

-- CreateIndex
CREATE INDEX "ai_request_audits_createdAt_idx" ON "ai_request_audits"("createdAt");

-- AddForeignKey
ALTER TABLE "ai_session_actions" ADD CONSTRAINT "ai_session_actions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_session_actions" ADD CONSTRAINT "ai_session_actions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_session_actions" ADD CONSTRAINT "ai_session_actions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_request_audits" ADD CONSTRAINT "ai_request_audits_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_request_audits" ADD CONSTRAINT "ai_request_audits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
