import { describe, expect, it } from 'vitest';

import { CRATE_DEFINITIONS } from '@/config/crates.config';

describe('crates config integrity', () => {
  it('defines non-empty reward pools with positive weights', () => {
    for (const crate of CRATE_DEFINITIONS) {
      expect(crate.rewards.length).toBeGreaterThan(0);
      expect(crate.rewards.every((reward) => reward.weight > 0)).toBe(true);
      expect(crate.rewards.every((reward) => reward.quantityMax >= reward.quantityMin)).toBe(true);
    }
  });

  it('keeps probability table normalized per crate', () => {
    for (const crate of CRATE_DEFINITIONS) {
      const totalWeight = crate.rewards.reduce((sum, reward) => sum + reward.weight, 0);
      expect(totalWeight).toBeGreaterThan(0);
    }
  });
});

