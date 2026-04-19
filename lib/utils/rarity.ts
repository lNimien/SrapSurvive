import { ItemRarityDTO } from '@/types/dto.types';

export interface RarityVisualTokens {
  borderClass: string;
  textClass: string;
  bgClass: string;
}

const RARITY_VISUALS: Record<ItemRarityDTO, RarityVisualTokens> = {
  COMMON: {
    borderClass: 'border-l-slate-400',
    textClass: 'text-slate-300',
    bgClass: 'bg-slate-500/10',
  },
  UNCOMMON: {
    borderClass: 'border-l-emerald-400',
    textClass: 'text-emerald-300',
    bgClass: 'bg-emerald-500/10',
  },
  RARE: {
    borderClass: 'border-l-blue-400',
    textClass: 'text-blue-300',
    bgClass: 'bg-blue-500/10',
  },
  EPIC: {
    borderClass: 'border-l-fuchsia-400',
    textClass: 'text-fuchsia-300',
    bgClass: 'bg-fuchsia-500/10',
  },
  LEGENDARY: {
    borderClass: 'border-l-amber-400',
    textClass: 'text-amber-300',
    bgClass: 'bg-amber-500/10',
  },
  CORRUPTED: {
    borderClass: 'border-l-red-500',
    textClass: 'text-red-300',
    bgClass: 'bg-red-500/10',
  },
};

export function getRarityVisuals(rarity: ItemRarityDTO): RarityVisualTokens {
  return RARITY_VISUALS[rarity] ?? RARITY_VISUALS.COMMON;
}
