import 'server-only';

import { CrateRewardEntry } from '@/config/crates.config';
import { randomInt } from 'node:crypto';
import { ItemRarityDTO } from '@/types/dto.types';

export interface WeightedRewardSelection {
  reward: CrateRewardEntry;
  quantity: number;
}

export interface CrateDynamicPricingPolicy {
  incrementPerOpenPercent: number;
  maxMultiplierPercent: number;
}

export interface CratePityState {
  threshold: number;
  opensWithoutEpic: number;
  pityToEpic: number;
  shouldForceEpic: boolean;
}

export interface RngProvider {
  nextInt(minInclusive: number, maxExclusive: number): number;
}

export const defaultRng: RngProvider = {
  nextInt(minInclusive, maxExclusive) {
    return randomInt(minInclusive, maxExclusive);
  },
};

export function selectWeightedReward(rewards: CrateRewardEntry[], rng: RngProvider = defaultRng): WeightedRewardSelection {
  if (rewards.length === 0) {
    throw new Error('Crate rewards cannot be empty.');
  }

  const totalWeight = rewards.reduce((sum, reward) => sum + reward.weight, 0);
  if (totalWeight <= 0) {
    throw new Error('Crate rewards must have positive total weight.');
  }

  const ticket = rng.nextInt(1, totalWeight + 1);
  let cursor = 0;

  for (const reward of rewards) {
    cursor += reward.weight;
    if (ticket <= cursor) {
      const quantityMaxExclusive = reward.quantityMax + 1;
      const quantity = rng.nextInt(reward.quantityMin, quantityMaxExclusive);
      return {
        reward,
        quantity,
      };
    }
  }

  // Fallback safety (should never happen due to math above)
  const fallback = rewards[rewards.length - 1];
  return {
    reward: fallback,
    quantity: fallback.quantityMin,
  };
}

export function toProbabilityPercent(weight: number, totalWeight: number): number {
  if (totalWeight <= 0) return 0;
  return Number(((weight / totalWeight) * 100).toFixed(2));
}

export function computeDynamicCratePrice(
  basePriceCC: number,
  dailyOpenCount: number,
  policy: CrateDynamicPricingPolicy,
): number {
  const safeBase = Math.max(0, Math.floor(basePriceCC));
  const safeCount = Math.max(0, Math.floor(dailyOpenCount));
  const step = Math.max(0, policy.incrementPerOpenPercent) / 100;
  const cap = Math.max(1, policy.maxMultiplierPercent / 100);

  const multiplier = Math.min(1 + step * safeCount, cap);
  return Math.max(1, Math.round(safeBase * multiplier));
}

export function computePityState(
  threshold: number,
  opensWithoutEpic: number,
): CratePityState {
  const safeThreshold = Math.max(1, Math.floor(threshold));
  const safeOpensWithoutEpic = Math.max(0, Math.floor(opensWithoutEpic));
  const remaining = Math.max(0, safeThreshold - safeOpensWithoutEpic);

  return {
    threshold: safeThreshold,
    opensWithoutEpic: safeOpensWithoutEpic,
    pityToEpic: remaining,
    shouldForceEpic: safeOpensWithoutEpic >= safeThreshold,
  };
}

export function isEpicOrHigherRarity(rarity: ItemRarityDTO): boolean {
  return rarity === 'EPIC' || rarity === 'LEGENDARY' || rarity === 'CORRUPTED';
}
