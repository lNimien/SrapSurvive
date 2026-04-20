import 'server-only';

import { CrateRewardEntry } from '@/config/crates.config';
import { randomInt } from 'node:crypto';

export interface WeightedRewardSelection {
  reward: CrateRewardEntry;
  quantity: number;
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
