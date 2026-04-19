import 'server-only';

import { db } from '@/server/db/client';
import { ACHIEVEMENT_DEFINITION_BY_ID, ACHIEVEMENT_DEFINITIONS } from '@/config/achievements.config';
import {
  collectUnlockedAchievementIds,
  isAchievementUnlocked,
  PlayerAchievementStats,
  toAchievementRewardPayload,
} from '@/server/domain/progression/achievement.logic';
import { calculateLevelProgress } from '@/server/domain/progression/progression.calculator';
import { AchievementClaimResultDTO, AchievementDTO } from '@/types/dto.types';
import { DomainError } from '@/server/domain/inventory/inventory.service';

const ACHIEVEMENT_REFERENCE_PREFIX = 'achievement:';
const ACHIEVEMENT_REFERENCE_SUFFIX = ':claim';

function getAchievementReferenceId(achievementId: string): string {
  return `${ACHIEVEMENT_REFERENCE_PREFIX}${achievementId}${ACHIEVEMENT_REFERENCE_SUFFIX}`;
}

function parseAchievementIdFromReference(referenceId: string): string | null {
  if (!referenceId.startsWith(ACHIEVEMENT_REFERENCE_PREFIX) || !referenceId.endsWith(ACHIEVEMENT_REFERENCE_SUFFIX)) {
    return null;
  }

  return referenceId.slice(
    ACHIEVEMENT_REFERENCE_PREFIX.length,
    referenceId.length - ACHIEVEMENT_REFERENCE_SUFFIX.length
  );
}

async function loadAchievementStats(userId: string): Promise<PlayerAchievementStats> {
  const [progression, extractionResultsCount, catastropheOccurredCount] = await Promise.all([
    db.userProgression.findUnique({ where: { userId } }),
    db.extractionResult.count({ where: { userId } }),
    db.extractionResult.count({ where: { userId, catastropheOccurred: true } }),
  ]);

  if (!progression) {
    throw new DomainError('NOT_FOUND', 'No se encontró progresión para el usuario.');
  }

  return {
    extractionResultsCount,
    catastropheOccurredCount,
    level: progression.currentLevel,
    totalScrapCollected: progression.totalScrapCollected,
  };
}

export const AchievementService = {
  async getClaimedAchievementIds(userId: string): Promise<Set<string>> {
    const claimEntries = await db.currencyLedger.findMany({
      where: {
        userId,
        referenceId: { startsWith: ACHIEVEMENT_REFERENCE_PREFIX },
      },
      select: {
        referenceId: true,
      },
    });

    const ids = claimEntries
      .map((entry) => (entry.referenceId ? parseAchievementIdFromReference(entry.referenceId) : null))
      .filter((value): value is string => value !== null);

    return new Set(ids);
  },

  async getAchievementsForPlayer(userId: string): Promise<AchievementDTO[]> {
    const [stats, claimedIds] = await Promise.all([loadAchievementStats(userId), this.getClaimedAchievementIds(userId)]);
    const unlockedIds = collectUnlockedAchievementIds(ACHIEVEMENT_DEFINITIONS, stats);

    return ACHIEVEMENT_DEFINITIONS.map((achievement) => ({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      rewardCC: achievement.rewardCC,
      rewardXP: achievement.rewardXP,
      trigger: achievement.trigger,
      unlocked: unlockedIds.has(achievement.id),
      claimed: claimedIds.has(achievement.id),
    }));
  },

  async claimAchievement(userId: string, achievementId: string): Promise<AchievementClaimResultDTO> {
    const definition = ACHIEVEMENT_DEFINITION_BY_ID[achievementId];
    if (!definition) {
      throw new DomainError('VALIDATION_ERROR', 'Logro inválido.');
    }

    const referenceId = getAchievementReferenceId(achievementId);

    return db.$transaction(async (tx) => {
      const [progression, extractionResultsCount, catastropheOccurredCount, existingClaim, latestLedgerEntry] =
        await Promise.all([
          tx.userProgression.findUnique({ where: { userId } }),
          tx.extractionResult.count({ where: { userId } }),
          tx.extractionResult.count({ where: { userId, catastropheOccurred: true } }),
          tx.currencyLedger.findFirst({ where: { userId, referenceId }, select: { id: true } }),
          tx.currencyLedger.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: { balanceAfter: true },
          }),
        ]);

      if (!progression) {
        throw new DomainError('NOT_FOUND', 'No se encontró progresión para reclamar el logro.');
      }

      if (existingClaim) {
        throw new DomainError('VALIDATION_ERROR', 'Este logro ya fue reclamado.');
      }

      const stats: PlayerAchievementStats = {
        extractionResultsCount,
        catastropheOccurredCount,
        level: progression.currentLevel,
        totalScrapCollected: progression.totalScrapCollected,
      };

      if (!isAchievementUnlocked(definition.trigger, stats)) {
        throw new DomainError('VALIDATION_ERROR', 'Este logro todavía no está desbloqueado.');
      }

      const reward = toAchievementRewardPayload(definition);
      const balanceBefore = latestLedgerEntry?.balanceAfter ?? 0;
      const newBalance = balanceBefore + reward.rewardCC;
      const xpProgress = calculateLevelProgress(
        progression.currentXp,
        progression.currentLevel,
        reward.rewardXP
      );

      await tx.currencyLedger.create({
        data: {
          userId,
          amount: reward.rewardCC,
          balanceAfter: newBalance,
          entryType: 'CONTRACT_REWARD',
          referenceId,
        },
      });

      await tx.userProgression.update({
        where: { userId },
        data: {
          currentXp: xpProgress.newXp,
          currentLevel: xpProgress.newLevel,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'achievement.claim',
          payload: {
            achievementId,
            rewardCC: reward.rewardCC,
            rewardXP: reward.rewardXP,
            referenceId,
          },
        },
      });

      return {
        achievementId,
        rewardCC: reward.rewardCC,
        rewardXP: reward.rewardXP,
        newBalance,
        newLevel: xpProgress.newLevel,
        currentXp: xpProgress.newXp,
      };
    });
  },
};
