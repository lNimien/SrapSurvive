import 'server-only';
import { db } from '../db/client';
import { DomainError } from '../domain/inventory/inventory.service';
import { generateContractDraft } from '../domain/contract/contract.calculator';
import { calculateLevelProgress } from '../domain/progression/progression.calculator';

export const ContractService = {
  /**
   * Ensures the user has 3 active contracts for the current day.
   */
  async ensureDailyContracts(userId: string) {
    const now = new Date();
    
    // 1. Get current active contracts
    const activeContracts = await db.userContract.findMany({
      where: { userId, status: 'ACTIVE' }
    });

    // 2. Check if they are expired
    const validContracts = activeContracts.filter(c => c.expiresAt > now);
    
    if (validContracts.length >= 3) {
      return validContracts;
    }

    // 3. Mark old ones as EXPIRED
    if (activeContracts.length > validContracts.length) {
      await db.userContract.updateMany({
        where: { userId, status: 'ACTIVE', expiresAt: { lte: now } },
        data: { status: 'EXPIRED' }
      });
    }

    // 4. Generate new ones if needed
    // Resets at 00:00 UTC
    const expiresAt = new Date();
    expiresAt.setUTCHours(23, 59, 59, 999);

    const dateSeed = now.toISOString().split('T')[0]; // "YYYY-MM-DD"
    
    const newContracts = [];
    // We create 3 distinct contracts by appending index to seed
    for (let i = 0; i < 3; i++) {
        const draft = generateContractDraft(`${userId}-${dateSeed}-${i}`);
        newContracts.push({
            userId,
            requiredItemDefId: draft.requiredItemDefId,
            requiredQuantity: draft.requiredQuantity,
            rewardCC: draft.rewardCC,
            rewardXP: draft.rewardXP,
            expiresAt,
            status: 'ACTIVE' as const
        });
    }

    await db.userContract.createMany({
        data: newContracts
    });

    return db.userContract.findMany({
        where: { userId, status: 'ACTIVE' }
    });
  },

  /**
   * Delivers items to a contract.
   */
  async deliverMaterial(userId: string, contractId: string, quantity: number) {
    return await db.$transaction(async (tx) => {
      // 1. Validate contract
      const contract = await tx.userContract.findUnique({
        where: { id: contractId }
      });

      if (!contract || contract.userId !== userId) {
        throw new DomainError('NOT_FOUND', 'Contrato no encontrado.');
      }

      if (contract.status !== 'ACTIVE' || contract.expiresAt < new Date()) {
        throw new DomainError('EXPIRED', 'Este contrato ha expirado.');
      }

      const remainingNeeded = contract.requiredQuantity - contract.currentQuantity;
      const amountToDeliver = Math.min(quantity, remainingNeeded);

      if (amountToDeliver <= 0) {
        throw new DomainError('VALIDATION_ERROR', 'No se necesitan más materiales.');
      }

      // 2. Validate inventory
      const inventoryItem = await tx.inventoryItem.findUnique({
        where: { userId_itemDefinitionId: { userId, itemDefinitionId: contract.requiredItemDefId } }
      });

      if (!inventoryItem || inventoryItem.quantity < amountToDeliver) {
        throw new DomainError('INSUFFICIENT_FUNDS', 'No tienes suficientes materiales.');
      }

      // 3. Update Inventory
      if (inventoryItem.quantity === amountToDeliver) {
        await tx.inventoryItem.delete({ where: { id: inventoryItem.id } });
      } else {
        await tx.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: { quantity: { decrement: amountToDeliver } }
        });
      }

      // 4. Update Contract
      const newCurrentQty = contract.currentQuantity + amountToDeliver;
      const isCompleted = newCurrentQty >= contract.requiredQuantity;

      const updatedContract = await tx.userContract.update({
        where: { id: contractId },
        data: {
          currentQuantity: newCurrentQty,
          status: isCompleted ? 'COMPLETED' : 'ACTIVE'
        }
      });

      // 5. If COMPLETED, give rewards
      if (isCompleted) {
        // Give CC
        const latestLedger = await tx.currencyLedger.findFirst({
           where: { userId }, orderBy: { createdAt: 'desc' }
        });
        const prevBalance = latestLedger?.balanceAfter || 0;

        await tx.currencyLedger.create({
           data: {
              userId,
              amount: contract.rewardCC,
              balanceAfter: prevBalance + contract.rewardCC,
              entryType: 'CONTRACT_REWARD',
              referenceId: contract.id
           }
        });

        // Give XP
        const progression = await tx.userProgression.findUnique({
           where: { userId }
        });
        
        if (progression) {
           const { newXp, newLevel } = calculateLevelProgress(
              progression.currentXp,
              progression.currentLevel,
              contract.rewardXP
           );

           await tx.userProgression.update({
              where: { userId },
              data: {
                 currentXp: newXp,
                 currentLevel: newLevel
              }
           });
        }

        // Audit log
        await tx.auditLog.create({
            data: {
                userId,
                action: 'contract.complete',
                payload: { contractId, rewardCC: contract.rewardCC, rewardXP: contract.rewardXP }
            }
        });
      } else {
          // Audit log partial delivery
          await tx.auditLog.create({
              data: {
                  userId,
                  action: 'contract.deliver',
                  payload: { contractId, amountDelivered: amountToDeliver, currentQuantity: newCurrentQty }
              }
          });
      }

      return updatedContract;
    });
  }
};
