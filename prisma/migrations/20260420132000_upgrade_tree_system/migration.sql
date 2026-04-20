-- CreateEnum
CREATE TYPE "UpgradeResearchStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "UpgradeNodeProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpgradeNodeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpgradeResearchQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "targetLevel" INTEGER NOT NULL,
    "costCC" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completesAt" TIMESTAMP(3) NOT NULL,
    "status" "UpgradeResearchStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "refundCC" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpgradeResearchQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UpgradeNodeProgress_userId_nodeId_key" ON "UpgradeNodeProgress"("userId", "nodeId");

-- CreateIndex
CREATE INDEX "UpgradeNodeProgress_userId_idx" ON "UpgradeNodeProgress"("userId");

-- CreateIndex
CREATE INDEX "UpgradeResearchQueue_userId_status_idx" ON "UpgradeResearchQueue"("userId", "status");

-- CreateIndex
CREATE INDEX "UpgradeResearchQueue_userId_completesAt_idx" ON "UpgradeResearchQueue"("userId", "completesAt");

-- AddForeignKey
ALTER TABLE "UpgradeNodeProgress" ADD CONSTRAINT "UpgradeNodeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpgradeResearchQueue" ADD CONSTRAINT "UpgradeResearchQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
