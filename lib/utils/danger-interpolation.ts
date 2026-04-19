import { RunStateDTO } from '@/types/dto.types';

export interface DangerInterpolationInput {
  currentSnapshot: RunStateDTO;
  previousSnapshot: RunStateDTO | null;
  nowMs: number;
  snapshotCapturedAtMs: number;
}

function clampDanger(value: number): number {
  return Math.min(Math.max(value, 0), 1.5);
}

export function interpolateDangerLevel(input: DangerInterpolationInput): number {
  const snapshotDanger = input.currentSnapshot.dangerLevel ?? 0;

  if (input.currentSnapshot.status !== 'running' && input.currentSnapshot.status !== 'catastrophe') {
    return clampDanger(snapshotDanger);
  }

  const elapsedSinceSnapshotSeconds = Math.max(0, (input.nowMs - input.snapshotCapturedAtMs) / 1000);
  if (elapsedSinceSnapshotSeconds === 0) {
    return clampDanger(snapshotDanger);
  }

  const currentElapsed = input.currentSnapshot.elapsedSeconds ?? 0;
  const previousElapsed = input.previousSnapshot?.elapsedSeconds ?? currentElapsed;
  const previousDanger = input.previousSnapshot?.dangerLevel ?? snapshotDanger;

  const elapsedDelta = Math.max(currentElapsed - previousElapsed, 1);
  const dangerDelta = Math.max(snapshotDanger - previousDanger, 0);
  const growthPerSecond = dangerDelta / elapsedDelta;

  return clampDanger(snapshotDanger + growthPerSecond * elapsedSinceSnapshotSeconds);
}
