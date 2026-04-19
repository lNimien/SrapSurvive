import 'server-only';

import { describe, expect, it } from 'vitest';

import { db } from '@/server/db/client';
import { ACHIEVEMENT_DEFINITION_BY_ID } from '@/config/achievements.config';
import { seedTestUser } from '@/server/__tests__/helpers/db-test-utils';
import { AchievementService } from '@/server/services/achievement.service';

async function seedExtractionResultForUnlock(userId: string): Promise<void> {
  const startedAt = new Date('2026-01-01T00:00:00.000Z');
  const resolvedAt = new Date('2026-01-01T00:02:00.000Z');

  await db.extractionResult.create({
    data: {
      userId,
      runId: `run-${userId}`,
      zoneId: 'shipyard_cemetery',
      status: 'EXTRACTED',
      startedAt,
      resolvedAt,
      durationSeconds: 120,
      dangerLevelAtClose: 0.42,
      catastropheOccurred: false,
      currencyEarned: 40,
      xpEarned: 80,
      lootSnapshot: [{ itemId: 'scrap_metal', quantity: 12 }],
      equipmentSnapshot: {
        HEAD: null,
        BODY: null,
        HANDS: null,
        TOOL_PRIMARY: null,
        TOOL_SECONDARY: null,
        BACKPACK: null,
      },
    },
  });
}

describe('AchievementService.claimAchievement (integration)', () => {
  it('claims unlocked achievement, grants CC+XP and persists claimed state', async () => {
    const userId = 'user-achievement-claim';
    const achievement = ACHIEVEMENT_DEFINITION_BY_ID.achievement_first_extraction;

    await seedTestUser(userId);
    await seedExtractionResultForUnlock(userId);

    const result = await AchievementService.claimAchievement(userId, achievement.id);

    expect(result.achievementId).toBe(achievement.id);
    expect(result.rewardCC).toBe(achievement.rewardCC);
    expect(result.rewardXP).toBe(achievement.rewardXP);

    const ledgerEntry = await db.currencyLedger.findFirst({
      where: {
        userId,
        referenceId: `achievement:${achievement.id}:claim`,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(ledgerEntry).not.toBeNull();
    expect(ledgerEntry?.amount).toBe(achievement.rewardCC);

    const progression = await db.userProgression.findUnique({ where: { userId } });
    expect(progression?.currentXp).toBe(achievement.rewardXP);
    expect(progression?.currentLevel).toBe(1);

    const achievements = await AchievementService.getAchievementsForPlayer(userId);
    const claimedAchievement = achievements.find((item) => item.id === achievement.id);
    expect(claimedAchievement?.claimed).toBe(true);

    const auditLog = await db.auditLog.findFirst({
      where: {
        userId,
        action: 'achievement.claim',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditLog).not.toBeNull();
  });

  it('rejects re-claim idempotently and does not duplicate claim ledger entry', async () => {
    const userId = 'user-achievement-reclaim';
    const achievement = ACHIEVEMENT_DEFINITION_BY_ID.achievement_first_extraction;

    await seedTestUser(userId);
    await seedExtractionResultForUnlock(userId);
    await AchievementService.claimAchievement(userId, achievement.id);

    const beforeCount = await db.currencyLedger.count({
      where: {
        userId,
        referenceId: `achievement:${achievement.id}:claim`,
      },
    });

    await expect(AchievementService.claimAchievement(userId, achievement.id)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });

    const afterCount = await db.currencyLedger.count({
      where: {
        userId,
        referenceId: `achievement:${achievement.id}:claim`,
      },
    });

    expect(afterCount).toBe(beforeCount);
  });

  it('rejects locked achievement claim and creates no claim ledger entry', async () => {
    const userId = 'user-achievement-locked';
    const achievement = ACHIEVEMENT_DEFINITION_BY_ID.achievement_level_three;

    await seedTestUser(userId);

    await expect(AchievementService.claimAchievement(userId, achievement.id)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });

    const claimCount = await db.currencyLedger.count({
      where: {
        userId,
        referenceId: `achievement:${achievement.id}:claim`,
      },
    });

    expect(claimCount).toBe(0);
  });
});
