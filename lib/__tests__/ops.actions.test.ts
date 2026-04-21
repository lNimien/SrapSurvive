import 'server-only';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/server/auth/admin', () => ({ isAdminUser: vi.fn() }));
vi.mock('@/server/services/mutation-guard.service', () => ({ getActiveMutationKillSwitches: vi.fn() }));
vi.mock('@/server/services/economy-observability.service', () => ({
  EconomyObservabilityService: { getEconomyTelemetry: vi.fn() },
}));
vi.mock('@/server/services/mutator-tuning.service', () => ({
  MutatorTuningService: { getActiveProfile: vi.fn(), applyAdjustment: vi.fn(), upsertPolicyCaps: vi.fn() },
  NEUTRAL_MUTATOR_PROFILE: { rewardDeltaPercent: 0, dangerPressureDeltaPercent: 0 },
  sanitizeMutatorAdjustmentProfile: (profile: { rewardDeltaPercent: number; dangerPressureDeltaPercent: number }) => profile,
}));
vi.mock('@/server/db/client', () => ({
  db: { auditLog: { create: vi.fn() } },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { auth } from '@/server/auth/auth';
import { isAdminUser } from '@/server/auth/admin';
import { getActiveMutationKillSwitches } from '@/server/services/mutation-guard.service';
import { EconomyObservabilityService } from '@/server/services/economy-observability.service';
import { MutatorTuningService } from '@/server/services/mutator-tuning.service';
import { db } from '@/server/db/client';
import {
  applyMutatorSuggestionAction,
  rollbackMutatorSuggestionAction,
  setMutatorTuningCapsAction,
} from '@/server/actions/ops.actions';

const BASE_SUGGESTION = {
  mutatorId: 'dense_scrapyard',
  runMode: 'SAFE' as const,
  status: 'critical' as const,
  actionType: 'nerf_rewards' as const,
  suggestedDeltaPercent: -8,
  rationale: 'test',
  sampleSize: 20,
  applicability: 'APPLICABLE' as const,
  blockedReasons: [] as string[],
};

describe('applyMutatorSuggestionAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActiveMutationKillSwitches).mockReturnValue([]);
    vi.mocked(EconomyObservabilityService.getEconomyTelemetry).mockResolvedValue({
      runMutatorActionPack: {
        generatedAt: '2026-04-22T00:00:00.000Z',
        suggestions: [BASE_SUGGESTION],
        policySummary: [],
      },
    } as never);
    vi.mocked(MutatorTuningService.getActiveProfile).mockResolvedValue({
      rewardDeltaPercent: 0,
      dangerPressureDeltaPercent: 0,
    });
  });

  it('returns UNAUTHORIZED when no session', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const result = await applyMutatorSuggestionAction({
      mutatorId: 'dense_scrapyard',
      runMode: 'SAFE',
      actionType: 'nerf_rewards',
      dryRun: true,
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected error');
    expect(result.error.code).toBe('UNAUTHORIZED');
  });

  it('returns FEATURE_DISABLED when suggestion is blocked by safety gate', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'admin-1' } } as never);
    vi.mocked(isAdminUser).mockReturnValue(true);
    vi.mocked(EconomyObservabilityService.getEconomyTelemetry).mockResolvedValue({
      runMutatorActionPack: {
        generatedAt: '2026-04-22T00:00:00.000Z',
        suggestions: [{ ...BASE_SUGGESTION, applicability: 'BLOCKED', blockedReasons: ['incident active'] }],
        policySummary: [],
      },
    } as never);

    const result = await applyMutatorSuggestionAction({
      mutatorId: 'dense_scrapyard',
      runMode: 'SAFE',
      actionType: 'nerf_rewards',
      dryRun: false,
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected error');
    expect(result.error.code).toBe('FEATURE_DISABLED');
  });

  it('returns dry-run preview without writing audit log', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'admin-1' } } as never);
    vi.mocked(isAdminUser).mockReturnValue(true);

    const result = await applyMutatorSuggestionAction({
      mutatorId: 'dense_scrapyard',
      runMode: 'SAFE',
      actionType: 'nerf_rewards',
      dryRun: true,
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected success');
    expect(result.data.applied).toBe(false);
    expect(vi.mocked(db.auditLog.create)).not.toHaveBeenCalled();
  });

  it('applies suggestion and writes audit log when applicable', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'admin-1' } } as never);
    vi.mocked(isAdminUser).mockReturnValue(true);

    const result = await applyMutatorSuggestionAction({
      mutatorId: 'dense_scrapyard',
      runMode: 'SAFE',
      actionType: 'nerf_rewards',
      dryRun: false,
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected success');
    expect(result.data.applied).toBe(true);
    expect(vi.mocked(MutatorTuningService.applyAdjustment)).toHaveBeenCalledTimes(1);
  });

  it('rolls back mutator profile to neutral for admin', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'admin-1' } } as never);
    vi.mocked(isAdminUser).mockReturnValue(true);
    vi.mocked(MutatorTuningService.getActiveProfile).mockResolvedValue({
      rewardDeltaPercent: -5,
      dangerPressureDeltaPercent: 4,
    });

    const result = await rollbackMutatorSuggestionAction({
      mutatorId: 'dense_scrapyard',
      runMode: 'SAFE',
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected success');
    expect(result.data.afterProfile).toEqual({ rewardDeltaPercent: 0, dangerPressureDeltaPercent: 0 });
    expect(vi.mocked(MutatorTuningService.applyAdjustment)).toHaveBeenCalledTimes(1);
  });

  it('sets mutator tuning caps for admin', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'admin-1' } } as never);
    vi.mocked(isAdminUser).mockReturnValue(true);
    vi.mocked(MutatorTuningService.upsertPolicyCaps).mockResolvedValue({
      maxAbsRewardDeltaPercent: 14,
      maxAbsDangerDeltaPercent: 11,
    } as never);

    const result = await setMutatorTuningCapsAction({
      mutatorId: 'dense_scrapyard',
      runMode: 'SAFE',
      maxAbsRewardDeltaPercent: 14,
      maxAbsDangerDeltaPercent: 11,
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected success');
    expect(result.data.maxAbsRewardDeltaPercent).toBe(14);
    expect(vi.mocked(MutatorTuningService.upsertPolicyCaps)).toHaveBeenCalledTimes(1);
  });

  it('rejects set caps for non-admin user', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'player-1' } } as never);
    vi.mocked(isAdminUser).mockReturnValue(false);

    const result = await setMutatorTuningCapsAction({
      mutatorId: 'dense_scrapyard',
      runMode: 'SAFE',
      maxAbsRewardDeltaPercent: 14,
      maxAbsDangerDeltaPercent: 11,
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected error');
    expect(result.error.code).toBe('UNAUTHORIZED');
  });
});
