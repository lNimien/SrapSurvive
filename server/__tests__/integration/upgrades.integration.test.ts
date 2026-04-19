import 'server-only';

import { describe, expect, it } from 'vitest';

import { db } from '@/server/db/client';
import { UPGRADE_DEFINITION_BY_ID } from '@/config/upgrades.config';
import { seedTestUser } from '@/server/__tests__/helpers/db-test-utils';
import { AccountUpgradeService } from '@/server/services/account-upgrade.service';

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

describe('AccountUpgradeService.purchaseUpgrade (integration)', () => {
  it('purchases upgrade, appends PURCHASE ledger and marks as purchased', async () => {
    const userId = 'user-upgrade-success';
    const upgrade = UPGRADE_DEFINITION_BY_ID.upgrade_hull_stabilizers_v1;

    await seedTestUser(userId);
    await grantCredits(userId, 500);

    const purchase = await AccountUpgradeService.purchaseUpgrade(userId, upgrade.id);
    expect(purchase.upgradeId).toBe(upgrade.id);

    const purchaseEntry = await db.currencyLedger.findFirst({
      where: {
        userId,
        entryType: 'PURCHASE',
        referenceId: `upgrade:${upgrade.id}:purchase`,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(purchaseEntry).not.toBeNull();
    expect(purchaseEntry?.amount).toBe(-upgrade.costCC);
    expect(purchaseEntry?.balanceAfter).toBe(500 - upgrade.costCC);

    const upgrades = await AccountUpgradeService.getUpgradesForPlayer(userId);
    const purchased = upgrades.find((entry) => entry.id === upgrade.id);
    expect(purchased?.purchased).toBe(true);

    const auditLog = await db.auditLog.findFirst({
      where: { userId, action: 'upgrade.purchase' },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditLog).not.toBeNull();
  });

  it('rejects duplicate purchase and does not append another PURCHASE entry', async () => {
    const userId = 'user-upgrade-duplicate';
    const upgrade = UPGRADE_DEFINITION_BY_ID.upgrade_escape_protocol_v1;

    await seedTestUser(userId);
    await grantCredits(userId, 500);
    await AccountUpgradeService.purchaseUpgrade(userId, upgrade.id);

    const beforeCount = await db.currencyLedger.count({
      where: {
        userId,
        entryType: 'PURCHASE',
        referenceId: `upgrade:${upgrade.id}:purchase`,
      },
    });

    await expect(AccountUpgradeService.purchaseUpgrade(userId, upgrade.id)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });

    const afterCount = await db.currencyLedger.count({
      where: {
        userId,
        entryType: 'PURCHASE',
        referenceId: `upgrade:${upgrade.id}:purchase`,
      },
    });

    expect(afterCount).toBe(beforeCount);
  });

  it('rejects purchase with insufficient funds and leaves ledger unchanged for upgrade reference', async () => {
    const userId = 'user-upgrade-insufficient';
    const upgrade = UPGRADE_DEFINITION_BY_ID.upgrade_salvage_optimizer_v1;

    await seedTestUser(userId);

    await expect(AccountUpgradeService.purchaseUpgrade(userId, upgrade.id)).rejects.toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
    });

    const purchaseCount = await db.currencyLedger.count({
      where: {
        userId,
        referenceId: `upgrade:${upgrade.id}:purchase`,
      },
    });

    expect(purchaseCount).toBe(0);
  });
});
