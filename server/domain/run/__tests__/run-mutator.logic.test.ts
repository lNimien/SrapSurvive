import { describe, expect, it } from 'vitest';

import { applyRunMutator, resolveRunMutator } from '@/server/domain/run/run-mutator.logic';
import { SHIPYARD_CEMETERY_CONFIG } from '@/config/game.config';
import { RunMode } from '@/types/game.types';

describe('run-mutator.logic', () => {
  it('resolves mutator deterministically for same seed', () => {
    const first = resolveRunMutator('shipyard_cemetery', RunMode.SAFE, 'seed-1');
    const second = resolveRunMutator('shipyard_cemetery', RunMode.SAFE, 'seed-1');

    expect(first).toEqual(second);
  });

  it('applies mutator without breaking config invariants', () => {
    const mutator = resolveRunMutator('shipyard_cemetery', RunMode.HARD, 'seed-2');
    const tuned = applyRunMutator(SHIPYARD_CEMETERY_CONFIG, mutator);

    expect(tuned.baseRate).toBeGreaterThan(0);
    expect(tuned.quadraticFactor).toBeGreaterThan(0);
    expect(tuned.baseCreditsPerMinute).toBeGreaterThan(0);
    expect(tuned.baseXpPerSecond).toBeGreaterThan(0);
    expect(tuned.catastropheThreshold).toBeGreaterThanOrEqual(0.75);
    expect(tuned.catastropheThreshold).toBeLessThanOrEqual(0.995);
    expect(tuned.dangerLootBonus).toBeGreaterThanOrEqual(0.1);
    expect(tuned.dangerLootBonus).toBeLessThanOrEqual(2.5);
  });

  it('applies persisted profile overrides with capped deltas', () => {
    const mutator = resolveRunMutator('shipyard_cemetery', RunMode.SAFE, 'seed-3');

    const tuned = applyRunMutator(SHIPYARD_CEMETERY_CONFIG, mutator, {
      rewardDeltaPercent: -50,
      dangerPressureDeltaPercent: 25,
    });

    expect(tuned.baseCreditsPerMinute).toBeGreaterThan(0);
    expect(tuned.baseXpPerSecond).toBeGreaterThan(0);
    expect(tuned.baseRate).toBeGreaterThan(0);
    expect(tuned.quadraticFactor).toBeGreaterThan(0);
    expect(tuned.catastropheThreshold).toBeGreaterThanOrEqual(0.75);
    expect(tuned.catastropheThreshold).toBeLessThanOrEqual(0.995);
  });
});
