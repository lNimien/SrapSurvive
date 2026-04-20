import 'server-only';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/server/services/upgrade-tree.service', () => ({
  UpgradeTreeService: {
    startResearch: vi.fn(),
    cancelActiveResearch: vi.fn(),
  },
}));

import { auth } from '@/server/auth/auth';
import { UpgradeTreeService } from '@/server/services/upgrade-tree.service';
import { featureFlags } from '@/config/feature-flags.config';
import {
  cancelUpgradeResearchAction,
  purchaseUpgradeAction,
  startUpgradeResearchAction,
} from '@/server/actions/upgrades.actions';

describe('upgrade research actions validation/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    featureFlags.killSwitchUpgradeAchievementClaims = false;
  });

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const result = await startUpgradeResearchAction({ nodeId: 'bridge_hull_stabilizers' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected unauthorized ActionResult.');
    }

    expect(result.error.code).toBe('UNAUTHORIZED');
    expect(vi.mocked(UpgradeTreeService.startResearch)).not.toHaveBeenCalled();
  });

  it('returns VALIDATION_ERROR for empty nodeId', async () => {
    const result = await startUpgradeResearchAction({ nodeId: '' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation ActionResult.');
    }

    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(vi.mocked(UpgradeTreeService.startResearch)).not.toHaveBeenCalled();
  });

  it('returns FEATURE_DISABLED when upgrade/achievement kill-switch is active', async () => {
    featureFlags.killSwitchUpgradeAchievementClaims = true;
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-upgrade-guarded' } } as never);

    const result = await startUpgradeResearchAction({ nodeId: 'bridge_hull_stabilizers' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected feature-disabled ActionResult.');
    }

    expect(result.error.code).toBe('FEATURE_DISABLED');
    expect(vi.mocked(UpgradeTreeService.startResearch)).not.toHaveBeenCalled();
  });

  it('keeps normal start flow when kill-switch is inactive', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-upgrade-ok' } } as never);
    vi.mocked(UpgradeTreeService.startResearch).mockResolvedValue({
      queueId: 'queue-1',
      nodeId: 'bridge_hull_stabilizers',
      targetLevel: 1,
      completesAt: new Date(Date.now() + 60_000).toISOString(),
      newBalance: 100,
    });

    const result = await startUpgradeResearchAction({ nodeId: 'bridge_hull_stabilizers' });

    expect(result.success).toBe(true);
    expect(vi.mocked(UpgradeTreeService.startResearch)).toHaveBeenCalledTimes(1);
  });

  it('supports legacy purchaseUpgradeAction payload as compatibility wrapper', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'legacy-user' } } as never);
    vi.mocked(UpgradeTreeService.startResearch).mockResolvedValue({
      queueId: 'queue-legacy',
      nodeId: 'bridge_hull_stabilizers',
      targetLevel: 1,
      completesAt: new Date(Date.now() + 60_000).toISOString(),
      newBalance: 90,
    });

    const result = await purchaseUpgradeAction({ upgradeId: 'bridge_hull_stabilizers' });

    expect(result.success).toBe(true);
    expect(vi.mocked(UpgradeTreeService.startResearch)).toHaveBeenCalledWith('legacy-user', 'bridge_hull_stabilizers');
  });

  it('cancels active research and returns success payload', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-cancel' } } as never);
    vi.mocked(UpgradeTreeService.cancelActiveResearch).mockResolvedValue({
      queueId: 'queue-cancel',
      nodeId: 'bridge_hull_stabilizers',
      refundedCC: 84,
      newBalance: 214,
    });

    const result = await cancelUpgradeResearchAction();

    expect(result.success).toBe(true);
    expect(vi.mocked(UpgradeTreeService.cancelActiveResearch)).toHaveBeenCalledWith('user-cancel');
  });
});

