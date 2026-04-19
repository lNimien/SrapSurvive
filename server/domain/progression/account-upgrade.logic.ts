import 'server-only';

import { AccountUpgradeDefinition, AccountUpgradeEffect } from '@/config/upgrades.config';
import { DangerConfig } from '@/server/domain/run/run.calculator';

export interface AggregatedUpgradeEffects {
  readonly baseRateMultiplier: number;
  readonly quadraticFactorMultiplier: number;
  readonly catastropheThresholdBonus: number;
  readonly dangerLootBonusMultiplier: number;
}

export type UpgradePurchaseGuardReason = 'OK' | 'ALREADY_PURCHASED' | 'INSUFFICIENT_BALANCE';

export function evaluateUpgradePurchaseGuard(params: {
  readonly alreadyPurchased: boolean;
  readonly currentBalance: number;
  readonly costCC: number;
}): { readonly canPurchase: boolean; readonly reason: UpgradePurchaseGuardReason } {
  if (params.alreadyPurchased) {
    return { canPurchase: false, reason: 'ALREADY_PURCHASED' };
  }

  if (params.currentBalance < params.costCC) {
    return { canPurchase: false, reason: 'INSUFFICIENT_BALANCE' };
  }

  return { canPurchase: true, reason: 'OK' };
}

export function aggregateUpgradeEffects(definitions: readonly AccountUpgradeDefinition[]): AggregatedUpgradeEffects {
  return definitions.reduce<AggregatedUpgradeEffects>(
    (acc, definition) => {
      const effects: AccountUpgradeEffect = definition.effects;

      return {
        baseRateMultiplier: acc.baseRateMultiplier * (effects.baseRateMultiplier ?? 1),
        quadraticFactorMultiplier: acc.quadraticFactorMultiplier * (effects.quadraticFactorMultiplier ?? 1),
        catastropheThresholdBonus: acc.catastropheThresholdBonus + (effects.catastropheThresholdBonus ?? 0),
        dangerLootBonusMultiplier: acc.dangerLootBonusMultiplier * (effects.dangerLootBonusMultiplier ?? 1),
      };
    },
    {
      baseRateMultiplier: 1,
      quadraticFactorMultiplier: 1,
      catastropheThresholdBonus: 0,
      dangerLootBonusMultiplier: 1,
    }
  );
}

export function applyAggregatedEffectsToDangerConfig(
  baseConfig: DangerConfig,
  effects: AggregatedUpgradeEffects
): DangerConfig {
  const catastropheThreshold = Math.min(
    1.5,
    Math.max(0.1, baseConfig.catastropheThreshold + effects.catastropheThresholdBonus)
  );

  return {
    ...baseConfig,
    baseRate: Math.max(0, baseConfig.baseRate * effects.baseRateMultiplier),
    quadraticFactor: Math.max(0, baseConfig.quadraticFactor * effects.quadraticFactorMultiplier),
    catastropheThreshold,
    dangerLootBonus: Math.max(0, baseConfig.dangerLootBonus * effects.dangerLootBonusMultiplier),
  };
}
