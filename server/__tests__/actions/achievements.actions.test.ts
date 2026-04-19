import 'server-only';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/server/services/achievement.service', () => ({
  AchievementService: {
    claimAchievement: vi.fn(),
  },
}));

import { auth } from '@/server/auth/auth';
import { AchievementService } from '@/server/services/achievement.service';
import { featureFlags } from '@/config/feature-flags.config';
import { claimAchievementAction } from '@/server/actions/achievements.actions';

describe('claimAchievementAction validation/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    featureFlags.killSwitchUpgradeAchievementClaims = false;
  });

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const result = await claimAchievementAction({ achievementId: 'achievement_first_extraction' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected unauthorized ActionResult.');
    }

    expect(result.error.code).toBe('UNAUTHORIZED');
    expect(vi.mocked(AchievementService.claimAchievement)).not.toHaveBeenCalled();
  });

  it('returns VALIDATION_ERROR for empty achievementId', async () => {
    const result = await claimAchievementAction({ achievementId: '' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation ActionResult.');
    }

    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(vi.mocked(AchievementService.claimAchievement)).not.toHaveBeenCalled();
  });

  it('returns FEATURE_DISABLED when upgrade/achievement kill-switch is active', async () => {
    featureFlags.killSwitchUpgradeAchievementClaims = true;
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-achievement-guarded' } } as never);

    const result = await claimAchievementAction({ achievementId: 'achievement_first_extraction' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected feature-disabled ActionResult.');
    }

    expect(result.error.code).toBe('FEATURE_DISABLED');
    expect(vi.mocked(AchievementService.claimAchievement)).not.toHaveBeenCalled();
  });

  it('keeps normal flow when kill-switch is inactive', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-achievement-ok' } } as never);
    vi.mocked(AchievementService.claimAchievement).mockResolvedValue({
      achievementId: 'achievement_first_extraction',
      rewardCC: 50,
      rewardXP: 25,
      newBalance: 150,
      newLevel: 2,
      currentXp: 10,
    });

    const result = await claimAchievementAction({ achievementId: 'achievement_first_extraction' });

    expect(result.success).toBe(true);
    expect(vi.mocked(AchievementService.claimAchievement)).toHaveBeenCalledTimes(1);
  });
});
