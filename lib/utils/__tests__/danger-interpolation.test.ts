import { describe, expect, it } from 'vitest';

import { interpolateDangerLevel } from '@/lib/utils/danger-interpolation';

describe('interpolateDangerLevel', () => {
  it('increases danger continuously between polling snapshots', () => {
    const interpolated = interpolateDangerLevel({
      currentSnapshot: { status: 'running', dangerLevel: 0.4, elapsedSeconds: 40 },
      previousSnapshot: { status: 'running', dangerLevel: 0.3, elapsedSeconds: 30 },
      nowMs: 5_000,
      snapshotCapturedAtMs: 2_000,
    });

    expect(interpolated).toBeGreaterThan(0.4);
    expect(interpolated).toBeLessThanOrEqual(1.5);
  });

  it('does not go below zero or above visual cap', () => {
    const capped = interpolateDangerLevel({
      currentSnapshot: { status: 'running', dangerLevel: 1.49, elapsedSeconds: 90 },
      previousSnapshot: { status: 'running', dangerLevel: 1.45, elapsedSeconds: 80 },
      nowMs: 20_000,
      snapshotCapturedAtMs: 0,
    });

    expect(capped).toBeLessThanOrEqual(1.5);
    expect(capped).toBeGreaterThanOrEqual(0);
  });
});
