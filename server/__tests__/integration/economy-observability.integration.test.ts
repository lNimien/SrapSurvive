import 'server-only';

import { describe, expect, it } from 'vitest';

import { seedTestUser } from '@/server/__tests__/helpers/db-test-utils';
import { db } from '@/server/db/client';
import { EconomyObservabilityService } from '@/server/services/economy-observability.service';

describe('economy observability (integration)', () => {
  it('aggregates economy telemetry windows with deterministic totals', async () => {
    const userA = 'obs-user-a';
    const userB = 'obs-user-b';
    const userC = 'obs-user-c';

    await seedTestUser(userA);
    await seedTestUser(userB);
    await seedTestUser(userC);

    const now = new Date();

    const olderThanWindow = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1_000);
    await db.currencyLedger.updateMany({
      where: {
        entryType: 'INITIAL',
        userId: {
          in: [userA, userB, userC],
        },
      },
      data: {
        createdAt: olderThanWindow,
      },
    });

    await db.currencyLedger.createMany({
      data: [
        {
          userId: userA,
          amount: 120,
          balanceAfter: 120,
          entryType: 'EXTRACTION_REWARD',
          referenceId: 'obs:ext:a',
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1_000),
        },
        {
          userId: userA,
          amount: 15,
          balanceAfter: 135,
          entryType: 'SALE',
          referenceId: 'obs:sale:a',
          createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1_000),
        },
        {
          userId: userA,
          amount: -40,
          balanceAfter: 95,
          entryType: 'PURCHASE',
          referenceId: 'obs:purchase:a',
          createdAt: new Date(now.getTime() - 60 * 60 * 1_000),
        },
        {
          userId: userA,
          amount: 50,
          balanceAfter: 145,
          entryType: 'ADMIN_ADJUSTMENT',
          referenceId: 'obs:admin:a',
          createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1_000),
        },
        {
          userId: userB,
          amount: 80,
          balanceAfter: 80,
          entryType: 'CONTRACT_REWARD',
          referenceId: 'obs:contract:b',
          createdAt: new Date(now.getTime() - 20 * 60 * 60 * 1_000),
        },
        {
          userId: userB,
          amount: -30,
          balanceAfter: 50,
          entryType: 'CATASTROPHE_PENALTY',
          referenceId: 'obs:catastrophe:b',
          createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1_000),
        },
        {
          userId: userB,
          amount: 500,
          balanceAfter: 550,
          entryType: 'EXTRACTION_REWARD',
          referenceId: 'obs:old:b',
          createdAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1_000),
        },
      ],
    });

    await db.extractionResult.createMany({
      data: [
        {
          userId: userA,
          runId: 'obs-run-success-a',
          zoneId: 'shipyard_cemetery',
          status: 'EXTRACTED',
          startedAt: new Date(now.getTime() - 4 * 60 * 60 * 1_000),
          resolvedAt: new Date(now.getTime() - 2 * 60 * 60 * 1_000),
          durationSeconds: 7_200,
          dangerLevelAtClose: 0.45,
          catastropheOccurred: false,
          currencyEarned: 120,
          xpEarned: 100,
          lootSnapshot: [{ itemDefinitionId: 'scrap_metal', quantity: 3 }],
          equipmentSnapshot: {
            HEAD: null,
            BODY: null,
            HANDS: null,
            TOOL_PRIMARY: null,
            TOOL_SECONDARY: null,
            BACKPACK: null,
          },
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1_000),
        },
        {
          userId: userC,
          runId: 'obs-run-failed-c',
          zoneId: 'shipyard_cemetery',
          status: 'FAILED',
          startedAt: new Date(now.getTime() - 50 * 60 * 60 * 1_000),
          resolvedAt: new Date(now.getTime() - 48 * 60 * 60 * 1_000),
          durationSeconds: 7_200,
          dangerLevelAtClose: 1.02,
          catastropheOccurred: true,
          currencyEarned: 0,
          xpEarned: 25,
          lootSnapshot: [],
          equipmentSnapshot: {
            HEAD: null,
            BODY: null,
            HANDS: null,
            TOOL_PRIMARY: null,
            TOOL_SECONDARY: null,
            BACKPACK: null,
          },
          createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1_000),
        },
        {
          userId: userB,
          runId: 'obs-run-old-b',
          zoneId: 'shipyard_cemetery',
          status: 'EXTRACTED',
          startedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1_000),
          resolvedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1_000),
          durationSeconds: 7_200,
          dangerLevelAtClose: 0.6,
          catastropheOccurred: false,
          currencyEarned: 50,
          xpEarned: 20,
          lootSnapshot: [],
          equipmentSnapshot: {
            HEAD: null,
            BODY: null,
            HANDS: null,
            TOOL_PRIMARY: null,
            TOOL_SECONDARY: null,
            BACKPACK: null,
          },
          createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1_000),
        },
      ],
    });

    const telemetry = await EconomyObservabilityService.getEconomyTelemetry({ now });

    expect(telemetry.window24h).toEqual({
      faucetTotal: 215,
      sinkTotal: 40,
      netDelta: 175,
      extractionSuccessCount: 1,
      extractionFailedCount: 0,
      activeUsers: 2,
    });

    expect(telemetry.window7d).toEqual({
      faucetTotal: 265,
      sinkTotal: 70,
      netDelta: 195,
      extractionSuccessCount: 1,
      extractionFailedCount: 1,
      activeUsers: 3,
    });

    expect(telemetry.topFaucetEntryTypes24h.map((entry) => entry.entryType)).toEqual([
      'EXTRACTION_REWARD',
      'CONTRACT_REWARD',
      'SALE',
    ]);
    expect(telemetry.topFaucetEntryTypes24h.map((entry) => entry.totalAmount)).toEqual([120, 80, 15]);

    expect(telemetry.topSinkEntryTypes24h).toEqual([
      {
        entryType: 'PURCHASE',
        totalAmount: 40,
        transactionCount: 1,
      },
    ]);

    expect(telemetry.weeklyClaimsHealth.window24h.totalAttempts).toBe(0);
    expect(telemetry.weeklyClaimsHealth.window7d.totalAttempts).toBe(0);
  });

  it('aggregates weekly claim observability metrics for 24h and 7d windows', async () => {
    const now = new Date();

    await db.auditLog.createMany({
      data: [
        {
          action: 'liveops.weekly.claim_attempt',
          payload: {
            directiveKey: 'directive-materials-1500',
            weekStart: '2026-04-13T00:00:00.000Z',
            outcome: 'CLAIMED',
            durationMs: 120,
          },
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1_000),
        },
        {
          action: 'liveops.weekly.claim_attempt',
          payload: {
            directiveKey: 'directive-materials-1500',
            weekStart: '2026-04-13T00:00:00.000Z',
            outcome: 'ALREADY_CLAIMED',
            durationMs: 45,
          },
          createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1_000),
        },
        {
          action: 'liveops.weekly.claim_attempt',
          payload: {
            directiveKey: 'directive-zone-orbital-5',
            weekStart: '2026-04-13T00:00:00.000Z',
            outcome: 'NOT_CLAIMABLE',
            durationMs: 60,
          },
          createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1_000),
        },
        {
          action: 'liveops.weekly.claim_attempt',
          payload: {
            directiveKey: 'directive-earn-2500-cc',
            weekStart: '2026-04-13T00:00:00.000Z',
            outcome: 'FEATURE_DISABLED',
            durationMs: 25,
          },
          createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1_000),
        },
        {
          action: 'liveops.weekly.claim_attempt',
          payload: {
            directiveKey: 'directive-earn-2500-cc',
            weekStart: '2026-04-13T00:00:00.000Z',
            outcome: 'ERROR',
            durationMs: 300,
          },
          createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1_000),
        },
      ],
    });

    await db.auditLog.createMany({
      data: [
        {
          action: 'liveops.weekly.claim',
          payload: {
            rewardItems: [
              { itemDefinitionId: 'scrap_metal', quantity: 80 },
              { itemDefinitionId: 'energy_cell', quantity: 30 },
            ],
          },
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1_000),
        },
        {
          action: 'liveops.weekly.claim',
          payload: {
            rewardItems: [{ itemDefinitionId: 'scrap_metal', quantity: 120 }],
          },
          createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1_000),
        },
        {
          action: 'liveops.weekly.claim',
          payload: {
            rewardItems: [{ itemDefinitionId: 'optic_sensor', quantity: 8 }],
          },
          createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1_000),
        },
      ],
    });

    const telemetry = await EconomyObservabilityService.getEconomyTelemetry({ now });

    expect(telemetry.weeklyClaimsHealth.window24h).toEqual({
      totalAttempts: 2,
      attemptsByOutcome: {
        CLAIMED: 1,
        ALREADY_CLAIMED: 1,
        NOT_CLAIMABLE: 0,
        FEATURE_DISABLED: 0,
        ERROR: 0,
      },
      successRatio: 0.5,
      latency: {
        p50Ms: 45,
        p95Ms: 120,
      },
      itemFaucetByItemDef: [
        { itemDefinitionId: 'scrap_metal', quantity: 80 },
        { itemDefinitionId: 'energy_cell', quantity: 30 },
      ],
    });

    expect(telemetry.weeklyClaimsHealth.window7d).toEqual({
      totalAttempts: 4,
      attemptsByOutcome: {
        CLAIMED: 1,
        ALREADY_CLAIMED: 1,
        NOT_CLAIMABLE: 1,
        FEATURE_DISABLED: 1,
        ERROR: 0,
      },
      successRatio: 0.25,
      latency: {
        p50Ms: 45,
        p95Ms: 120,
      },
      itemFaucetByItemDef: [
        { itemDefinitionId: 'scrap_metal', quantity: 200 },
        { itemDefinitionId: 'energy_cell', quantity: 30 },
      ],
    });
  });
});
