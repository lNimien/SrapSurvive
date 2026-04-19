import 'server-only';

import { describe, expect, it } from 'vitest';

import { computeLevelRewardBonus } from '@/server/domain/progression/reward-bonus.logic';

describe('reward-bonus.logic', () => {
  it('returns neutral multipliers at level 1', () => {
    expect(computeLevelRewardBonus(1)).toEqual({
      currencyMultiplier: 1,
      xpMultiplier: 1,
    });
  });

  it('scales currency and xp multipliers conservatively by level', () => {
    expect(computeLevelRewardBonus(8)).toEqual({
      currencyMultiplier: 1.105,
      xpMultiplier: 1.07,
    });
  });

  it('caps the bonus multipliers at configured maximums', () => {
    expect(computeLevelRewardBonus(100)).toEqual({
      currencyMultiplier: 1.3,
      xpMultiplier: 1.2,
    });
  });
});
