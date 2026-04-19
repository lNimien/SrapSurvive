import 'server-only';

import { describe, expect, it } from 'vitest';

import { computeItemPrice, computeSellUnitPrice } from '@/server/domain/economy/market.calculator';

describe('market.calculator', () => {
  it('returns deterministic price for same seed and item', () => {
    const first = computeItemPrice(50, '2026-04-18', 'scrap_metal');
    const second = computeItemPrice(50, '2026-04-18', 'scrap_metal');

    expect(first).toBe(second);
  });

  it('can return different prices for different items under same seed', () => {
    const scrapPrice = computeItemPrice(50, '2026-04-18', 'scrap_metal');
    const fiberPrice = computeItemPrice(50, '2026-04-18', 'armor_fiber');

    expect(scrapPrice).not.toBe(fiberPrice);
  });

  it('returns 0 when baseValue is zero or less', () => {
    expect(computeItemPrice(0, '2026-04-18', 'scrap_metal')).toBe(0);
    expect(computeItemPrice(-10, '2026-04-18', 'scrap_metal')).toBe(0);
  });

  it('keeps rounded price in configured range (0.8x..1.3x)', () => {
    const baseValue = 37;
    const testedItems = ['scrap_metal', 'energy_cell', 'recycled_component', 'armor_fiber'];
    const testedDates = ['2026-04-18', '2026-04-19', '2026-04-20', '2026-04-21'];

    for (const itemId of testedItems) {
      for (const dateSeed of testedDates) {
        const price = computeItemPrice(baseValue, dateSeed, itemId);

        expect(price).toBeGreaterThanOrEqual(Math.round(baseValue * 0.8));
        expect(price).toBeLessThanOrEqual(Math.round(baseValue * 1.3));
      }
    }
  });

  it('computes deterministic nerfed sell prices with global bounds', () => {
    expect(computeSellUnitPrice(0)).toBe(0);
    expect(computeSellUnitPrice(-5)).toBe(0);
    expect(computeSellUnitPrice(1)).toBe(1);
    expect(computeSellUnitPrice(100)).toBe(35);
    expect(computeSellUnitPrice(421)).toBe(Math.floor(421 * 0.35));
    expect(computeSellUnitPrice(421)).toBe(computeSellUnitPrice(421));
  });
});
