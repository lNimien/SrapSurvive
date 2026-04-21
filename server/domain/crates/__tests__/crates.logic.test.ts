import { describe, expect, it } from 'vitest';

import {
  computeDynamicCratePrice,
  computePityState,
  isEpicOrHigherRarity,
  selectWeightedReward,
  toProbabilityPercent,
} from '../crates.logic';

describe('crates.logic', () => {
  it('selects weighted rewards and quantity within range', () => {
    const rewards = [
      { itemDefinitionId: 'a', weight: 10, quantityMin: 1, quantityMax: 3 },
      { itemDefinitionId: 'b', weight: 5, quantityMin: 2, quantityMax: 2 },
    ];

    const rng = {
      nextInt: (minInclusive: number, maxExclusive: number) => {
        // first call for ticket picks reward a, second call picks quantity 2
        if (minInclusive === 1 && maxExclusive === 16) return 4;
        return 2;
      },
    };

    const selected = selectWeightedReward(rewards, rng);

    expect(selected.reward.itemDefinitionId).toBe('a');
    expect(selected.quantity).toBeGreaterThanOrEqual(1);
    expect(selected.quantity).toBeLessThanOrEqual(3);
  });

  it('converts weight to bounded percentage', () => {
    expect(toProbabilityPercent(25, 100)).toBe(25);
    expect(toProbabilityPercent(0, 100)).toBe(0);
    expect(toProbabilityPercent(3, 0)).toBe(0);
  });

  it('scales crate price per open with cap', () => {
    expect(computeDynamicCratePrice(100, 0, { incrementPerOpenPercent: 15, maxMultiplierPercent: 220 })).toBe(100);
    expect(computeDynamicCratePrice(100, 2, { incrementPerOpenPercent: 15, maxMultiplierPercent: 220 })).toBe(130);
    expect(computeDynamicCratePrice(100, 20, { incrementPerOpenPercent: 15, maxMultiplierPercent: 220 })).toBe(220);
  });

  it('computes pity state and trigger correctly', () => {
    expect(computePityState(6, 4)).toMatchObject({ pityToEpic: 2, shouldForceEpic: false });
    expect(computePityState(6, 6)).toMatchObject({ pityToEpic: 0, shouldForceEpic: true });
  });

  it('detects epic-or-higher rarities', () => {
    expect(isEpicOrHigherRarity('COMMON')).toBe(false);
    expect(isEpicOrHigherRarity('EPIC')).toBe(true);
    expect(isEpicOrHigherRarity('LEGENDARY')).toBe(true);
    expect(isEpicOrHigherRarity('CORRUPTED')).toBe(true);
  });
});
