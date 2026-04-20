import { ItemRarityDTO } from '@/types/dto.types';

export const ITEM_TIER_LADDER = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
  'GODLIKE',
] as const;

export type ItemTier = (typeof ITEM_TIER_LADDER)[number];

export interface ItemTierMeta {
  id: ItemTier;
  label: string;
  rank: number;
  borderClass: string;
  accentClass: string;
  badgeClass: string;
  textClass: string;
  bgClass: string;
  craftingUnlockOrder: number;
  craftingLevelFloor: number;
  capsuleWeightGroup: 'core' | 'elevated' | 'apex';
}

export const ITEM_TIER_META: Record<ItemTier, ItemTierMeta> = {
  COMMON: {
    id: 'COMMON',
    label: 'Common',
    rank: 0,
    borderClass: 'border-l-slate-400',
    accentClass: 'text-slate-300',
    badgeClass: 'border-slate-400/50 bg-slate-500/10 text-slate-200',
    textClass: 'text-slate-300',
    bgClass: 'bg-slate-500/10',
    craftingUnlockOrder: 0,
    craftingLevelFloor: 1,
    capsuleWeightGroup: 'core',
  },
  UNCOMMON: {
    id: 'UNCOMMON',
    label: 'Uncommon',
    rank: 1,
    borderClass: 'border-l-lime-400',
    accentClass: 'text-lime-300',
    badgeClass: 'border-lime-400/50 bg-lime-500/10 text-lime-200',
    textClass: 'text-lime-300',
    bgClass: 'bg-lime-500/10',
    craftingUnlockOrder: 1,
    craftingLevelFloor: 3,
    capsuleWeightGroup: 'core',
  },
  RARE: {
    id: 'RARE',
    label: 'Rare',
    rank: 2,
    borderClass: 'border-l-violet-400',
    accentClass: 'text-violet-300',
    badgeClass: 'border-violet-400/50 bg-violet-500/10 text-violet-200',
    textClass: 'text-violet-300',
    bgClass: 'bg-violet-500/10',
    craftingUnlockOrder: 2,
    craftingLevelFloor: 6,
    capsuleWeightGroup: 'elevated',
  },
  EPIC: {
    id: 'EPIC',
    label: 'Epic',
    rank: 3,
    borderClass: 'border-l-rose-500',
    accentClass: 'text-rose-300',
    badgeClass: 'border-rose-500/50 bg-rose-500/10 text-rose-200',
    textClass: 'text-rose-300',
    bgClass: 'bg-rose-500/10',
    craftingUnlockOrder: 3,
    craftingLevelFloor: 9,
    capsuleWeightGroup: 'elevated',
  },
  LEGENDARY: {
    id: 'LEGENDARY',
    label: 'Legendary',
    rank: 4,
    borderClass: 'border-l-amber-400',
    accentClass: 'text-amber-300',
    badgeClass: 'border-amber-400/50 bg-amber-500/10 text-amber-200',
    textClass: 'text-amber-300',
    bgClass: 'bg-amber-500/10',
    craftingUnlockOrder: 4,
    craftingLevelFloor: 11,
    capsuleWeightGroup: 'apex',
  },
  GODLIKE: {
    id: 'GODLIKE',
    label: 'Godlike',
    rank: 5,
    borderClass: 'border-l-cyan-300',
    accentClass: 'text-cyan-200',
    badgeClass: 'border-cyan-300/60 bg-cyan-500/10 text-cyan-100',
    textClass: 'text-cyan-200',
    bgClass: 'bg-cyan-500/10',
    craftingUnlockOrder: 5,
    craftingLevelFloor: 13,
    capsuleWeightGroup: 'apex',
  },
};

export const LEGACY_RARITY_TO_TIER: Partial<Record<ItemRarityDTO, ItemTier>> = {
  CORRUPTED: 'GODLIKE',
};
