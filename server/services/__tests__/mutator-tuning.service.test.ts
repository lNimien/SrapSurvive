import 'server-only';

import { describe, expect, it } from 'vitest';

import { resolveMutatorTuningReadSource, sanitizeMutatorAdjustmentProfile } from '@/server/services/mutator-tuning.service';

describe('mutator-tuning.service sanitize', () => {
  it('caps deltas to +/-10%', () => {
    const sanitized = sanitizeMutatorAdjustmentProfile({
      rewardDeltaPercent: -40,
      dangerPressureDeltaPercent: 27,
    });

    expect(sanitized).toEqual({
      rewardDeltaPercent: -10,
      dangerPressureDeltaPercent: 10,
    });
  });

  it('resolves storage source from flag + accessor availability', () => {
    expect(resolveMutatorTuningReadSource(true, true)).toBe('table_primary');
    expect(resolveMutatorTuningReadSource(true, false)).toBe('audit_fallback');
    expect(resolveMutatorTuningReadSource(false, true)).toBe('audit_fallback');
  });
});
