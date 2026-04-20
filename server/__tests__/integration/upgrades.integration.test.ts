import 'server-only';

import { describe, expect, it } from 'vitest';

import { db } from '@/server/db/client';
import { seedTestUser } from '@/server/__tests__/helpers/db-test-utils';
import { UpgradeTreeService } from '@/server/services/upgrade-tree.service';

async function grantCredits(userId: string, amount: number): Promise<void> {
  const latest = await db.currencyLedger.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { balanceAfter: true },
  });

  const previousBalance = latest?.balanceAfter ?? 0;
  await db.currencyLedger.create({
    data: {
      userId,
      amount,
      balanceAfter: previousBalance + amount,
      entryType: 'ADMIN_ADJUSTMENT',
      referenceId: `test-credit:${userId}`,
    },
  });
}

describe('UpgradeTreeService integration', () => {
  it('starts timed research and appends purchase ledger entry', async () => {
    const userId = 'user-upgrade-tree-start';
    await seedTestUser(userId);
    await grantCredits(userId, 500);

    const start = await UpgradeTreeService.startResearch(userId, 'bridge_hull_stabilizers');

    expect(start.nodeId).toBe('bridge_hull_stabilizers');
    expect(start.targetLevel).toBe(1);

    const queue = await db.upgradeResearchQueue.findFirst({
      where: { id: start.queueId },
    });
    expect(queue).not.toBeNull();
    expect(queue?.status).toBe('IN_PROGRESS');

    const purchaseEntry = await db.currencyLedger.findFirst({
      where: {
        userId,
        entryType: 'PURCHASE',
        referenceId: {
          startsWith: 'upgrade-tree:bridge_hull_stabilizers:lv1:start',
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(purchaseEntry).not.toBeNull();
    expect(purchaseEntry?.amount).toBeLessThan(0);
  });

  it('cancels active research and grants partial refund', async () => {
    const userId = 'user-upgrade-tree-cancel';
    await seedTestUser(userId);
    await grantCredits(userId, 500);

    const start = await UpgradeTreeService.startResearch(userId, 'bridge_hull_stabilizers');
    const cancel = await UpgradeTreeService.cancelActiveResearch(userId);

    expect(cancel.queueId).toBe(start.queueId);
    expect(cancel.refundedCC).toBeGreaterThan(0);

    const queue = await db.upgradeResearchQueue.findFirst({ where: { id: start.queueId } });
    expect(queue?.status).toBe('CANCELLED');

    const refundEntry = await db.currencyLedger.findFirst({
      where: {
        userId,
        entryType: 'SALE',
        referenceId: {
          startsWith: 'upgrade-tree:bridge_hull_stabilizers:lv1:cancel',
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(refundEntry).not.toBeNull();
    expect(refundEntry?.amount).toBe(cancel.refundedCC);
  });

  it('materializes completed research into node progress during read sync', async () => {
    const userId = 'user-upgrade-tree-complete';
    await seedTestUser(userId);
    await grantCredits(userId, 500);

    const start = await UpgradeTreeService.startResearch(userId, 'bridge_hull_stabilizers');

    await db.upgradeResearchQueue.update({
      where: { id: start.queueId },
      data: {
        startedAt: new Date(Date.now() - 180_000),
        completesAt: new Date(Date.now() - 60_000),
      },
    });

    const tree = await UpgradeTreeService.getUpgradeTreeForPlayer(userId);
    const node = tree.nodes.find((entry) => entry.id === 'bridge_hull_stabilizers');

    expect(node?.currentLevel).toBe(1);
    expect(tree.activeResearch).toBeNull();

    const persistedProgress = await db.upgradeNodeProgress.findUnique({
      where: {
        userId_nodeId: {
          userId,
          nodeId: 'bridge_hull_stabilizers',
        },
      },
    });
    expect(persistedProgress?.level).toBe(1);
  });
});

