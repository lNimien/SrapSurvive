import 'server-only';

import { describe, expect, it } from 'vitest';

import { db } from '@/server/db/client';
import { WEEKLY_DIRECTIVES } from '@/config/liveops.config';
import { seedTestUser } from '@/server/__tests__/helpers/db-test-utils';
import { WeeklyGoalsService } from '@/server/services/weekly-goals.service';

const NOW = new Date('2026-04-19T12:00:00.000Z');
const CLAIM_DIRECTIVE_KEY = 'directive-materials-1500';
const CLAIM_REFERENCE_ID = 'weekly-directive:directive-materials-1500:2026-04-13:claim';

async function getInventoryQuantities(
  userId: string,
  itemDefinitionIds: string[],
): Promise<Record<string, number>> {
  const rows = await db.inventoryItem.findMany({
    where: {
      userId,
      itemDefinitionId: { in: itemDefinitionIds },
    },
  });

  return itemDefinitionIds.reduce<Record<string, number>>((acc, itemDefinitionId) => {
    const row = rows.find((entry) => entry.itemDefinitionId === itemDefinitionId);
    acc[itemDefinitionId] = row?.quantity ?? 0;
    return acc;
  }, {});
}

async function seedExtractionResultsForWeeklyProgress(userId: string): Promise<void> {
  const rows = Array.from({ length: 12 }).map((_, index) => {
    const day = 14 + (index % 5);
    const hour = 8 + index;

    return {
      runId: `weekly-seed-run-${index + 1}`,
      userId,
      zoneId: index < 5 ? 'orbital_derelict' : 'shipyard_cemetery',
      status: index === 2 ? ('FAILED' as const) : ('EXTRACTED' as const),
      startedAt: new Date(`2026-04-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:00:00.000Z`),
      resolvedAt: new Date(`2026-04-${day.toString().padStart(2, '0')}T${(hour + 1).toString().padStart(2, '0')}:00:00.000Z`),
      durationSeconds: 300,
      dangerLevelAtClose: index === 2 ? 1.12 : 0.72,
      catastropheOccurred: index === 2,
      currencyEarned: index === 2 ? 0 : 250,
      xpEarned: 60,
      lootSnapshot: [{ itemId: 'scrap_metal', quantity: 140 }],
      equipmentSnapshot: {},
    };
  });

  await db.extractionResult.createMany({ data: rows });
}

describe('WeeklyGoalsService persistent directives (integration)', () => {
  it('creates persisted directives for user and current week on first sync', async () => {
    const userId = 'user-weekly-sync-create';
    await seedTestUser(userId);

    await WeeklyGoalsService.getWeeklyGoals(userId, NOW);

    const rows = await db.weeklyDirectiveProgress.findMany({
      where: { userId },
    });

    expect(rows).toHaveLength(WEEKLY_DIRECTIVES.length);
    expect(rows.every((entry) => entry.weekStart.toISOString() === '2026-04-13T00:00:00.000Z')).toBe(true);
  });

  it('updates persisted progress from seeded extraction history', async () => {
    const userId = 'user-weekly-sync-progress';
    await seedTestUser(userId);
    await seedExtractionResultsForWeeklyProgress(userId);

    const weeklyGoals = await WeeklyGoalsService.getWeeklyGoals(userId, NOW);

    expect(weeklyGoals.directives.find((entry) => entry.id === 'directive-extract-12')?.progress).toBe(11);
    expect(weeklyGoals.directives.find((entry) => entry.id === 'directive-survive-3-catastrophes')?.progress).toBe(1);
    expect(weeklyGoals.directives.find((entry) => entry.id === 'directive-zone-orbital-5')?.progress).toBe(4);
    expect(weeklyGoals.directives.find((entry) => entry.id === 'directive-materials-1500')?.progress).toBe(1500);
    expect(weeklyGoals.directives.find((entry) => entry.id === 'directive-earn-2500-cc')?.progress).toBe(2500);
  });

  it('claims weekly directive reward and marks it as claimed atomically', async () => {
    const userId = 'user-weekly-claim-success';
    await seedTestUser(userId);
    await seedExtractionResultsForWeeklyProgress(userId);

    const goals = await WeeklyGoalsService.getWeeklyGoals(userId, NOW);
    const claimableDirective = goals.directives.find((entry) => entry.id === CLAIM_DIRECTIVE_KEY);

    expect(claimableDirective?.claimable).toBe(true);
    const rewardedItemIds = claimableDirective?.rewardItems.map((item) => item.itemDefinitionId) ?? [];
    const inventoryBeforeClaim = await getInventoryQuantities(userId, rewardedItemIds);

    const claimResult = await WeeklyGoalsService.claimWeeklyDirective(userId, {
      directiveKey: CLAIM_DIRECTIVE_KEY,
      weekStart: goals.weekStart,
    });

    expect(claimResult.alreadyClaimed).toBe(false);
    expect(claimResult.rewardItems).toEqual(claimableDirective?.rewardItems ?? []);

    const progressRow = await db.weeklyDirectiveProgress.findUnique({
      where: {
        userId_directiveKey_weekStart: {
          userId,
          directiveKey: CLAIM_DIRECTIVE_KEY,
          weekStart: new Date(goals.weekStart),
        },
      },
    });

    expect(progressRow?.status).toBe('CLAIMED');
    expect(progressRow?.claimedAt).not.toBeNull();

    const claimLedgerRows = await db.currencyLedger.findMany({
      where: {
        userId,
        referenceId: CLAIM_REFERENCE_ID,
      },
    });
    expect(claimLedgerRows).toHaveLength(1);

    const inventoryAfterClaim = await getInventoryQuantities(userId, rewardedItemIds);
    for (const rewardItem of claimResult.rewardItems) {
      expect(inventoryAfterClaim[rewardItem.itemDefinitionId]).toBe(
        inventoryBeforeClaim[rewardItem.itemDefinitionId] + rewardItem.quantity,
      );
    }
  });

  it('returns already-claimed deterministically on second claim without duplicating reward', async () => {
    const userId = 'user-weekly-claim-idempotent';
    await seedTestUser(userId);
    await seedExtractionResultsForWeeklyProgress(userId);

    const goals = await WeeklyGoalsService.getWeeklyGoals(userId, NOW);

    const claimableDirective = goals.directives.find((entry) => entry.id === CLAIM_DIRECTIVE_KEY);
    const rewardedItemIds = claimableDirective?.rewardItems.map((item) => item.itemDefinitionId) ?? [];

    await WeeklyGoalsService.claimWeeklyDirective(userId, {
      directiveKey: CLAIM_DIRECTIVE_KEY,
      weekStart: goals.weekStart,
    });

    const inventoryAfterFirstClaim = await getInventoryQuantities(userId, rewardedItemIds);

    const secondClaim = await WeeklyGoalsService.claimWeeklyDirective(userId, {
      directiveKey: CLAIM_DIRECTIVE_KEY,
      weekStart: goals.weekStart,
    });

    expect(secondClaim.alreadyClaimed).toBe(true);

    const claimLedgerRows = await db.currencyLedger.findMany({
      where: {
        userId,
        referenceId: CLAIM_REFERENCE_ID,
      },
    });
    expect(claimLedgerRows).toHaveLength(1);

    const inventoryAfterSecondClaim = await getInventoryQuantities(userId, rewardedItemIds);
    expect(inventoryAfterSecondClaim).toEqual(inventoryAfterFirstClaim);

    const progression = await db.userProgression.findUnique({ where: { userId } });
    expect(progression?.currentXp).toBe(70);
    expect(secondClaim.currentXp).toBe(70);
  });

  it('handles concurrent double-claim with single reward settlement and deterministic second outcome', async () => {
    const userId = 'user-weekly-claim-race';
    await seedTestUser(userId);
    await seedExtractionResultsForWeeklyProgress(userId);

    const goals = await WeeklyGoalsService.getWeeklyGoals(userId, NOW);
    const claimableDirective = goals.directives.find((entry) => entry.id === CLAIM_DIRECTIVE_KEY);

    expect(claimableDirective?.claimable).toBe(true);

    const rewardedItemIds = claimableDirective?.rewardItems.map((item) => item.itemDefinitionId) ?? [];
    const inventoryBeforeRace = await getInventoryQuantities(userId, rewardedItemIds);

    const [firstRaceResult, secondRaceResult] = await Promise.all([
      WeeklyGoalsService.claimWeeklyDirective(userId, {
        directiveKey: CLAIM_DIRECTIVE_KEY,
        weekStart: goals.weekStart,
      }),
      WeeklyGoalsService.claimWeeklyDirective(userId, {
        directiveKey: CLAIM_DIRECTIVE_KEY,
        weekStart: goals.weekStart,
      }),
    ]);

    const raceResults = [firstRaceResult, secondRaceResult];
    const successResults = raceResults.filter((result) => !result.alreadyClaimed);
    const alreadyClaimedResults = raceResults.filter((result) => result.alreadyClaimed);

    expect(successResults).toHaveLength(1);
    expect(alreadyClaimedResults).toHaveLength(1);

    const claimLedgerRows = await db.currencyLedger.findMany({
      where: {
        userId,
        referenceId: CLAIM_REFERENCE_ID,
      },
    });
    expect(claimLedgerRows).toHaveLength(1);

    const inventoryAfterRace = await getInventoryQuantities(userId, rewardedItemIds);
    for (const rewardItem of claimableDirective?.rewardItems ?? []) {
      expect(inventoryAfterRace[rewardItem.itemDefinitionId]).toBe(
        inventoryBeforeRace[rewardItem.itemDefinitionId] + rewardItem.quantity,
      );
    }

    const progression = await db.userProgression.findUnique({ where: { userId } });
    expect(progression?.currentXp).toBe(claimableDirective?.rewardXP ?? 0);

    const progressRow = await db.weeklyDirectiveProgress.findUnique({
      where: {
        userId_directiveKey_weekStart: {
          userId,
          directiveKey: CLAIM_DIRECTIVE_KEY,
          weekStart: new Date(goals.weekStart),
        },
      },
    });

    expect(progressRow?.status).toBe('CLAIMED');
    expect(progressRow?.claimedAt).not.toBeNull();
  });

  it('rolls back weekly claim when forced failure happens mid-transaction', async () => {
    const userId = 'user-weekly-claim-rollback';
    await seedTestUser(userId);
    await seedExtractionResultsForWeeklyProgress(userId);

    const goals = await WeeklyGoalsService.getWeeklyGoals(userId, NOW);
    const claimableDirective = goals.directives.find((entry) => entry.id === CLAIM_DIRECTIVE_KEY);
    const rewardedItemIds = claimableDirective?.rewardItems.map((item) => item.itemDefinitionId) ?? [];
    const inventoryBeforeFailure = await getInventoryQuantities(userId, rewardedItemIds);

    await expect(
      WeeklyGoalsService.claimWeeklyDirective(
        userId,
        {
          directiveKey: CLAIM_DIRECTIVE_KEY,
          weekStart: goals.weekStart,
        },
        { simulateFailureAfterLedgerWrite: true },
      ),
    ).rejects.toThrow('Forced weekly directive claim failure after ledger write.');

    const claimLedgerRows = await db.currencyLedger.findMany({
      where: {
        userId,
        referenceId: CLAIM_REFERENCE_ID,
      },
    });
    expect(claimLedgerRows).toHaveLength(0);

    const inventoryAfterFailure = await getInventoryQuantities(userId, rewardedItemIds);
    expect(inventoryAfterFailure).toEqual(inventoryBeforeFailure);

    const progression = await db.userProgression.findUnique({ where: { userId } });
    expect(progression?.currentXp).toBe(0);
    expect(progression?.currentLevel).toBe(1);

    const progressRow = await db.weeklyDirectiveProgress.findUnique({
      where: {
        userId_directiveKey_weekStart: {
          userId,
          directiveKey: CLAIM_DIRECTIVE_KEY,
          weekStart: new Date(goals.weekStart),
        },
      },
    });

    expect(progressRow?.status).toBe('CLAIMABLE');
    expect(progressRow?.claimedAt).toBeNull();
  });
});
