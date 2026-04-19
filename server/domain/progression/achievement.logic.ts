import 'server-only';

import { AchievementDefinition, AchievementTriggerRule } from '@/config/achievements.config';

export interface PlayerAchievementStats {
  readonly extractionResultsCount: number;
  readonly catastropheOccurredCount: number;
  readonly level: number;
  readonly totalScrapCollected: number;
}

export interface AchievementRewardPayload {
  readonly rewardCC: number;
  readonly rewardXP: number;
}

export function isAchievementUnlocked(
  trigger: AchievementTriggerRule,
  stats: PlayerAchievementStats
): boolean {
  switch (trigger.type) {
    case 'EXTRACTION_RESULTS_COUNT':
      return stats.extractionResultsCount >= trigger.target;
    case 'CATASTROPHE_OCCURRED_COUNT':
      return stats.catastropheOccurredCount >= trigger.target;
    case 'LEVEL_REACHED':
      return stats.level >= trigger.target;
    case 'TOTAL_SCRAP_COLLECTED':
      return stats.totalScrapCollected >= trigger.target;
    default:
      return false;
  }
}

export function collectUnlockedAchievementIds(
  definitions: readonly AchievementDefinition[],
  stats: PlayerAchievementStats
): Set<string> {
  return new Set(
    definitions.filter((definition) => isAchievementUnlocked(definition.trigger, stats)).map((definition) => definition.id)
  );
}

export function toAchievementRewardPayload(definition: AchievementDefinition): AchievementRewardPayload {
  return {
    rewardCC: definition.rewardCC,
    rewardXP: definition.rewardXP,
  };
}
