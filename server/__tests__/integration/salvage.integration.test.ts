import 'server-only';

import { describe, expect, it } from 'vitest';

import { db } from '@/server/db/client';
import { seedTestRun, seedTestUser } from '@/server/__tests__/helpers/db-test-utils';
import { SalvageService } from '@/server/services/salvage.service';

describe('SalvageService.salvageItem (integration)', () => {
  it('happy path decrements inventory and appends ledger + audit log', async () => {
    const userId = 'user-salvage-happy';
    const itemDefinitionId = 'scrap_metal';

    await seedTestUser(userId);
    await db.inventoryItem.create({
      data: {
        userId,
        itemDefinitionId,
        quantity: 3,
      },
    });

    const result = await SalvageService.salvageItem(userId, itemDefinitionId, 2);

    expect(result.creditsEarned).toBe(2);
    expect(result.newBalance).toBe(2);

    const inventoryItem = await db.inventoryItem.findUnique({
      where: { userId_itemDefinitionId: { userId, itemDefinitionId } },
    });
    expect(inventoryItem?.quantity).toBe(1);

    const ledgerEntry = await db.currencyLedger.findFirst({
      where: {
        userId,
        entryType: 'SALE',
        referenceId: `salvage_${itemDefinitionId}_2`,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(ledgerEntry?.amount).toBe(2);
    expect(ledgerEntry?.balanceAfter).toBe(2);

    const auditEntry = await db.auditLog.findFirst({
      where: { userId, action: 'inventory.salvage' },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditEntry).not.toBeNull();
  });

  it('insufficient quantity rejects without inventory/ledger/audit side effects', async () => {
    const userId = 'user-salvage-insufficient';
    const itemDefinitionId = 'energy_cell';

    await seedTestUser(userId);
    await db.inventoryItem.create({
      data: {
        userId,
        itemDefinitionId,
        quantity: 1,
      },
    });

    const initialLedgerCount = await db.currencyLedger.count({ where: { userId } });
    const initialAuditCount = await db.auditLog.count({ where: { userId, action: 'inventory.salvage' } });

    await expect(SalvageService.salvageItem(userId, itemDefinitionId, 2)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });

    const inventoryItem = await db.inventoryItem.findUnique({
      where: { userId_itemDefinitionId: { userId, itemDefinitionId } },
    });
    expect(inventoryItem?.quantity).toBe(1);

    const finalLedgerCount = await db.currencyLedger.count({ where: { userId } });
    const finalAuditCount = await db.auditLog.count({ where: { userId, action: 'inventory.salvage' } });

    expect(finalLedgerCount).toBe(initialLedgerCount);
    expect(finalAuditCount).toBe(initialAuditCount);
  });

  it('run active path is rejected and does not mutate state', async () => {
    const userId = 'user-salvage-run-active';
    const itemDefinitionId = 'recycled_component';

    await seedTestUser(userId);
    await seedTestRun({ userId });
    await db.inventoryItem.create({
      data: {
        userId,
        itemDefinitionId,
        quantity: 4,
      },
    });

    const initialLedgerCount = await db.currencyLedger.count({ where: { userId } });

    await expect(SalvageService.salvageItem(userId, itemDefinitionId, 1)).rejects.toMatchObject({
      code: 'RUN_ALREADY_ACTIVE',
    });

    const inventoryItem = await db.inventoryItem.findUnique({
      where: { userId_itemDefinitionId: { userId, itemDefinitionId } },
    });
    expect(inventoryItem?.quantity).toBe(4);

    const finalLedgerCount = await db.currencyLedger.count({ where: { userId } });
    expect(finalLedgerCount).toBe(initialLedgerCount);
  });
});
