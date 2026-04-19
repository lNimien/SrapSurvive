import 'server-only';

import { describe, expect, it } from 'vitest';

import { ITEM_CATALOG } from '@/config/game.config';
import {
  generateContractDraft,
  resolveDifficultyBracket,
} from '@/server/domain/contract/contract.calculator';
import { ItemCategory, ItemRarity } from '@/types/game.types';

describe('contract.calculator', () => {
  it('returns deterministic draft for same seed', () => {
    const first = generateContractDraft('daily-seed-user-1', { playerLevel: 4 });
    const second = generateContractDraft('daily-seed-user-1', { playerLevel: 4 });

    expect(first).toEqual(second);
  });

  it('resolves deterministic difficulty bracket by seed + level', () => {
    const first = resolveDifficultyBracket('difficulty-seed-user-1', 8);
    const second = resolveDifficultyBracket('difficulty-seed-user-1', 8);

    expect(first).toBe(second);
    expect(['EASY', 'STANDARD', 'HARD']).toContain(first);
  });

  it('picks an eligible material category and rarity', () => {
    const draft = generateContractDraft('daily-seed-user-2', { playerLevel: 2 });
    const item = ITEM_CATALOG.find((catalogItem) => catalogItem.id === draft.requiredItemDefId);

    expect(item).toBeDefined();
    expect(item?.itemType).toBe(ItemCategory.MATERIAL);
    expect([ItemRarity.COMMON, ItemRarity.UNCOMMON]).toContain(item?.rarity as ItemRarity);
  });

  it('creates strictly positive quantity and rewards', () => {
    const draft = generateContractDraft('daily-seed-user-3', { playerLevel: 5 });

    expect(draft.requiredQuantity).toBeGreaterThan(0);
    expect(draft.rewardCC).toBeGreaterThan(0);
    expect(draft.rewardXP).toBeGreaterThan(0);
  });

  it('keeps rewardXP between 2x and 4x rewardCC', () => {
    const draft = generateContractDraft('daily-seed-user-4', { playerLevel: 6 });

    expect(draft.rewardXP).toBeGreaterThanOrEqual(draft.rewardCC * 2);
    expect(draft.rewardXP).toBeLessThanOrEqual(draft.rewardCC * 4);
  });

  it('scales reward up with player level for same seed and difficulty', () => {
    const lowLevelDraft = generateContractDraft('daily-seed-level-scaling', {
      playerLevel: 1,
      difficultyBracket: 'STANDARD',
    });
    const highLevelDraft = generateContractDraft('daily-seed-level-scaling', {
      playerLevel: 12,
      difficultyBracket: 'STANDARD',
    });

    expect(highLevelDraft.rewardCC).toBeGreaterThan(lowLevelDraft.rewardCC);
    expect(highLevelDraft.rewardXP).toBeGreaterThan(lowLevelDraft.rewardXP);
  });

  it('keeps hard contracts with higher payout than easy for same seed + level', () => {
    const easyDraft = generateContractDraft('daily-seed-difficulty-band', {
      playerLevel: 7,
      difficultyBracket: 'EASY',
    });
    const hardDraft = generateContractDraft('daily-seed-difficulty-band', {
      playerLevel: 7,
      difficultyBracket: 'HARD',
    });

    expect(hardDraft.rewardCC).toBeGreaterThanOrEqual(easyDraft.rewardCC);
    expect(hardDraft.rewardXP).toBeGreaterThanOrEqual(easyDraft.rewardXP);
  });
});
