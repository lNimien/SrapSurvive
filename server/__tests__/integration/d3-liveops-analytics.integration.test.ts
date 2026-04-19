import 'server-only';

import { describe, expect, it } from 'vitest';

import { db } from '@/server/db/client';
import { seedTestUser } from '@/server/__tests__/helpers/db-test-utils';
import { WeeklyGoalsService } from '@/server/services/weekly-goals.service';
import { PlayerAnalyticsService } from '@/server/services/player-analytics.service';

describe('D.3 liveops + analytics integration', () => {
  it('derives weekly directive progress from seeded extraction data', async () => {
    const userId = 'user-weekly-goals';
    await seedTestUser(userId);

    await db.extractionResult.createMany({
      data: [
        {
          runId: 'weekly-run-1',
          userId,
          zoneId: 'orbital_derelict',
          status: 'EXTRACTED',
          startedAt: new Date('2026-04-14T08:00:00.000Z'),
          resolvedAt: new Date('2026-04-14T08:03:00.000Z'),
          durationSeconds: 180,
          dangerLevelAtClose: 0.78,
          catastropheOccurred: false,
          currencyEarned: 400,
          xpEarned: 80,
          lootSnapshot: [{ itemId: 'scrap_metal', quantity: 120 }],
          equipmentSnapshot: {},
        },
        {
          runId: 'weekly-run-2',
          userId,
          zoneId: 'orbital_derelict',
          status: 'FAILED',
          startedAt: new Date('2026-04-15T09:00:00.000Z'),
          resolvedAt: new Date('2026-04-15T09:05:00.000Z'),
          durationSeconds: 300,
          dangerLevelAtClose: 1.12,
          catastropheOccurred: true,
          currencyEarned: 0,
          xpEarned: 20,
          lootSnapshot: [{ itemId: 'scrap_metal', quantity: 30 }],
          equipmentSnapshot: {},
        },
        {
          runId: 'weekly-run-3',
          userId,
          zoneId: 'shipyard_cemetery',
          status: 'EXTRACTED',
          startedAt: new Date('2026-04-16T10:00:00.000Z'),
          resolvedAt: new Date('2026-04-16T10:04:00.000Z'),
          durationSeconds: 240,
          dangerLevelAtClose: 0.69,
          catastropheOccurred: false,
          currencyEarned: 250,
          xpEarned: 65,
          lootSnapshot: [{ itemId: 'energy_cell', quantity: 90 }],
          equipmentSnapshot: {},
        },
      ],
    });

    const weeklyGoals = await WeeklyGoalsService.getWeeklyGoals(userId, new Date('2026-04-19T12:00:00.000Z'));

    const extractionDirective = weeklyGoals.directives.find((entry) => entry.id === 'directive-extract-12');
    const catastropheDirective = weeklyGoals.directives.find((entry) => entry.id === 'directive-survive-3-catastrophes');
    const orbitalDirective = weeklyGoals.directives.find((entry) => entry.id === 'directive-zone-orbital-5');
    const materialsDirective = weeklyGoals.directives.find((entry) => entry.id === 'directive-materials-1500');

    expect(extractionDirective?.progress).toBe(2);
    expect(catastropheDirective?.progress).toBe(1);
    expect(orbitalDirective?.progress).toBe(1);
    expect(materialsDirective?.progress).toBe(240);
  });

  it('derives analytics from extraction history and run.start audits', async () => {
    const userId = 'user-analytics-d3';
    await seedTestUser(userId);

    await db.extractionResult.createMany({
      data: [
        {
          runId: 'analytics-run-safe',
          userId,
          zoneId: 'shipyard_cemetery',
          status: 'EXTRACTED',
          startedAt: new Date('2026-04-10T08:00:00.000Z'),
          resolvedAt: new Date('2026-04-10T08:04:00.000Z'),
          durationSeconds: 240,
          dangerLevelAtClose: 0.75,
          catastropheOccurred: false,
          currencyEarned: 180,
          xpEarned: 60,
          lootSnapshot: [],
          equipmentSnapshot: {},
        },
        {
          runId: 'analytics-run-hard',
          userId,
          zoneId: 'orbital_derelict',
          status: 'FAILED',
          startedAt: new Date('2026-04-10T09:00:00.000Z'),
          resolvedAt: new Date('2026-04-10T09:05:00.000Z'),
          durationSeconds: 300,
          dangerLevelAtClose: 1.1,
          catastropheOccurred: true,
          currencyEarned: 0,
          xpEarned: 20,
          lootSnapshot: [],
          equipmentSnapshot: {},
        },
        {
          runId: 'analytics-run-hard-2',
          userId,
          zoneId: 'orbital_derelict',
          status: 'EXTRACTED',
          startedAt: new Date('2026-04-10T10:00:00.000Z'),
          resolvedAt: new Date('2026-04-10T10:06:00.000Z'),
          durationSeconds: 360,
          dangerLevelAtClose: 0.88,
          catastropheOccurred: false,
          currencyEarned: 420,
          xpEarned: 120,
          lootSnapshot: [],
          equipmentSnapshot: {},
        },
      ],
    });

    await db.auditLog.createMany({
      data: [
        {
          userId,
          action: 'run.start',
          payload: { runId: 'analytics-run-safe', runMode: 'SAFE' },
        },
        {
          userId,
          action: 'run.start',
          payload: { runId: 'analytics-run-hard', runMode: 'HARD' },
        },
        {
          userId,
          action: 'run.start',
          payload: { runId: 'analytics-run-hard-2', runMode: 'HARD' },
        },
      ],
    });

    const analytics = await PlayerAnalyticsService.getPlayerAnalytics(userId);

    expect(analytics.totalExtractions).toBe(3);
    expect(analytics.successRate).toBeCloseTo(0.6667, 4);
    expect(analytics.averageCcPerExtraction).toBe(200);
    expect(analytics.averageXpPerExtraction).toBe(66);
    expect(analytics.runMix).toEqual({ safe: 1, hard: 2 });
    expect(analytics.bestZoneByEarnings).toEqual({ zoneId: 'orbital_derelict', totalCredits: 420 });
  });
});
