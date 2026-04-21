import { describe, expect, it } from 'vitest';

import { estimateMarginalLootWindows } from '@/lib/utils/extraction-estimation';
import { RunStateDTO } from '@/types/dto.types';

function createRunState(overrides: Partial<RunStateDTO>): RunStateDTO {
  return {
    status: 'running',
    runId: 'run-1',
    elapsedSeconds: 100,
    dangerLevel: 0.7,
    catastropheThreshold: 0.9,
    pendingLoot: [{ itemId: 'iron', displayName: 'Hierro', iconKey: 'iron', quantity: 10, rarity: 'COMMON' }],
    ...overrides,
  };
}

describe('estimateMarginalLootWindows', () => {
  it('estima ganancia marginal positiva para +10s y +30s', () => {
    const previous = createRunState({ elapsedSeconds: 90, pendingLoot: [{ itemId: 'iron', displayName: 'Hierro', iconKey: 'iron', quantity: 8, rarity: 'COMMON' }], dangerLevel: 0.62 });
    const current = createRunState({ elapsedSeconds: 100, pendingLoot: [{ itemId: 'iron', displayName: 'Hierro', iconKey: 'iron', quantity: 10, rarity: 'COMMON' }], dangerLevel: 0.7 });

    const result = estimateMarginalLootWindows({
      current,
      previous,
      catastropheThreshold: 0.9,
    });

    expect(result.plus10.hasEnoughData).toBe(true);
    expect(result.plus10.estimatedLootUnits).toBe(2);
    expect(result.plus30.estimatedLootUnits).toBe(6);
    expect(result.plus30.projectedRisk).toBe('crosses-threshold');
  });

  it('no devuelve ganancias negativas y marca falta de datos cuando no hay snapshot comparable', () => {
    const current = createRunState({
      elapsedSeconds: 100,
      pendingLoot: [{ itemId: 'iron', displayName: 'Hierro', iconKey: 'iron', quantity: 7, rarity: 'COMMON' }],
      dangerLevel: 0.8,
    });

    const previous = createRunState({
      elapsedSeconds: 100,
      pendingLoot: [{ itemId: 'iron', displayName: 'Hierro', iconKey: 'iron', quantity: 9, rarity: 'COMMON' }],
      dangerLevel: 0.78,
    });

    const result = estimateMarginalLootWindows({
      current,
      previous,
      catastropheThreshold: 0.92,
    });

    expect(result.plus10.hasEnoughData).toBe(false);
    expect(result.plus10.estimatedLootUnits).toBe(0);
    expect(result.plus30.estimatedLootUnits).toBe(0);
    expect(result.plus10.projectedRisk).toBe('safe');
  });
});
