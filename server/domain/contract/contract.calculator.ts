import 'server-only';
import { ITEM_CATALOG } from '../../../config/game.config';
import { ItemCategory, ItemRarity } from '../../../types/game.types';

/**
 * Logic to generate balanced contracts.
 */

export interface ContractDraft {
  requiredItemDefId: string;
  requiredQuantity: number;
  rewardCC: number;
  rewardXP: number;
}

export type ContractDifficultyBracket = 'EASY' | 'STANDARD' | 'HARD';

export interface ContractGenerationOptions {
  readonly playerLevel?: number;
  readonly difficultyBracket?: ContractDifficultyBracket;
}

interface DifficultyProfile {
  readonly eligibleRarities: readonly ItemRarity[];
  readonly quantityMultiplier: number;
  readonly rewardMultiplier: number;
}

const DIFFICULTY_PROFILES: Readonly<Record<ContractDifficultyBracket, DifficultyProfile>> = {
  EASY: {
    eligibleRarities: [ItemRarity.COMMON],
    quantityMultiplier: 0.9,
    rewardMultiplier: 1.0,
  },
  STANDARD: {
    eligibleRarities: [ItemRarity.COMMON, ItemRarity.UNCOMMON],
    quantityMultiplier: 1.05,
    rewardMultiplier: 1.12,
  },
  HARD: {
    eligibleRarities: [ItemRarity.UNCOMMON],
    quantityMultiplier: 1.2,
    rewardMultiplier: 1.28,
  },
};

function seededRandom(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash) % 1000 / 1000;
}

export function resolveDifficultyBracket(seed: string, playerLevel: number): ContractDifficultyBracket {
  const levelBias = Math.min(0.35, Math.max(0, (playerLevel - 1) * 0.03));
  const easyThreshold = 0.54 - (levelBias * 0.5);
  const hardThreshold = 0.92 - (levelBias * 0.4);
  const roll = seededRandom(`${seed}:difficulty`);

  if (roll < easyThreshold) {
    return 'EASY';
  }

  if (roll < hardThreshold) {
    return 'STANDARD';
  }

  return 'HARD';
}

/**
 * Generates a random contract draft.
 */
export function generateContractDraft(seed: string, options: ContractGenerationOptions = {}): ContractDraft {
  const playerLevel = Math.max(1, options.playerLevel ?? 1);
  const difficulty = options.difficultyBracket ?? resolveDifficultyBracket(seed, playerLevel);
  const profile = DIFFICULTY_PROFILES[difficulty];

  // 1. Filter eligible materials by difficulty bracket
  const eligibleMaterials = ITEM_CATALOG.filter((item) =>
    item.itemType === ItemCategory.MATERIAL
    && profile.eligibleRarities.includes(item.rarity)
    && item.baseValue > 0
  );

  const rand = seededRandom(`${seed}:item:${difficulty}`);
  const itemIndex = Math.floor(rand * eligibleMaterials.length);
  const item = eligibleMaterials[itemIndex];

  // 3. Determine quantity based on item value
  // Low value (1-2) -> High quantity (20-50)
  // High value (10-20) -> Low quantity (5-10)
  const baseValue = item.baseValue;
  let baseQty;
  
  if (baseValue <= 2) baseQty = 30 + Math.floor(seededRandom(`${seed}:qty`) * 40);
  else if (baseValue <= 5) baseQty = 15 + Math.floor(seededRandom(`${seed}:qty`) * 20);
  else if (baseValue <= 12) baseQty = 8 + Math.floor(seededRandom(`${seed}:qty`) * 10);
  else baseQty = 3 + Math.floor(seededRandom(`${seed}:qty`) * 5);

  const levelQuantityFactor = 1 + Math.min(0.35, (playerLevel - 1) * 0.025);
  const requiredQuantity = Math.max(1, Math.floor(baseQty * profile.quantityMultiplier * levelQuantityFactor));

  // 4. Calculate rewards
  // CC: approx 1.5x - 2x market value
  // XP: approx CC * (2 to 4)
  const marketValue = requiredQuantity * baseValue;
  const levelRewardFactor = 1 + Math.min(0.6, (playerLevel - 1) * 0.03);
  const rewardCC = Math.max(
    1,
    Math.floor(
      marketValue
      * (1.45 + seededRandom(`${seed}:cc`) * 0.45)
      * profile.rewardMultiplier
      * levelRewardFactor
    )
  );
  const rewardXP = Math.max(1, Math.floor(rewardCC * (2 + seededRandom(`${seed}:xp`) * 2)));

  return {
    requiredItemDefId: item.id,
    requiredQuantity,
    rewardCC,
    rewardXP,
  };
}
