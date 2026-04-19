import 'server-only';

import { describe, expect, it } from 'vitest';

import {
  computeSalvageCredits,
  computeSalvageCreditsPerItem,
} from '@/server/domain/inventory/salvage.logic';

describe('salvage.logic', () => {
  it('applies deterministic floor rule for per-item salvage credits', () => {
    expect(computeSalvageCreditsPerItem(10)).toBe(3);
    expect(computeSalvageCreditsPerItem(4)).toBe(1);
    expect(computeSalvageCreditsPerItem(45)).toBe(15);
  });

  it('enforces minimum 1 credit per item when baseValue is positive', () => {
    expect(computeSalvageCreditsPerItem(1)).toBe(1);
    expect(computeSalvageCreditsPerItem(2)).toBe(1);
  });

  it('returns 0 when baseValue is zero or negative', () => {
    expect(computeSalvageCreditsPerItem(0)).toBe(0);
    expect(computeSalvageCreditsPerItem(-10)).toBe(0);
  });

  it('multiplies per-item salvage credits by quantity', () => {
    expect(computeSalvageCredits({ baseValue: 12, quantity: 3 })).toBe(12);
    expect(computeSalvageCredits({ baseValue: 2, quantity: 5 })).toBe(5);
  });
});
