import 'server-only';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/server/services/weekly-goals.service', () => ({
  WeeklyGoalsService: {
    claimWeeklyDirective: vi.fn(),
    trackClaimAttempt: vi.fn(),
  },
  WEEKLY_CLAIM_NOT_CLAIMABLE_MESSAGE: 'La directiva semanal todavía no es reclamable.',
}));

import { auth } from '@/server/auth/auth';
import { featureFlags } from '@/config/feature-flags.config';
import { claimWeeklyDirectiveAction } from '@/server/actions/liveops.actions';
import { WeeklyGoalsService } from '@/server/services/weekly-goals.service';

describe('claimWeeklyDirectiveAction validation/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    featureFlags.killSwitchUpgradeAchievementClaims = false;
  });

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const result = await claimWeeklyDirectiveAction({
      directiveKey: 'directive-materials-1500',
      weekStart: '2026-04-13T00:00:00.000Z',
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected unauthorized ActionResult.');
    }

    expect(result.error.code).toBe('UNAUTHORIZED');
    expect(vi.mocked(WeeklyGoalsService.claimWeeklyDirective)).not.toHaveBeenCalled();
  });

  it('returns VALIDATION_ERROR for invalid weekStart payload', async () => {
    const result = await claimWeeklyDirectiveAction({
      directiveKey: 'directive-materials-1500',
      weekStart: 'not-a-date',
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation ActionResult.');
    }

    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(vi.mocked(WeeklyGoalsService.claimWeeklyDirective)).not.toHaveBeenCalled();
  });

  it('returns FEATURE_DISABLED when claims kill-switch is active', async () => {
    featureFlags.killSwitchUpgradeAchievementClaims = true;
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-weekly-guarded' } } as never);

    const result = await claimWeeklyDirectiveAction({
      directiveKey: 'directive-materials-1500',
      weekStart: '2026-04-13T00:00:00.000Z',
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected feature-disabled ActionResult.');
    }

    expect(result.error.code).toBe('FEATURE_DISABLED');
    expect(vi.mocked(WeeklyGoalsService.claimWeeklyDirective)).not.toHaveBeenCalled();
  });
});
