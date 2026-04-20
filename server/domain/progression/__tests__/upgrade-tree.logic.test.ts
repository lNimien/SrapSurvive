import 'server-only';

import { describe, expect, it } from 'vitest';

import { UPGRADE_TREE_DEFINITIONS } from '@/config/upgrades-tree.config';
import {
  applyCraftingCostMultiplier,
  applyMarketBuyPriceMultiplier,
  applyMarketSellPriceMultiplier,
  buildUpgradeRuntimeProfile,
  computeResearchRefund,
  UPGRADE_CANCEL_REFUND_RATIO,
} from '@/server/domain/progression/upgrade-tree.logic';

describe('upgrade-tree.logic', () => {
  it('aggregates runtime profile from unlocked node levels deterministically', () => {
    const profileA = buildUpgradeRuntimeProfile(UPGRADE_TREE_DEFINITIONS, {
      bridge_hull_stabilizers: 1,
      market_broker_network: 2,
    });

    const profileB = buildUpgradeRuntimeProfile(UPGRADE_TREE_DEFINITIONS, {
      market_broker_network: 2,
      bridge_hull_stabilizers: 1,
    });

    expect(profileA).toEqual(profileB);
    expect(profileA.baseRateMultiplier).toBeLessThan(1);
    expect(profileA.marketBuyPriceMultiplier).toBeLessThan(1);
    expect(profileA.marketSellPriceMultiplier).toBeGreaterThan(1);
  });

  it('applies economy multipliers using rounded safe floor', () => {
    const profile = buildUpgradeRuntimeProfile(UPGRADE_TREE_DEFINITIONS, {
      market_broker_network: 3,
      market_quantum_barter: 2,
    });

    expect(applyMarketBuyPriceMultiplier(100, profile)).toBeGreaterThan(0);
    expect(applyMarketSellPriceMultiplier(100, profile)).toBeGreaterThanOrEqual(100);
  });

  it('applies crafting multiplier and computes cancellation refund ratio', () => {
    const profile = buildUpgradeRuntimeProfile(UPGRADE_TREE_DEFINITIONS, {
      workshop_modular_forges: 2,
    });

    expect(applyCraftingCostMultiplier(1000, profile)).toBeLessThan(1000);
    expect(computeResearchRefund(200)).toBe(Math.floor(200 * UPGRADE_CANCEL_REFUND_RATIO));
  });
});
