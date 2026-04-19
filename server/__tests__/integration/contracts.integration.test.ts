import 'server-only';

import { describe, expect, it } from 'vitest';

import { db } from '@/server/db/client';
import { seedTestUser } from '@/server/__tests__/helpers/db-test-utils';
import { ContractService } from '@/server/services/contract.service';

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

describe('ContractService.deliverMaterial (integration)', () => {
  it('partial delivery updates contract quantity and decrements inventory without rewards', async () => {
    const userId = 'user-contract-partial';
    const requiredItemDefId = 'scrap_metal';

    await seedTestUser(userId);

    const contract = await db.userContract.create({
      data: {
        userId,
        requiredItemDefId,
        requiredQuantity: 5,
        currentQuantity: 0,
        rewardCC: 200,
        rewardXP: 150,
        expiresAt: new Date(Date.now() + 86_400_000),
        status: 'ACTIVE',
      },
    });

    await db.inventoryItem.create({
      data: {
        userId,
        itemDefinitionId: requiredItemDefId,
        quantity: 10,
      },
    });

    await ContractService.deliverMaterial(userId, contract.id, 2);

    const updatedContract = await db.userContract.findUnique({ where: { id: contract.id } });
    expect(updatedContract?.currentQuantity).toBe(2);
    expect(updatedContract?.status).toBe('ACTIVE');

    const inventoryItem = await db.inventoryItem.findUnique({
      where: { userId_itemDefinitionId: { userId, itemDefinitionId: requiredItemDefId } },
    });
    expect(inventoryItem?.quantity).toBe(8);

    const rewardEntries = await db.currencyLedger.count({
      where: { userId, entryType: 'CONTRACT_REWARD', referenceId: contract.id },
    });
    expect(rewardEntries).toBe(0);

    const auditEntry = await db.auditLog.findFirst({
      where: { userId, action: 'contract.deliver' },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditEntry).not.toBeNull();
  });

  it('completion delivery marks contract complete and grants CC/XP with audit', async () => {
    const userId = 'user-contract-complete-scaled';

    await seedTestUser(userId);

    await db.userProgression.update({
      where: { userId },
      data: {
        currentLevel: 6,
      },
    });

    const [generatedContract] = await ContractService.ensureDailyContracts(userId);
    expect(generatedContract).toBeDefined();

    await db.inventoryItem.create({
      data: {
        userId,
        itemDefinitionId: generatedContract.requiredItemDefId,
        quantity: generatedContract.requiredQuantity,
      },
    });

    await ContractService.deliverMaterial(userId, generatedContract.id, generatedContract.requiredQuantity);

    const updatedContract = await db.userContract.findUnique({ where: { id: generatedContract.id } });
    expect(updatedContract?.currentQuantity).toBe(generatedContract.requiredQuantity);
    expect(updatedContract?.status).toBe('COMPLETED');

    const inventoryItem = await db.inventoryItem.findUnique({
      where: {
        userId_itemDefinitionId: {
          userId,
          itemDefinitionId: generatedContract.requiredItemDefId,
        },
      },
    });
    expect(inventoryItem).toBeNull();

    const rewardEntry = await db.currencyLedger.findFirst({
      where: {
        userId,
        entryType: 'CONTRACT_REWARD',
        referenceId: generatedContract.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(rewardEntry).not.toBeNull();
    expect(rewardEntry?.amount).toBe(generatedContract.rewardCC);

    const progression = await db.userProgression.findUnique({ where: { userId } });
    expect(progression?.currentLevel).toBeGreaterThanOrEqual(6);
    expect(progression?.currentXp).toBeGreaterThanOrEqual(0);

    const auditEntry = await db.auditLog.findFirst({
      where: { userId, action: 'contract.complete' },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditEntry).not.toBeNull();
  });

  it('refresh contracts deducts CC, rotates active contracts and logs audit', async () => {
    const userId = 'user-contract-refresh-success';

    await seedTestUser(userId);
    await grantCredits(userId, 300);

    const initialContracts = await ContractService.ensureDailyContracts(userId);
    const initialIds = new Set(initialContracts.map((contract) => contract.id));

    const refreshed = await ContractService.refreshContracts(userId, 'refresh-request-1');
    const refreshedActive = refreshed.filter((contract) => contract.status === 'ACTIVE');

    expect(refreshedActive.length).toBeGreaterThan(0);
    expect(refreshedActive.every((contract) => !initialIds.has(contract.id))).toBe(true);

    const expiredCount = await db.userContract.count({
      where: {
        userId,
        id: { in: initialContracts.map((contract) => contract.id) },
        status: 'EXPIRED',
      },
    });
    expect(expiredCount).toBe(initialContracts.length);

    const refreshEntry = await db.currencyLedger.findFirst({
      where: {
        userId,
        entryType: 'PURCHASE',
        referenceId: { startsWith: 'contract-refresh:' },
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(refreshEntry).not.toBeNull();
    expect(refreshEntry?.amount).toBe(-85);

    const refreshAudit = await db.auditLog.findFirst({
      where: {
        userId,
        action: 'contract.refresh',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(refreshAudit).not.toBeNull();
  });

  it('refresh rollback on insufficient funds keeps contracts and ledger unchanged', async () => {
    const userId = 'user-contract-refresh-insufficient';

    await seedTestUser(userId);

    const initialContracts = await ContractService.ensureDailyContracts(userId);
    const initialActiveIds = initialContracts.filter((contract) => contract.status === 'ACTIVE').map((contract) => contract.id);

    await expect(ContractService.refreshContracts(userId, 'refresh-request-no-funds')).rejects.toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
    });

    const postContracts = await db.userContract.findMany({
      where: {
        userId,
        id: { in: initialActiveIds },
      },
    });

    expect(postContracts).toHaveLength(initialActiveIds.length);
    expect(postContracts.every((contract) => contract.status === 'ACTIVE')).toBe(true);

    const refreshEntryCount = await db.currencyLedger.count({
      where: {
        userId,
        referenceId: {
          startsWith: 'contract-refresh:',
        },
      },
    });
    expect(refreshEntryCount).toBe(0);

    const refreshAuditCount = await db.auditLog.count({
      where: {
        userId,
        action: 'contract.refresh',
      },
    });
    expect(refreshAuditCount).toBe(0);
  });

  it('refresh is idempotent-safe for repeated requestId', async () => {
    const userId = 'user-contract-refresh-idempotent';

    await seedTestUser(userId);
    await grantCredits(userId, 500);
    await ContractService.ensureDailyContracts(userId);

    await ContractService.refreshContracts(userId, 'refresh-same-request');
    await ContractService.refreshContracts(userId, 'refresh-same-request');

    const refreshPurchaseCount = await db.currencyLedger.count({
      where: {
        userId,
        referenceId: { startsWith: 'contract-refresh:' },
      },
    });

    expect(refreshPurchaseCount).toBe(1);
  });

  it('invalid ownership fails with NOT_FOUND and keeps state unchanged', async () => {
    const ownerUserId = 'user-contract-owner';
    const foreignUserId = 'user-contract-foreign';
    const requiredItemDefId = 'recycled_component';

    await seedTestUser(ownerUserId);
    await seedTestUser(foreignUserId);

    const contract = await db.userContract.create({
      data: {
        userId: ownerUserId,
        requiredItemDefId,
        requiredQuantity: 4,
        currentQuantity: 0,
        rewardCC: 120,
        rewardXP: 80,
        expiresAt: new Date(Date.now() + 86_400_000),
        status: 'ACTIVE',
      },
    });

    await db.inventoryItem.create({
      data: {
        userId: ownerUserId,
        itemDefinitionId: requiredItemDefId,
        quantity: 4,
      },
    });

    await expect(ContractService.deliverMaterial(foreignUserId, contract.id, 1)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });

    const unchangedContract = await db.userContract.findUnique({ where: { id: contract.id } });
    expect(unchangedContract?.currentQuantity).toBe(0);
    expect(unchangedContract?.status).toBe('ACTIVE');

    const unchangedInventory = await db.inventoryItem.findUnique({
      where: { userId_itemDefinitionId: { userId: ownerUserId, itemDefinitionId: requiredItemDefId } },
    });
    expect(unchangedInventory?.quantity).toBe(4);

    const rewardEntries = await db.currencyLedger.count({
      where: {
        userId: ownerUserId,
        entryType: 'CONTRACT_REWARD',
        referenceId: contract.id,
      },
    });
    expect(rewardEntries).toBe(0);

    const contractAuditCount = await db.auditLog.count({
      where: {
        userId: ownerUserId,
        action: { in: ['contract.deliver', 'contract.complete'] },
      },
    });
    expect(contractAuditCount).toBe(0);
  });
});
