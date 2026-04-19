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
    startRun: vi.fn(),
  },
}));

import { startRunAction } from '@/server/actions/run.actions';
import { auth } from '@/server/auth/auth';
import { RunResolutionService } from '@/server/services/run-resolution.service';
import { featureFlags } from '@/config/feature-flags.config';

describe('startRunAction validation/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    featureFlags.killSwitchExtractionMutations = false;
  });

  it('returns VALIDATION_ERROR for unregistered zone', async () => {
    const result = await startRunAction({ zoneId: 'unknown_zone' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation error ActionResult.');
    }
    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(vi.mocked(RunResolutionService.startRun)).not.toHaveBeenCalled();
  });

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const result = await startRunAction({ zoneId: 'shipyard_cemetery' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected unauthorized ActionResult error.');
    }
    expect(result.error.code).toBe('UNAUTHORIZED');
    expect(vi.mocked(RunResolutionService.startRun)).not.toHaveBeenCalled();
  });

  it('returns VALIDATION_ERROR for invalid runMode', async () => {
    const result = await startRunAction({ zoneId: 'shipyard_cemetery', runMode: 'NIGHTMARE' as 'SAFE' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation error ActionResult.');
    }
    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(vi.mocked(RunResolutionService.startRun)).not.toHaveBeenCalled();
  });

  it('returns FEATURE_DISABLED when extraction kill-switch is active', async () => {
    featureFlags.killSwitchExtractionMutations = true;
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-guarded' } } as never);

    const result = await startRunAction({ zoneId: 'shipyard_cemetery', runMode: 'SAFE' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected feature-disabled ActionResult.');
    }

    expect(result.error.code).toBe('FEATURE_DISABLED');
    expect(result.error.message).toBe('Sistema temporalmente en mantenimiento. Intenta más tarde.');
    expect(vi.mocked(RunResolutionService.startRun)).not.toHaveBeenCalled();
  });

  it('calls service normally when extraction kill-switch is inactive', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-ready' } } as never);
    vi.mocked(RunResolutionService.startRun).mockResolvedValue({
      runId: 'run-123',
      zoneId: 'shipyard_cemetery',
      runMode: 'SAFE',
      startedAt: new Date().toISOString(),
    });

    const result = await startRunAction({ zoneId: 'shipyard_cemetery', runMode: 'SAFE' });

    expect(result.success).toBe(true);
    expect(vi.mocked(RunResolutionService.startRun)).toHaveBeenCalledTimes(1);
  });
});
