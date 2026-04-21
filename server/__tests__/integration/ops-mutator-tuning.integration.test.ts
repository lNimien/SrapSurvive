import 'server-only';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/server/auth/admin', () => ({ isAdminUser: vi.fn() }));
vi.mock('@/server/services/mutation-guard.service', () => ({ getActiveMutationKillSwitches: vi.fn() }));
vi.mock('@/server/services/economy-observability.service', () => ({
  EconomyObservabilityService: { getEconomyTelemetry: vi.fn() },
}));

import { auth } from '@/server/auth/auth';
import { isAdminUser } from '@/server/auth/admin';
import { seedTestUser } from '@/server/__tests__/helpers/db-test-utils';
import {
  applyMutatorSuggestionAction,
  setMutatorTuningCapsAction,
} from '@/server/actions/ops.actions';
import { getActiveMutationKillSwitches } from '@/server/services/mutation-guard.service';
import { EconomyObservabilityService } from '@/server/services/economy-observability.service';
import { MutatorTuningService } from '@/server/services/mutator-tuning.service';

describe('ops mutator tuning actions (integration)', () => {
  beforeEach(async () => {
    await seedTestUser('admin-ops');
    vi.mocked(auth).mockResolvedValue({ user: { id: 'admin-ops' } } as never);
    vi.mocked(isAdminUser).mockReturnValue(true);
    vi.mocked(getActiveMutationKillSwitches).mockReturnValue([]);
    vi.mocked(EconomyObservabilityService.getEconomyTelemetry).mockResolvedValue({
      runMutatorActionPack: {
        generatedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
        policySummary: [],
        suggestions: [
          {
            mutatorId: 'dense_scrapyard',
            runMode: 'SAFE',
            status: 'critical',
            actionType: 'nerf_rewards',
            suggestedDeltaPercent: -8,
            rationale: 'integration test suggestion',
            sampleSize: 30,
            applicability: 'APPLICABLE',
            blockedReasons: [],
          },
        ],
      },
    } as never);
  });

  it('applies suggestion clamped by per-mutator policy caps', async () => {
    const capsResult = await setMutatorTuningCapsAction({
      mutatorId: 'dense_scrapyard',
      runMode: 'SAFE',
      maxAbsRewardDeltaPercent: 4,
      maxAbsDangerDeltaPercent: 3,
    });

    expect(capsResult.success).toBe(true);
    if (!capsResult.success) {
      throw new Error(capsResult.error.message);
    }

    const applyResult = await applyMutatorSuggestionAction({
      mutatorId: 'dense_scrapyard',
      runMode: 'SAFE',
      actionType: 'nerf_rewards',
      dryRun: false,
    });

    expect(applyResult.success).toBe(true);
    if (!applyResult.success) {
      throw new Error(applyResult.error.message);
    }

    const activeProfile = await MutatorTuningService.getActiveProfile('dense_scrapyard', 'SAFE');

    expect(activeProfile).toEqual({
      rewardDeltaPercent: -4,
      dangerPressureDeltaPercent: 0,
    });

    const history = await MutatorTuningService.listAdjustmentHistoryWithSource(
      new Date(Date.now() - 24 * 60 * 60 * 1_000),
    );

    expect(history.entries.length).toBeGreaterThanOrEqual(1);
    expect(history.entries[0]).toMatchObject({
      mutatorId: 'dense_scrapyard',
      runMode: 'SAFE',
      actionType: 'nerf_rewards',
      beforeProfile: {
        rewardDeltaPercent: 0,
        dangerPressureDeltaPercent: 0,
      },
      afterProfile: {
        rewardDeltaPercent: -4,
        dangerPressureDeltaPercent: 0,
      },
    });
  });
});
