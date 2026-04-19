import 'server-only';

import { describe, expect, it } from 'vitest';

import { ACHIEVEMENT_DEFINITION_BY_ID, ACHIEVEMENT_DEFINITIONS } from '@/config/achievements.config';
import {
  collectUnlockedAchievementIds,
  isAchievementUnlocked,
  toAchievementRewardPayload,
} from '@/server/domain/progression/achievement.logic';

describe('achievement.logic', () => {
  it('unlocks deterministic achievements from summary stats', () => {
    const stats = {
      extractionResultsCount: 52,
      catastropheOccurredCount: 11,
      level: 10,
      totalScrapCollected: 8000,
    };

    const unlockedIds = collectUnlockedAchievementIds(ACHIEVEMENT_DEFINITIONS, stats);

    expect(unlockedIds.has('achievement_first_extraction')).toBe(true);
    expect(unlockedIds.has('achievement_catastrophe_veteran')).toBe(true);
    expect(unlockedIds.has('achievement_level_three')).toBe(true);
    expect(unlockedIds.has('achievement_scrap_hoarder')).toBe(true);
    expect(unlockedIds.has('achievement_ten_extractions')).toBe(true);
    expect(unlockedIds.has('achievement_fifty_extractions')).toBe(true);
    expect(unlockedIds.has('achievement_three_catastrophes')).toBe(true);
    expect(unlockedIds.has('achievement_ten_catastrophes')).toBe(true);
    expect(unlockedIds.has('achievement_level_five')).toBe(true);
    expect(unlockedIds.has('achievement_level_ten')).toBe(true);
    expect(unlockedIds.has('achievement_scrap_tycoon')).toBe(true);
    expect(unlockedIds.has('achievement_scrap_legend')).toBe(true);
  });

  it('keeps locked achievements locked when trigger target is not met', () => {
    const levelAchievement = ACHIEVEMENT_DEFINITION_BY_ID.achievement_level_three;

    const unlocked = isAchievementUnlocked(levelAchievement.trigger, {
      extractionResultsCount: 100,
      catastropheOccurredCount: 20,
      level: 2,
      totalScrapCollected: 10_000,
    });

    expect(unlocked).toBe(false);
  });

  it('returns reward payload exactly as configured', () => {
    const achievement = ACHIEVEMENT_DEFINITION_BY_ID.achievement_first_extraction;
    const payload = toAchievementRewardPayload(achievement);

    expect(payload).toEqual({
      rewardCC: achievement.rewardCC,
      rewardXP: achievement.rewardXP,
    });
  });

  it('keeps high-tier achievements locked when one trigger is still below target', () => {
    const topLevel = ACHIEVEMENT_DEFINITION_BY_ID.achievement_level_ten;
    const topScrap = ACHIEVEMENT_DEFINITION_BY_ID.achievement_scrap_legend;

    expect(
      isAchievementUnlocked(topLevel.trigger, {
        extractionResultsCount: 999,
        catastropheOccurredCount: 999,
        level: 9,
        totalScrapCollected: 20_000,
      })
    ).toBe(false);

    expect(
      isAchievementUnlocked(topScrap.trigger, {
        extractionResultsCount: 999,
        catastropheOccurredCount: 999,
        level: 99,
        totalScrapCollected: 7_499,
      })
    ).toBe(false);
  });

  it('unlocks D.1 extended achievements when advanced thresholds are met', () => {
    const stats = {
      extractionResultsCount: 120,
      catastropheOccurredCount: 25,
      level: 16,
      totalScrapCollected: 13_500,
    };

    const unlockedIds = collectUnlockedAchievementIds(ACHIEVEMENT_DEFINITIONS, stats);

    expect(unlockedIds.has('achievement_hundred_extractions')).toBe(true);
    expect(unlockedIds.has('achievement_twenty_catastrophes')).toBe(true);
    expect(unlockedIds.has('achievement_level_twelve')).toBe(true);
    expect(unlockedIds.has('achievement_level_fifteen')).toBe(true);
    expect(unlockedIds.has('achievement_void_scrap_magnate')).toBe(true);
  });
});
