-- CreateTable
CREATE TABLE "MutatorTuningOverride" (
    "id" TEXT NOT NULL,
    "mutatorId" TEXT NOT NULL,
    "runMode" TEXT NOT NULL,
    "rewardDeltaPercent" INTEGER NOT NULL DEFAULT 0,
    "dangerPressureDeltaPercent" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MutatorTuningOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MutatorTuningHistory" (
    "id" TEXT NOT NULL,
    "mutatorId" TEXT NOT NULL,
    "runMode" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "suggestedDeltaPercent" INTEGER NOT NULL DEFAULT 0,
    "beforeRewardDeltaPercent" INTEGER NOT NULL DEFAULT 0,
    "beforeDangerDeltaPercent" INTEGER NOT NULL DEFAULT 0,
    "afterRewardDeltaPercent" INTEGER NOT NULL DEFAULT 0,
    "afterDangerDeltaPercent" INTEGER NOT NULL DEFAULT 0,
    "appliedByUserId" TEXT,
    "sourceGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MutatorTuningHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MutatorTuningOverride_mutatorId_runMode_key" ON "MutatorTuningOverride"("mutatorId", "runMode");

-- CreateIndex
CREATE INDEX "MutatorTuningOverride_runMode_idx" ON "MutatorTuningOverride"("runMode");

-- CreateIndex
CREATE INDEX "MutatorTuningOverride_updatedAt_idx" ON "MutatorTuningOverride"("updatedAt" DESC);

-- CreateIndex
CREATE INDEX "MutatorTuningHistory_mutatorId_runMode_createdAt_idx" ON "MutatorTuningHistory"("mutatorId", "runMode", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MutatorTuningHistory_createdAt_idx" ON "MutatorTuningHistory"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "MutatorTuningOverride" ADD CONSTRAINT "MutatorTuningOverride_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutatorTuningHistory" ADD CONSTRAINT "MutatorTuningHistory_appliedByUserId_fkey" FOREIGN KEY ("appliedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
