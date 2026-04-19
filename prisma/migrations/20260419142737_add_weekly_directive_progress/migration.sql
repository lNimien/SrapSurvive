-- CreateEnum
CREATE TYPE "WeeklyDirectiveStatus" AS ENUM ('IN_PROGRESS', 'CLAIMABLE', 'CLAIMED');

-- CreateTable
CREATE TABLE "WeeklyDirectiveProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "directiveKey" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "target" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "WeeklyDirectiveStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "rewardCC" INTEGER NOT NULL,
    "rewardXP" INTEGER NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "claimReferenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyDirectiveProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyDirectiveProgress_userId_weekStart_idx" ON "WeeklyDirectiveProgress"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "WeeklyDirectiveProgress_userId_weekStart_status_idx" ON "WeeklyDirectiveProgress"("userId", "weekStart", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyDirectiveProgress_userId_directiveKey_weekStart_key" ON "WeeklyDirectiveProgress"("userId", "directiveKey", "weekStart");

-- AddForeignKey
ALTER TABLE "WeeklyDirectiveProgress" ADD CONSTRAINT "WeeklyDirectiveProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
