import 'server-only';

import { UpgradeNodeDefinition, UpgradeEffectSet } from '@/config/upgrades-tree.config';
import { DangerConfig } from '@/server/domain/run/run.calculator';

export interface UpgradeRuntimeProfile {
  baseRateMultiplier: number;
  quadraticFactorMultiplier: number;
  catastropheThresholdBonus: number;
  dangerLootBonusMultiplier: number;
  extractionRewardMultiplier: number;
  extractionXpMultiplier: number;
  craftingCostMultiplier: number;
  workshopTierBoost: number;
  marketBuyPriceMultiplier: number;
  marketSellPriceMultiplier: number;
  blackMarketAccessTier: number;
}

export const UPGRADE_CANCEL_REFUND_RATIO = 0.7;

export function getNodeLevelDefinition(node: UpgradeNodeDefinition, level: number) {
  return node.levels.find((entry) => entry.level === level) ?? null;
}

export function buildUpgradeRuntimeProfile(
  nodes: readonly UpgradeNodeDefinition[],
  levelsByNodeId: Readonly<Record<string, number>>,
): UpgradeRuntimeProfile {
  const profile: UpgradeRuntimeProfile = {
    baseRateMultiplier: 1,
    quadraticFactorMultiplier: 1,
    catastropheThresholdBonus: 0,
    dangerLootBonusMultiplier: 1,
    extractionRewardMultiplier: 1,
    extractionXpMultiplier: 1,
    craftingCostMultiplier: 1,
    workshopTierBoost: 0,
    marketBuyPriceMultiplier: 1,
    marketSellPriceMultiplier: 1,
    blackMarketAccessTier: 0,
  };

  for (const node of nodes) {
    const level = levelsByNodeId[node.id] ?? 0;

    for (let currentLevel = 1; currentLevel <= level; currentLevel += 1) {
      const levelDef = getNodeLevelDefinition(node, currentLevel);
      if (!levelDef) {
        continue;
      }

      const effects: UpgradeEffectSet = levelDef.effects;
      profile.baseRateMultiplier *= effects.baseRateMultiplier ?? 1;
      profile.quadraticFactorMultiplier *= effects.quadraticFactorMultiplier ?? 1;
      profile.catastropheThresholdBonus += effects.catastropheThresholdBonus ?? 0;
      profile.dangerLootBonusMultiplier *= effects.dangerLootBonusMultiplier ?? 1;
      profile.extractionRewardMultiplier *= effects.extractionRewardMultiplier ?? 1;
      profile.extractionXpMultiplier *= effects.extractionXpMultiplier ?? 1;
      profile.craftingCostMultiplier *= effects.craftingCostMultiplier ?? 1;
      profile.workshopTierBoost = Math.max(profile.workshopTierBoost, effects.workshopTierBoost ?? 0);
      profile.marketBuyPriceMultiplier *= effects.marketBuyPriceMultiplier ?? 1;
      profile.marketSellPriceMultiplier *= effects.marketSellPriceMultiplier ?? 1;
      profile.blackMarketAccessTier = Math.max(profile.blackMarketAccessTier, effects.blackMarketAccessTier ?? 0);
    }
  }

  return profile;
}

export function applyUpgradeProfileToDangerConfig(baseConfig: DangerConfig, profile: UpgradeRuntimeProfile): DangerConfig {
  return {
    ...baseConfig,
    baseRate: Math.max(0.0005, baseConfig.baseRate * profile.baseRateMultiplier),
    quadraticFactor: Math.max(0.0000002, baseConfig.quadraticFactor * profile.quadraticFactorMultiplier),
    catastropheThreshold: Math.min(1.5, Math.max(0.7, baseConfig.catastropheThreshold + profile.catastropheThresholdBonus)),
    dangerLootBonus: Math.max(0.05, baseConfig.dangerLootBonus * profile.dangerLootBonusMultiplier),
    baseCreditsPerMinute: Math.max(1, baseConfig.baseCreditsPerMinute * profile.extractionRewardMultiplier),
    baseXpPerSecond: Math.max(0.01, baseConfig.baseXpPerSecond * profile.extractionXpMultiplier),
  };
}

export function applyCraftingCostMultiplier(costCC: number, profile: UpgradeRuntimeProfile): number {
  return Math.max(1, Math.round(costCC * profile.craftingCostMultiplier));
}

export function applyMarketBuyPriceMultiplier(priceCC: number, profile: UpgradeRuntimeProfile): number {
  return Math.max(1, Math.round(priceCC * profile.marketBuyPriceMultiplier));
}

export function applyMarketSellPriceMultiplier(priceCC: number, profile: UpgradeRuntimeProfile): number {
  return Math.max(1, Math.round(priceCC * profile.marketSellPriceMultiplier));
}

export function computeResearchProgressPercent(startedAt: Date, completesAt: Date, now = new Date()): number {
  const startMs = startedAt.getTime();
  const endMs = completesAt.getTime();
  const nowMs = now.getTime();

  if (endMs <= startMs) {
    return 100;
  }

  if (nowMs <= startMs) {
    return 0;
  }

  if (nowMs >= endMs) {
    return 100;
  }

  const progress = ((nowMs - startMs) / (endMs - startMs)) * 100;
  return Math.min(100, Math.max(0, progress));
}

export function computeResearchRefund(costCC: number): number {
  return Math.max(0, Math.floor(costCC * UPGRADE_CANCEL_REFUND_RATIO));
}

