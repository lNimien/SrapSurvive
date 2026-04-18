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

/**
 * Generates a random contract draft.
 */
export function generateContractDraft(seed: string): ContractDraft {
  // 1. Filter eligible materials (COMMON/UNCOMMON for now)
  const eligibleMaterials = ITEM_CATALOG.filter(item => 
    item.itemType === ItemCategory.MATERIAL && 
    (item.rarity === ItemRarity.COMMON || item.rarity === ItemRarity.UNCOMMON) &&
    item.baseValue > 0
  );

  // 2. Deterministic but "random" selection using seed
  const seededRandom = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 1000 / 1000;
  };

  const rand = seededRandom(seed);
  const itemIndex = Math.floor(rand * eligibleMaterials.length);
  const item = eligibleMaterials[itemIndex];

  // 3. Determine quantity based on item value
  // Low value (1-2) -> High quantity (20-50)
  // High value (10-20) -> Low quantity (5-10)
  const baseValue = item.baseValue;
  let baseQty;
  
  if (baseValue <= 2) baseQty = 30 + Math.floor(seededRandom(seed + 'qty') * 40);
  else if (baseValue <= 5) baseQty = 15 + Math.floor(seededRandom(seed + 'qty') * 20);
  else if (baseValue <= 12) baseQty = 8 + Math.floor(seededRandom(seed + 'qty') * 10);
  else baseQty = 3 + Math.floor(seededRandom(seed + 'qty') * 5);

  // 4. Calculate rewards
  // CC: approx 1.5x - 2x market value
  // XP: approx CC * (2 to 4)
  const marketValue = baseQty * baseValue;
  const rewardCC = Math.floor(marketValue * (1.5 + seededRandom(seed + 'cc') * 0.5));
  const rewardXP = Math.floor(rewardCC * (2 + seededRandom(seed + 'xp') * 2));

  return {
    requiredItemDefId: item.id,
    requiredQuantity: baseQty,
    rewardCC,
    rewardXP,
  };
}
