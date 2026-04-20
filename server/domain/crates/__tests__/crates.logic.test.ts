import { describe, expect, it } from 'vitest';

import { selectWeightedReward, toProbabilityPercent } from '../crates.logic';

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
});

