import 'server-only';

import { describe, expect, it } from 'vitest';

import { aggregatePlayerAnalytics } from '@/server/services/player-analytics.service';

describe('PlayerAnalyticsService - unit aggregation', () => {
  it('aggregates deterministic player analytics from extraction history and run mode audits', () => {
    const analytics = aggregatePlayerAnalytics(
      [
        {
          runId: 'run-safe-1',
          zoneId: 'shipyard_cemetery',
          status: 'EXTRACTED',
          catastropheOccurred: false,
          currencyEarned: 100,
          xpEarned: 30,
          resolvedAt: new Date('2026-04-14T10:00:00.000Z'),
          lootSnapshot: [],
        },
        {
          runId: 'run-hard-1',
          zoneId: 'orbital_derelict',
          status: 'FAILED',
          catastropheOccurred: true,
          currencyEarned: 0,
          xpEarned: 10,
          resolvedAt: new Date('2026-04-14T11:00:00.000Z'),
          lootSnapshot: [],
        },
        {
          runId: 'run-hard-2',
          zoneId: 'orbital_derelict',
          status: 'EXTRACTED',
          catastropheOccurred: false,
          currencyEarned: 250,
          xpEarned: 70,
          resolvedAt: new Date('2026-04-14T12:00:00.000Z'),
          lootSnapshot: [],
        },
      ],
      [
        { runId: 'run-safe-1', runMode: 'SAFE' },
        { runId: 'run-hard-1', runMode: 'HARD' },
        { runId: 'run-hard-2', runMode: 'HARD' },
      ],
    );

    expect(analytics.totalExtractions).toBe(3);
    expect(analytics.successRate).toBeCloseTo(0.6667, 4);
    expect(analytics.averageCcPerExtraction).toBe(116);
    expect(analytics.averageXpPerExtraction).toBe(36);
    expect(analytics.runMix).toEqual({ safe: 1, hard: 2 });
    expect(analytics.bestZoneByEarnings).toEqual({ zoneId: 'orbital_derelict', totalCredits: 250 });
  });
});
