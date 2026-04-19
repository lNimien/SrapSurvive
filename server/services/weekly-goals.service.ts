import 'server-only';

import type { Prisma } from '@prisma/client';

import {
  ACTIVE_EVENT,
  normalizeWeeklyDirectiveReward,
  WEEKLY_DIRECTIVES,
  WeeklyDirectiveMetric,
} from '@/config/liveops.config';
import { WeeklyDirectiveClaimResultDTO, WeeklyGoalsDTO } from '@/types/dto.types';
import { ExtractionHistoryDomain, RunRepository } from '@/server/repositories/run.repository';
import { DomainError } from '@/server/domain/inventory/inventory.service';
import { db } from '@/server/db/client';
import { calculateLevelProgress } from '@/server/domain/progression/progression.calculator';

export interface WeeklyDirectiveStats {
  extractionsCompleted: number;
  catastrophesSurvived: number;
  zoneClears: Record<string, number>;
  materialsCollected: number;
  creditsEarned: number;
}

function normalizeWeekStart(now: Date): Date {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = start.getUTCDay();
  const distanceFromMonday = day === 0 ? 6 : day - 1;
  start.setUTCDate(start.getUTCDate() - distanceFromMonday);
  return start;
}

export function toWeekKey(weekStart: Date): string {
  return weekStart.toISOString().slice(0, 10);
}

export function getWeekWindowUTC(now: Date) {
  const weekStart = normalizeWeekStart(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  return { weekStart, weekEnd };
}

interface LootSnapshotItem {
  quantity: number;
}

function isLootSnapshotItem(value: unknown): value is LootSnapshotItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.quantity === 'number' && Number.isFinite(candidate.quantity);
}

export function buildWeeklyDirectiveStats(extractions: ExtractionHistoryDomain[]): WeeklyDirectiveStats {
  return extractions.reduce<WeeklyDirectiveStats>(
    (acc, extraction) => {
      if (extraction.status === 'EXTRACTED') {
        acc.extractionsCompleted += 1;
        acc.zoneClears[extraction.zoneId] = (acc.zoneClears[extraction.zoneId] ?? 0) + 1;
      }

      if (extraction.catastropheOccurred) {
        acc.catastrophesSurvived += 1;
      }

      acc.creditsEarned += extraction.currencyEarned;

      if (Array.isArray(extraction.lootSnapshot)) {
        for (const item of extraction.lootSnapshot) {
          if (isLootSnapshotItem(item)) {
            acc.materialsCollected += Math.max(0, Math.floor(item.quantity));
          }
        }
      }

      return acc;
    },
    {
      extractionsCompleted: 0,
      catastrophesSurvived: 0,
      zoneClears: {},
      materialsCollected: 0,
      creditsEarned: 0,
    },
  );
}

function resolveMetricValue(metric: WeeklyDirectiveMetric, stats: WeeklyDirectiveStats, zoneId?: string): number {
  switch (metric) {
    case 'EXTRACTIONS_COMPLETED':
      return stats.extractionsCompleted;
    case 'CATASTROPHES_SURVIVED':
      return stats.catastrophesSurvived;
    case 'MATERIALS_COLLECTED':
      return stats.materialsCollected;
    case 'CREDITS_EARNED':
      return stats.creditsEarned;
    case 'ZONE_CLEARS':
      return zoneId ? (stats.zoneClears[zoneId] ?? 0) : 0;
    default:
      return 0;
  }
}

const WEEKLY_DIRECTIVE_BY_ID = new Map(WEEKLY_DIRECTIVES.map((directive) => [directive.id, directive]));

export type ClaimAttemptOutcome = 'CLAIMED' | 'ALREADY_CLAIMED' | 'NOT_CLAIMABLE';

export function resolveClaimAttemptOutcome(input: {
  updatedCount: number;
  claimedAt: Date | null;
}): ClaimAttemptOutcome {
  if (input.updatedCount > 0) {
    return 'CLAIMED';
  }

  if (input.claimedAt) {
    return 'ALREADY_CLAIMED';
  }

  return 'NOT_CLAIMABLE';
}

async function getCurrentBalanceAndProgression(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<{ balance: number; progression: { currentXp: number; currentLevel: number } }> {
  const [latestLedgerEntry, progression] = await Promise.all([
    tx.currencyLedger.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    }),
    tx.userProgression.findUnique({
      where: { userId },
      select: {
        currentXp: true,
        currentLevel: true,
      },
    }),
  ]);

  if (!progression) {
    throw new DomainError('NOT_FOUND', 'No se encontró progresión del jugador.');
  }

  return {
    balance: latestLedgerEntry?.balanceAfter ?? 0,
    progression,
  };
}

export const WeeklyGoalsService = {
  async syncWeeklyDirectives(userId: string, now = new Date()) {
    const { weekStart, weekEnd } = getWeekWindowUTC(now);
    const weeklyExtractions = await RunRepository.listExtractionHistoryWithinWindow(userId, weekStart, weekEnd);
    const stats = buildWeeklyDirectiveStats(weeklyExtractions);

    return db.$transaction(async (tx) => {
      const existingRows = await tx.weeklyDirectiveProgress.findMany({
        where: {
          userId,
          weekStart,
        },
        select: {
          directiveKey: true,
          status: true,
        },
      });
      const statusByDirective = new Map(existingRows.map((entry) => [entry.directiveKey, entry.status]));

      for (const directive of WEEKLY_DIRECTIVES) {
        const progress = resolveMetricValue(directive.metric, stats, directive.zoneId);
        const normalizedProgress = Math.max(0, Math.floor(progress));
        const normalizedTarget = Math.max(1, Math.floor(directive.target));
        const cappedProgress = Math.min(normalizedProgress, normalizedTarget);
        const completed = normalizedProgress >= normalizedTarget;
        const normalizedReward = normalizeWeeklyDirectiveReward(directive);
        const previousStatus = statusByDirective.get(directive.id);

        await tx.weeklyDirectiveProgress.upsert({
          where: {
            userId_directiveKey_weekStart: {
              userId,
              directiveKey: directive.id,
              weekStart,
            },
          },
          create: {
            userId,
            directiveKey: directive.id,
            weekStart,
            target: normalizedTarget,
            progress: cappedProgress,
            status: completed ? 'CLAIMABLE' : 'IN_PROGRESS',
            rewardCC: normalizedReward.rewardCC,
            rewardXP: normalizedReward.rewardXP,
          },
          update: {
            target: normalizedTarget,
            progress: cappedProgress,
            status: previousStatus === 'CLAIMED' ? 'CLAIMED' : completed ? 'CLAIMABLE' : 'IN_PROGRESS',
            rewardCC: normalizedReward.rewardCC,
            rewardXP: normalizedReward.rewardXP,
          },
        });
      }

      return tx.weeklyDirectiveProgress.findMany({
        where: {
          userId,
          weekStart,
        },
      });
    });
  },

  async getWeeklyGoals(userId: string, now = new Date()): Promise<WeeklyGoalsDTO> {
    const { weekStart } = getWeekWindowUTC(now);
    const persisted = await this.syncWeeklyDirectives(userId, now);
    const persistedByDirective = new Map(persisted.map((entry) => [entry.directiveKey, entry]));

    return {
      weekKey: toWeekKey(weekStart),
      weekStart: weekStart.toISOString(),
      activeEvent: ACTIVE_EVENT,
      directives: WEEKLY_DIRECTIVES.map((directive) => {
        const row = persistedByDirective.get(directive.id);
        const target = row?.target ?? Math.max(1, Math.floor(directive.target));
        const progress = row?.progress ?? 0;
        const status = row?.status ?? 'IN_PROGRESS';
        const claimedAt = row?.claimedAt ?? null;
        const claimable = status === 'CLAIMABLE';
        const claimed = status === 'CLAIMED';

        return {
          id: directive.id,
          title: directive.title,
          description: directive.description,
          progress,
          target,
          completed: progress >= target,
          progressRatio: Math.min(1, progress / target),
          status,
          claimable,
          claimed,
          rewardCC: row?.rewardCC ?? normalizeWeeklyDirectiveReward(directive).rewardCC,
          rewardXP: row?.rewardXP ?? normalizeWeeklyDirectiveReward(directive).rewardXP,
          claimedAt: claimedAt ? claimedAt.toISOString() : null,
        };
      }),
    };
  },

  async claimWeeklyDirective(
    userId: string,
    input: { directiveKey: string; weekStart: string },
    options?: { simulateFailureAfterLedgerWrite?: boolean },
  ): Promise<WeeklyDirectiveClaimResultDTO> {
    const directive = WEEKLY_DIRECTIVE_BY_ID.get(input.directiveKey);
    if (!directive) {
      throw new DomainError('VALIDATION_ERROR', 'Directiva semanal inválida.');
    }

    const requestedWeekStart = new Date(input.weekStart);
    if (Number.isNaN(requestedWeekStart.getTime())) {
      throw new DomainError('VALIDATION_ERROR', 'weekStart inválido.');
    }

    const { weekStart } = getWeekWindowUTC(requestedWeekStart);
    await this.syncWeeklyDirectives(userId, requestedWeekStart);

    return db.$transaction(async (tx) => {
      const row = await tx.weeklyDirectiveProgress.findUnique({
        where: {
          userId_directiveKey_weekStart: {
            userId,
            directiveKey: directive.id,
            weekStart,
          },
        },
      });

      if (!row) {
        throw new DomainError('NOT_FOUND', 'No se encontró progreso semanal para reclamar.');
      }

      const referenceId = `weekly-directive:${directive.id}:${toWeekKey(row.weekStart)}:claim`;

      if (row.claimedAt) {
        const { balance, progression } = await getCurrentBalanceAndProgression(tx, userId);
        return {
          directiveKey: directive.id,
          weekStart: row.weekStart.toISOString(),
          rewardCC: row.rewardCC,
          rewardXP: row.rewardXP,
          newBalance: balance,
          newLevel: progression.currentLevel,
          currentXp: progression.currentXp,
          alreadyClaimed: true,
          claimedAt: row.claimedAt.toISOString(),
        };
      }

      const now = new Date();
      const markClaimed = await tx.weeklyDirectiveProgress.updateMany({
        where: {
          userId,
          directiveKey: directive.id,
          weekStart,
          status: 'CLAIMABLE',
          claimedAt: null,
        },
        data: {
          status: 'CLAIMED',
          claimedAt: now,
          claimReferenceId: referenceId,
        },
      });

      const outcome = resolveClaimAttemptOutcome({
        updatedCount: markClaimed.count,
        claimedAt: row.claimedAt,
      });

      if (outcome !== 'CLAIMED') {
        const refreshed = await tx.weeklyDirectiveProgress.findUnique({
          where: {
            userId_directiveKey_weekStart: {
              userId,
              directiveKey: directive.id,
              weekStart,
            },
          },
        });

        if (refreshed?.claimedAt) {
          const { balance, progression } = await getCurrentBalanceAndProgression(tx, userId);
          return {
            directiveKey: directive.id,
            weekStart: refreshed.weekStart.toISOString(),
            rewardCC: refreshed.rewardCC,
            rewardXP: refreshed.rewardXP,
            newBalance: balance,
            newLevel: progression.currentLevel,
            currentXp: progression.currentXp,
            alreadyClaimed: true,
            claimedAt: refreshed.claimedAt.toISOString(),
          };
        }

        throw new DomainError('VALIDATION_ERROR', 'La directiva semanal todavía no es reclamable.');
      }

      const { balance, progression } = await getCurrentBalanceAndProgression(tx, userId);
      const newBalance = balance + row.rewardCC;
      const xpProgress = calculateLevelProgress(progression.currentXp, progression.currentLevel, row.rewardXP);

      await tx.currencyLedger.create({
        data: {
          userId,
          amount: row.rewardCC,
          balanceAfter: newBalance,
          entryType: 'CONTRACT_REWARD',
          referenceId,
        },
      });

      if (options?.simulateFailureAfterLedgerWrite) {
        throw new Error('Forced weekly directive claim failure after ledger write.');
      }

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
          action: 'liveops.weekly.claim',
          payload: {
            directiveKey: directive.id,
            weekStart: row.weekStart.toISOString(),
            rewardCC: row.rewardCC,
            rewardXP: row.rewardXP,
            referenceId,
          },
        },
      });

      return {
        directiveKey: directive.id,
        weekStart: row.weekStart.toISOString(),
        rewardCC: row.rewardCC,
        rewardXP: row.rewardXP,
        newBalance,
        newLevel: xpProgress.newLevel,
        currentXp: xpProgress.newXp,
        alreadyClaimed: false,
        claimedAt: now.toISOString(),
      };
    });
  },
};
