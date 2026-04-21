import { describe, expect, it } from 'vitest';

import {
  buildTacticalComparisonRows,
  getTacticalSlotVisualMeta,
  resolveTacticalSlotVisualState,
  summarizeTacticalComparison,
} from '@/lib/utils/loadout-visuals';

describe('loadout visuals helpers', () => {
  it('resolves blocked slot state when run is active', () => {
    const state = resolveTacticalSlotVisualState({
      isRunActive: true,
      hasEquippedItem: true,
      candidateCount: 3,
    });

    expect(state).toBe('blocked');
    expect(getTacticalSlotVisualMeta(state).label).toBe('Bloqueado');
  });

  it('resolves occupied, incompatible and empty states in priority order', () => {
    expect(
      resolveTacticalSlotVisualState({
        isRunActive: false,
        hasEquippedItem: true,
        candidateCount: 0,
      }),
    ).toBe('occupied');

    expect(
      resolveTacticalSlotVisualState({
        isRunActive: false,
        hasEquippedItem: false,
        candidateCount: 0,
      }),
    ).toBe('incompatible');

    expect(
      resolveTacticalSlotVisualState({
        isRunActive: false,
        hasEquippedItem: false,
        candidateCount: 2,
      }),
    ).toBe('empty');
  });

  it('builds tactical comparison rows with signed deltas and sorted impact', () => {
    const rows = buildTacticalComparisonRows(
      {
        lootMultiplier: 0.2,
        dangerResistance: 0.1,
      },
      {
        lootMultiplier: 0.05,
        dangerResistance: 0.2,
      },
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      metricKey: 'lootMultiplier',
      deltaLabel: '+15%',
      tone: 'positive',
    });
    expect(rows[1]).toMatchObject({
      metricKey: 'dangerResistance',
      deltaLabel: '-10%',
      tone: 'negative',
    });
  });

  it('returns parity summary when gains and losses are balanced', () => {
    const rows = buildTacticalComparisonRows(
      {
        lootMultiplier: 0.1,
        xpMultiplier: 0.05,
      },
      {
        lootMultiplier: 0.2,
        xpMultiplier: -0.05,
      },
    );

    expect(summarizeTacticalComparison(rows)).toBe('parity');
  });

  it('ignores empty metric sets', () => {
    expect(buildTacticalComparisonRows(undefined, undefined)).toEqual([]);
  });
});
