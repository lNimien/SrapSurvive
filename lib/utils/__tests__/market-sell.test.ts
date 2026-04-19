import { describe, expect, it } from 'vitest';

import { normalizeSellAmount } from '@/lib/utils/market-sell';

describe('normalizeSellAmount', () => {
  it('clamps slider values inside inventory bounds', () => {
    expect(normalizeSellAmount(0, 5)).toBe(1);
    expect(normalizeSellAmount(3.2, 5)).toBe(3);
    expect(normalizeSellAmount(999, 5)).toBe(5);
  });

  it('handles invalid values with safe fallback', () => {
    expect(normalizeSellAmount(Number.NaN, 4)).toBe(1);
    expect(normalizeSellAmount(2, 0)).toBe(1);
  });
});
