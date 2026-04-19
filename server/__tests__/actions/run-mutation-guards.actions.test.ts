import 'server-only';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/server/services/run-resolution.service', () => ({
  RunResolutionService: {
    resolveExtraction: vi.fn(),
    resolveAnomaly: vi.fn(),
  },
}));

import { auth } from '@/server/auth/auth';
import { featureFlags } from '@/config/feature-flags.config';
import { requestExtractionAction, resolveAnomalyAction } from '@/server/actions/run.actions';
import { RunResolutionService } from '@/server/services/run-resolution.service';

describe('run mutation kill-switch guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    featureFlags.killSwitchExtractionMutations = false;
  });

  it('blocks requestExtractionAction when extraction kill-switch is active', async () => {
    featureFlags.killSwitchExtractionMutations = true;
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-run' } } as never);

    const result = await requestExtractionAction({ runId: 'run-guarded' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected feature-disabled ActionResult.');
    }

    expect(result.error.code).toBe('FEATURE_DISABLED');
    expect(vi.mocked(RunResolutionService.resolveExtraction)).not.toHaveBeenCalled();
  });

  it('allows requestExtractionAction when extraction kill-switch is inactive', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-run' } } as never);
    vi.mocked(RunResolutionService.resolveExtraction).mockResolvedValue({
      runId: 'run-ok',
      status: 'extracted',
      durationSeconds: 120,
      dangerLevelAtClose: 0.32,
      catastropheOccurred: false,
      loot: [],
      currencyEarned: 100,
      xpEarned: 40,
    });

    const result = await requestExtractionAction({ runId: 'run-ok' });

    expect(result.success).toBe(true);
    expect(vi.mocked(RunResolutionService.resolveExtraction)).toHaveBeenCalledTimes(1);
  });

  it('blocks resolveAnomalyAction when extraction kill-switch is active', async () => {
    featureFlags.killSwitchExtractionMutations = true;
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-run' } } as never);

    const result = await resolveAnomalyAction({
      runId: 'run-anomaly',
      anomalyId: 'anomaly-1',
      decision: 'INVESTIGATE',
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected feature-disabled ActionResult.');
    }

    expect(result.error.code).toBe('FEATURE_DISABLED');
    expect(vi.mocked(RunResolutionService.resolveAnomaly)).not.toHaveBeenCalled();
  });

  it('allows resolveAnomalyAction when extraction kill-switch is inactive', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-run' } } as never);
    vi.mocked(RunResolutionService.resolveAnomaly).mockResolvedValue({
      message: 'ok',
    });

    const result = await resolveAnomalyAction({
      runId: 'run-anomaly',
      anomalyId: 'anomaly-1',
      decision: 'IGNORE',
    });

    expect(result.success).toBe(true);
    expect(vi.mocked(RunResolutionService.resolveAnomaly)).toHaveBeenCalledTimes(1);
  });
});
