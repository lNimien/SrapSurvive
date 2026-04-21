-- CreateTable
CREATE TABLE "MutatorTuningPolicy" (
    "id" TEXT NOT NULL,
    "mutatorId" TEXT NOT NULL,
    "runMode" TEXT NOT NULL,
    "maxAbsRewardDeltaPercent" INTEGER NOT NULL DEFAULT 10,
    "maxAbsDangerDeltaPercent" INTEGER NOT NULL DEFAULT 10,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MutatorTuningPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MutatorTuningPolicy_mutatorId_runMode_key" ON "MutatorTuningPolicy"("mutatorId", "runMode");

-- CreateIndex
CREATE INDEX "MutatorTuningPolicy_runMode_idx" ON "MutatorTuningPolicy"("runMode");

-- CreateIndex
CREATE INDEX "MutatorTuningPolicy_updatedAt_idx" ON "MutatorTuningPolicy"("updatedAt" DESC);

-- AddForeignKey
ALTER TABLE "MutatorTuningPolicy" ADD CONSTRAINT "MutatorTuningPolicy_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
