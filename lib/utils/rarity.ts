import { ItemRarityDTO } from '@/types/dto.types';
import {
  ITEM_TIER_LADDER,
  ITEM_TIER_META,
  ItemTier,
  LEGACY_RARITY_TO_TIER,
} from '@/config/item-tiers.config';

export interface RarityVisualTokens {
  borderClass: string;
  textClass: string;
  bgClass: string;
}

export function resolveItemTier(input: ItemRarityDTO | ItemTier): ItemTier {
  if ((ITEM_TIER_LADDER as readonly string[]).includes(input)) {
    return input as ItemTier;
  }

  return LEGACY_RARITY_TO_TIER[input as ItemRarityDTO] ?? 'COMMON';
}

export function getTierLabel(input: ItemRarityDTO | ItemTier): string {
  return ITEM_TIER_META[resolveItemTier(input)].label;
}

export function compareTierOrder(a: ItemRarityDTO | ItemTier, b: ItemRarityDTO | ItemTier): number {
  return ITEM_TIER_META[resolveItemTier(a)].rank - ITEM_TIER_META[resolveItemTier(b)].rank;
}

export function getRarityVisuals(rarity: ItemRarityDTO): RarityVisualTokens {
  const meta = ITEM_TIER_META[resolveItemTier(rarity)];

  return {
    borderClass: meta.borderClass,
    textClass: meta.textClass,
    bgClass: meta.bgClass,
  };
}
