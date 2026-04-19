import 'server-only';

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from '@/server/auth/auth';
import { db } from '@/server/db/client';
import { ITEM_CATALOG } from '@/config/game.config';
import { VENDOR_CATALOG } from '@/config/vendor.config';
import { computeSellUnitPrice } from '@/server/domain/economy/market.calculator';
import { seedTestUser } from '@/server/__tests__/helpers/db-test-utils';
import { buyItemAction, sellItemsAction } from '@/server/actions/economy.actions';

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

describe('economy market actions (integration)', () => {
  it('buy happy path updates inventory, ledger and audit log', async () => {
    const userId = 'user-market-buy-happy';
    const vendorItemId = 'reinforced_helmet';
    const vendorEntry = VENDOR_CATALOG.find((entry) => entry.itemDefinitionId === vendorItemId);

    if (!vendorEntry) {
      throw new Error(`Expected vendor entry for ${vendorItemId}`);
    }

    await seedTestUser(userId);
    await grantCredits(userId, 1_000);

    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as never);

    const result = await buyItemAction({ itemDefinitionId: vendorItemId });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected successful buy action result.');
    }

    const inventoryItem = await db.inventoryItem.findUnique({
      where: { userId_itemDefinitionId: { userId, itemDefinitionId: vendorItemId } },
    });
    expect(inventoryItem?.quantity).toBe(1);

    const purchaseEntry = await db.currencyLedger.findFirst({
      where: {
        userId,
        entryType: 'PURCHASE',
        referenceId: `buy_${vendorItemId}`,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(purchaseEntry).not.toBeNull();
    expect(purchaseEntry?.amount).toBe(-vendorEntry.priceCC);

    const auditEntry = await db.auditLog.findFirst({
      where: { userId, action: 'inventory.buy' },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditEntry).not.toBeNull();
  });

  it('sell happy path decrements/deletes inventory, appends sale ledger and audit', async () => {
    const userId = 'user-market-sell-happy';
    const itemDefinitionId = 'scrap_metal';
    const amountToSell = 2;

    const item = ITEM_CATALOG.find((entry) => entry.id === itemDefinitionId);
    if (!item) {
      throw new Error(`Expected item catalog entry for ${itemDefinitionId}`);
    }

    await seedTestUser(userId);
    await db.inventoryItem.create({
      data: {
        userId,
        itemDefinitionId,
        quantity: amountToSell,
      },
    });

    const expectedUnitPrice = computeSellUnitPrice(item.baseValue);
    const expectedCreditsEarned = expectedUnitPrice * amountToSell;

    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as never);

    const result = await sellItemsAction({ itemDefinitionId, amountToSell });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected successful sell action result.');
    }
    expect(result.data.creditsEarned).toBe(expectedCreditsEarned);

    const remainingInventory = await db.inventoryItem.findUnique({
      where: { userId_itemDefinitionId: { userId, itemDefinitionId } },
    });
    expect(remainingInventory).toBeNull();

    const saleEntry = await db.currencyLedger.findFirst({
      where: {
        userId,
        entryType: 'SALE',
        referenceId: `sell_${itemDefinitionId}_${amountToSell}`,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(saleEntry).not.toBeNull();
    expect(saleEntry?.amount).toBe(expectedCreditsEarned);

    const auditEntry = await db.auditLog.findFirst({
      where: { userId, action: 'inventory.sell' },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditEntry).not.toBeNull();
  });

  it('buy rolls back ledger entry when inventory FK insert fails', async () => {
    const userId = 'user-market-buy-rollback';
    const vendorItemId = 'reinforced_helmet';

    await seedTestUser(userId);
    await grantCredits(userId, 1_000);

    await db.itemDefinition.delete({ where: { id: vendorItemId } });

    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as never);

    const beforePurchaseEntries = await db.currencyLedger.count({
      where: {
        userId,
        entryType: 'PURCHASE',
        referenceId: `buy_${vendorItemId}`,
      },
    });

    const result = await buyItemAction({ itemDefinitionId: vendorItemId });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected failed buy action due to FK violation.');
    }
    expect(result.error.code).toBe('INTERNAL_ERROR');

    const afterPurchaseEntries = await db.currencyLedger.count({
      where: {
        userId,
        entryType: 'PURCHASE',
        referenceId: `buy_${vendorItemId}`,
      },
    });
    expect(afterPurchaseEntries).toBe(beforePurchaseEntries);

    const inventoryItem = await db.inventoryItem.findUnique({
      where: { userId_itemDefinitionId: { userId, itemDefinitionId: vendorItemId } },
    });
    expect(inventoryItem).toBeNull();
  });
});
