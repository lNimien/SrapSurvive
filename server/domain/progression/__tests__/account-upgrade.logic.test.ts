import 'server-only';

import { describe, expect, it } from 'vitest';

import { SHIPYARD_CEMETERY_CONFIG } from '@/config/game.config';
import { UPGRADE_DEFINITION_BY_ID, UPGRADE_DEFINITIONS } from '@/config/upgrades.config';
import {
  aggregateUpgradeEffects,
  applyAggregatedEffectsToDangerConfig,
  evaluateUpgradePurchaseGuard,
} from '@/server/domain/progression/account-upgrade.logic';

describe('account-upgrade.logic', () => {
  it('evaluates duplicate purchase guard before balance checks', () => {
    const guard = evaluateUpgradePurchaseGuard({
      alreadyPurchased: true,
      currentBalance: 10_000,
      costCC: 10,
    });

    expect(guard).toEqual({ canPurchase: false, reason: 'ALREADY_PURCHASED' });
  });

  it('evaluates affordability and allows purchase when balance is enough', () => {
    const affordable = evaluateUpgradePurchaseGuard({
      alreadyPurchased: false,
      currentBalance: 300,
      costCC: 180,
    });

    const insufficient = evaluateUpgradePurchaseGuard({
      alreadyPurchased: false,
      currentBalance: 50,
      costCC: 180,
    });

    expect(affordable).toEqual({ canPurchase: true, reason: 'OK' });
    expect(insufficient).toEqual({ canPurchase: false, reason: 'INSUFFICIENT_BALANCE' });
  });

  it('aggregates and applies effects deterministically regardless of order', () => {
    const upgradeA = UPGRADE_DEFINITION_BY_ID.upgrade_hull_stabilizers_v1;
    const upgradeB = UPGRADE_DEFINITION_BY_ID.upgrade_escape_protocol_v1;
    const upgradeC = UPGRADE_DEFINITION_BY_ID.upgrade_salvage_optimizer_v1;

    const effectsForward = aggregateUpgradeEffects([upgradeA, upgradeB, upgradeC]);
    const effectsReverse = aggregateUpgradeEffects([upgradeC, upgradeB, upgradeA]);

    expect(effectsForward).toEqual(effectsReverse);

    const tuned = applyAggregatedEffectsToDangerConfig(SHIPYARD_CEMETERY_CONFIG, effectsForward);

    expect(tuned.baseRate).toBeCloseTo(0.0368, 6);
    expect(tuned.quadraticFactor).toBeCloseTo(0.0000038, 10);
    expect(tuned.catastropheThreshold).toBeCloseTo(0.93, 6);
    expect(tuned.dangerLootBonus).toBeCloseTo(0.896, 6);
  });

  it('keeps new upgrade definitions deterministic and within configured caps', () => {
    const effects = aggregateUpgradeEffects(UPGRADE_DEFINITIONS);
    const tuned = applyAggregatedEffectsToDangerConfig(SHIPYARD_CEMETERY_CONFIG, effects);

    expect(UPGRADE_DEFINITIONS.length).toBeGreaterThanOrEqual(7);
    expect(tuned.baseRate).toBeGreaterThan(0);
    expect(tuned.quadraticFactor).toBeGreaterThan(0);
    expect(tuned.catastropheThreshold).toBeLessThanOrEqual(1.5);
    expect(tuned.catastropheThreshold).toBeGreaterThanOrEqual(0.1);
    expect(tuned.dangerLootBonus).toBeGreaterThan(0);
  });

  it('validates expected effects for newly added upgrades', () => {
    const v2Stabilizers = UPGRADE_DEFINITION_BY_ID.upgrade_hull_stabilizers_v2;
    const v2Escape = UPGRADE_DEFINITION_BY_ID.upgrade_escape_protocol_v2;
    const adaptivePlating = UPGRADE_DEFINITION_BY_ID.upgrade_adaptive_plating_v1;

    expect(v2Stabilizers.effects.baseRateMultiplier).toBeCloseTo(0.9, 6);
    expect(v2Stabilizers.effects.quadraticFactorMultiplier).toBeCloseTo(0.93, 6);
    expect(v2Escape.effects.catastropheThresholdBonus).toBeCloseTo(0.04, 6);
    expect(adaptivePlating.effects.catastropheThresholdBonus).toBeCloseTo(0.03, 6);

    const entropyShielding = UPGRADE_DEFINITION_BY_ID.upgrade_entropy_shielding_v1;
    const tacticalTelemetry = UPGRADE_DEFINITION_BY_ID.upgrade_tactical_telemetry_v1;
    const vectorThrusters = UPGRADE_DEFINITION_BY_ID.upgrade_vector_thrusters_v1;

    expect(entropyShielding.effects.quadraticFactorMultiplier).toBeCloseTo(0.9, 6);
    expect(entropyShielding.effects.catastropheThresholdBonus).toBeCloseTo(0.035, 6);
    expect(tacticalTelemetry.effects.dangerLootBonusMultiplier).toBeCloseTo(1.18, 6);
    expect(vectorThrusters.effects.baseRateMultiplier).toBeCloseTo(0.94, 6);
    expect(vectorThrusters.effects.catastropheThresholdBonus).toBeCloseTo(0.02, 6);
  });
});
