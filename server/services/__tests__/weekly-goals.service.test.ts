import 'server-only';

import { describe, expect, it } from 'vitest';

import { normalizeWeeklyDirectiveReward } from '@/config/liveops.config';
import {
  buildWeeklyDirectiveStats,
  getWeekWindowUTC,
  resolveClaimAttemptOutcome,
} from '@/server/services/weekly-goals.service';

describe('WeeklyGoalsService - unit aggregation', () => {
  it('builds deterministic directive stats from extraction history', () => {
    const stats = buildWeeklyDirectiveStats([
      {
        runId: 'run-1',
        zoneId: 'shipyard_cemetery',
        status: 'EXTRACTED',
        catastropheOccurred: false,
        currencyEarned: 120,
        xpEarned: 40,
        resolvedAt: new Date('2026-04-15T10:00:00.000Z'),
        lootSnapshot: [{ quantity: 12 }, { quantity: 5 }],
      },
      {
        runId: 'run-2',
        zoneId: 'orbital_derelict',
        status: 'FAILED',
        catastropheOccurred: true,
        currencyEarned: 0,
        xpEarned: 15,
        resolvedAt: new Date('2026-04-15T11:00:00.000Z'),
        lootSnapshot: [{ quantity: 8 }],
      },
      {
        runId: 'run-3',
        zoneId: 'orbital_derelict',
        status: 'EXTRACTED',
        catastropheOccurred: false,
        currencyEarned: 240,
        xpEarned: 90,
        resolvedAt: new Date('2026-04-15T12:00:00.000Z'),
        lootSnapshot: [{ quantity: 20 }],
      },
    ]);

    expect(stats.extractionsCompleted).toBe(2);
    expect(stats.catastrophesSurvived).toBe(1);
    expect(stats.zoneClears.shipyard_cemetery).toBe(1);
    expect(stats.zoneClears.orbital_derelict).toBe(1);
    expect(stats.materialsCollected).toBe(45);
    expect(stats.creditsEarned).toBe(360);
  });

  it('normalizes week window to monday UTC boundaries', () => {
    const { weekStart, weekEnd } = getWeekWindowUTC(new Date('2026-04-19T23:59:59.000Z'));

    expect(weekStart.toISOString()).toBe('2026-04-13T00:00:00.000Z');
    expect(weekEnd.toISOString()).toBe('2026-04-20T00:00:00.000Z');
  });

  it('resolves claim attempt outcomes with deterministic idempotent semantics', () => {
    expect(resolveClaimAttemptOutcome({ updatedCount: 1, claimedAt: null })).toBe('CLAIMED');
    expect(resolveClaimAttemptOutcome({ updatedCount: 0, claimedAt: new Date('2026-04-19T00:00:00.000Z') })).toBe(
      'ALREADY_CLAIMED',
    );
    expect(resolveClaimAttemptOutcome({ updatedCount: 0, claimedAt: null })).toBe('NOT_CLAIMABLE');
  });

  it('clamps weekly reward payloads within conservative CC/XP bounds', () => {
    expect(normalizeWeeklyDirectiveReward({ rewardCC: 9999, rewardXP: 9999 })).toEqual({
      rewardCC: 750,
      rewardXP: 320,
    });

    expect(normalizeWeeklyDirectiveReward({ rewardCC: 1, rewardXP: 1 })).toEqual({
      rewardCC: 25,
      rewardXP: 10,
    });
  });
});
