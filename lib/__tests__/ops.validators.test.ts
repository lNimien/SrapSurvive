import { describe, expect, it } from 'vitest';

import {
  ApplyMutatorSuggestionInputSchema,
  RollbackMutatorSuggestionInputSchema,
  SetMutatorTuningCapsInputSchema,
} from '@/lib/validators/ops.validators';

describe('ApplyMutatorSuggestionInputSchema', () => {
  it('accepts valid dry-run payload', () => {
    const parsed = ApplyMutatorSuggestionInputSchema.safeParse({
      mutatorId: 'dense_scrapyard',
      runMode: 'SAFE',
      actionType: 'nerf_rewards',
      dryRun: true,
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects invalid run mode', () => {
    const parsed = ApplyMutatorSuggestionInputSchema.safeParse({
      mutatorId: 'dense_scrapyard',
      runMode: 'NIGHTMARE',
      actionType: 'nerf_rewards',
      dryRun: false,
    });

    expect(parsed.success).toBe(false);
  });

  it('accepts rollback payload', () => {
    const parsed = RollbackMutatorSuggestionInputSchema.safeParse({
      mutatorId: 'dense_scrapyard',
      runMode: 'HARD',
    });

    expect(parsed.success).toBe(true);
  });

  it('accepts set caps payload within bounds', () => {
    const parsed = SetMutatorTuningCapsInputSchema.safeParse({
      mutatorId: 'dense_scrapyard',
      runMode: 'SAFE',
      maxAbsRewardDeltaPercent: 12,
      maxAbsDangerDeltaPercent: 15,
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects set caps payload out of bounds', () => {
    const parsed = SetMutatorTuningCapsInputSchema.safeParse({
      mutatorId: 'dense_scrapyard',
      runMode: 'SAFE',
      maxAbsRewardDeltaPercent: 0,
      maxAbsDangerDeltaPercent: 88,
    });

    expect(parsed.success).toBe(false);
  });
});
