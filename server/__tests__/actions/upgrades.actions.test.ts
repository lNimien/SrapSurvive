import 'server-only';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/server/services/account-upgrade.service', () => ({
  AccountUpgradeService: {
    purchaseUpgrade: vi.fn(),
  },
}));

import { auth } from '@/server/auth/auth';
import { AccountUpgradeService } from '@/server/services/account-upgrade.service';
import { featureFlags } from '@/config/feature-flags.config';
import { purchaseUpgradeAction } from '@/server/actions/upgrades.actions';

describe('purchaseUpgradeAction validation/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    featureFlags.killSwitchUpgradeAchievementClaims = false;
  });

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const result = await purchaseUpgradeAction({ upgradeId: 'upgrade_hull_stabilizers_v1' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected unauthorized ActionResult.');
    }

    expect(result.error.code).toBe('UNAUTHORIZED');
    expect(vi.mocked(AccountUpgradeService.purchaseUpgrade)).not.toHaveBeenCalled();
  });

  it('returns VALIDATION_ERROR for empty upgradeId', async () => {
    const result = await purchaseUpgradeAction({ upgradeId: '' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation ActionResult.');
    }

    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(vi.mocked(AccountUpgradeService.purchaseUpgrade)).not.toHaveBeenCalled();
  });

  it('returns FEATURE_DISABLED when upgrade/achievement kill-switch is active', async () => {
    featureFlags.killSwitchUpgradeAchievementClaims = true;
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-upgrade-guarded' } } as never);

    const result = await purchaseUpgradeAction({ upgradeId: 'upgrade_hull_stabilizers_v1' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected feature-disabled ActionResult.');
    }

    expect(result.error.code).toBe('FEATURE_DISABLED');
    expect(vi.mocked(AccountUpgradeService.purchaseUpgrade)).not.toHaveBeenCalled();
  });

  it('keeps normal flow when kill-switch is inactive', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-upgrade-ok' } } as never);
    vi.mocked(AccountUpgradeService.purchaseUpgrade).mockResolvedValue({
      upgradeId: 'upgrade_hull_stabilizers_v1',
      newBalance: 100,
    });

    const result = await purchaseUpgradeAction({ upgradeId: 'upgrade_hull_stabilizers_v1' });

    expect(result.success).toBe(true);
    expect(vi.mocked(AccountUpgradeService.purchaseUpgrade)).toHaveBeenCalledTimes(1);
  });
});
