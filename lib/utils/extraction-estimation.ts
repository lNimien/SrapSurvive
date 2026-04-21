import { RunStateDTO } from '@/types/dto.types';

export type ProjectionRisk = 'safe' | 'near-threshold' | 'crosses-threshold';

export interface MarginalLootEstimate {
  waitSeconds: 10 | 30;
  estimatedLootUnits: number;
  projectedDangerLevel: number | null;
  projectedRisk: ProjectionRisk;
  hasEnoughData: boolean;
}

interface EstimateInput {
  current: RunStateDTO;
  previous: RunStateDTO | null;
  catastropheThreshold?: number;
}

function getPendingLootUnits(runState: RunStateDTO | null): number {
  if (!runState?.pendingLoot?.length) {
    return 0;
  }

  return runState.pendingLoot.reduce((sum, item) => sum + item.quantity, 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toProjectedRisk(projectedDangerLevel: number | null, catastropheThreshold?: number): ProjectionRisk {
  if (projectedDangerLevel === null || catastropheThreshold === undefined) {
    return 'safe';
  }

  if (projectedDangerLevel >= catastropheThreshold) {
    return 'crosses-threshold';
  }

  const marginToThreshold = catastropheThreshold - projectedDangerLevel;
  if (marginToThreshold <= 0.05) {
    return 'near-threshold';
  }

  return 'safe';
}

function estimateForWindow(params: {
  waitSeconds: 10 | 30;
  lootRatePerSecond: number;
  dangerRatePerSecond: number | null;
  currentDangerLevel: number | null;
  catastropheThreshold?: number;
  hasEnoughData: boolean;
}): MarginalLootEstimate {
  const projectedDangerLevel =
    params.dangerRatePerSecond === null || params.currentDangerLevel === null
      ? null
      : clamp(params.currentDangerLevel + params.dangerRatePerSecond * params.waitSeconds, 0, 1.5);

  return {
    waitSeconds: params.waitSeconds,
    estimatedLootUnits: Math.max(0, Math.round(params.lootRatePerSecond * params.waitSeconds)),
    projectedDangerLevel,
    projectedRisk: toProjectedRisk(projectedDangerLevel, params.catastropheThreshold),
    hasEnoughData: params.hasEnoughData,
  };
}

export function estimateMarginalLootWindows({
  current,
  previous,
  catastropheThreshold,
}: EstimateInput): { plus10: MarginalLootEstimate; plus30: MarginalLootEstimate } {
  const hasComparableSnapshots =
    previous !== null &&
    Boolean(current.runId) &&
    Boolean(previous.runId) &&
    current.runId === previous.runId &&
    typeof current.elapsedSeconds === 'number' &&
    typeof previous.elapsedSeconds === 'number';

  const currentElapsedSeconds = hasComparableSnapshots ? current.elapsedSeconds : undefined;
  const previousElapsedSeconds = hasComparableSnapshots ? previous.elapsedSeconds : undefined;
  const elapsedDeltaSeconds =
    typeof currentElapsedSeconds === 'number' && typeof previousElapsedSeconds === 'number'
      ? currentElapsedSeconds - previousElapsedSeconds
      : 0;

  const hasEnoughData = hasComparableSnapshots && elapsedDeltaSeconds > 0;

  const lootRatePerSecond = hasEnoughData
    ? Math.max(0, (getPendingLootUnits(current) - getPendingLootUnits(previous)) / elapsedDeltaSeconds)
    : 0;

  const currentDangerLevel = typeof current.dangerLevel === 'number' ? current.dangerLevel : null;
  const previousDangerLevel = typeof previous?.dangerLevel === 'number' ? previous.dangerLevel : null;
  const dangerRatePerSecond =
    hasEnoughData && currentDangerLevel !== null && previousDangerLevel !== null
      ? (currentDangerLevel - previousDangerLevel) / elapsedDeltaSeconds
      : null;

  return {
    plus10: estimateForWindow({
      waitSeconds: 10,
      lootRatePerSecond,
      dangerRatePerSecond,
      currentDangerLevel,
      catastropheThreshold,
      hasEnoughData,
    }),
    plus30: estimateForWindow({
      waitSeconds: 30,
      lootRatePerSecond,
      dangerRatePerSecond,
      currentDangerLevel,
      catastropheThreshold,
      hasEnoughData,
    }),
  };
}
