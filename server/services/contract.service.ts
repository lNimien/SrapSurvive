import 'server-only';
import { db } from '../db/client';
import { DomainError } from '../domain/inventory/inventory.service';
import { generateContractDraft } from '../domain/contract/contract.calculator';
import { calculateLevelProgress } from '../domain/progression/progression.calculator';

const DAILY_CONTRACT_COUNT = 3;
const CONTRACT_REFRESH_COST_CC = 85;

function getUtcDayRange(referenceDate: Date): { dayStart: Date; dayEnd: Date; dateSeed: string } {
  const dayStart = new Date(Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
    0,
    0,
    0,
    0
  ));
  const dayEnd = new Date(Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
    23,
    59,
    59,
    999
  ));

  return {
    dayStart,
    dayEnd,
    dateSeed: dayStart.toISOString().slice(0, 10),
  };
}

async function getTodayContractsForUser(userId: string, dayStart: Date, dayEnd: Date) {
  return db.userContract.findMany({
    where: {
      userId,
      createdAt: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: {
        in: ['ACTIVE', 'COMPLETED'],
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

async function getPlayerLevelOrThrow(userId: string): Promise<number> {
  const progression = await db.userProgression.findUnique({
    where: { userId },
    select: { currentLevel: true },
  });

  if (!progression) {
    throw new DomainError('NOT_FOUND', 'No se encontró progresión para generar contratos.');
  }

  return progression.currentLevel;
}

export const ContractService = {
  /**
   * Ensures the user has 3 active contracts for the current day.
   */
  async ensureDailyContracts(userId: string) {
    const now = new Date();
    const { dayStart, dayEnd, dateSeed } = getUtcDayRange(now);

    await db.userContract.updateMany({
      where: { userId, status: 'ACTIVE', expiresAt: { lte: now } },
      data: { status: 'EXPIRED' },
    });

    const [playerLevel, todaysContracts] = await Promise.all([
      getPlayerLevelOrThrow(userId),
      getTodayContractsForUser(userId, dayStart, dayEnd),
    ]);

    if (todaysContracts.length >= DAILY_CONTRACT_COUNT) {
      return todaysContracts;
    }

    const contractsToGenerate = DAILY_CONTRACT_COUNT - todaysContracts.length;
    const startIndex = todaysContracts.length;

    const newContracts = Array.from({ length: contractsToGenerate }, (_, index) => {
      const slotIndex = startIndex + index;
      const draft = generateContractDraft(`${userId}-${dateSeed}-daily-${slotIndex}`, {
        playerLevel,
      });

      return {
        userId,
        requiredItemDefId: draft.requiredItemDefId,
        requiredQuantity: draft.requiredQuantity,
        rewardCC: draft.rewardCC,
        rewardXP: draft.rewardXP,
        expiresAt: dayEnd,
        status: 'ACTIVE' as const,
      };
    });

    await db.userContract.createMany({ data: newContracts });

    return getTodayContractsForUser(userId, dayStart, dayEnd);
  },

  async refreshContracts(userId: string, requestId?: string) {
    const now = new Date();
    const { dayStart, dayEnd, dateSeed } = getUtcDayRange(now);

    return db.$transaction(async (tx) => {
      if (requestId) {
        const duplicatedRefresh = await tx.auditLog.findFirst({
          where: {
            userId,
            action: 'contract.refresh',
            createdAt: {
              gte: dayStart,
              lte: dayEnd,
            },
            payload: {
              path: ['requestId'],
              equals: requestId,
            },
          },
          select: { id: true },
        });

        if (duplicatedRefresh) {
          return tx.userContract.findMany({
            where: {
              userId,
              createdAt: {
                gte: dayStart,
                lte: dayEnd,
              },
              status: {
                in: ['ACTIVE', 'COMPLETED'],
              },
            },
            orderBy: { createdAt: 'asc' },
          });
        }
      }

      await tx.userContract.updateMany({
        where: { userId, status: 'ACTIVE', expiresAt: { lte: now } },
        data: { status: 'EXPIRED' },
      });

      const [progression, latestLedgerEntry, refreshCountToday, todayContracts] = await Promise.all([
        tx.userProgression.findUnique({ where: { userId }, select: { currentLevel: true } }),
        tx.currencyLedger.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { balanceAfter: true },
        }),
        tx.auditLog.count({
          where: {
            userId,
            action: 'contract.refresh',
            createdAt: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        }),
        tx.userContract.findMany({
          where: {
            userId,
            createdAt: {
              gte: dayStart,
              lte: dayEnd,
            },
            status: {
              in: ['ACTIVE', 'COMPLETED'],
            },
          },
          select: { status: true },
        }),
      ]);

      if (!progression) {
        throw new DomainError('NOT_FOUND', 'No se encontró progresión para refrescar contratos.');
      }

      const currentBalance = latestLedgerEntry?.balanceAfter ?? 0;
      if (currentBalance < CONTRACT_REFRESH_COST_CC) {
        throw new DomainError('INSUFFICIENT_BALANCE', 'No tienes créditos suficientes para refrescar contratos.');
      }

      const completedCount = todayContracts.filter((contract) => contract.status === 'COMPLETED').length;
      const slotsToGenerate = Math.max(0, DAILY_CONTRACT_COUNT - completedCount);

      await tx.userContract.updateMany({
        where: {
          userId,
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
          status: 'ACTIVE',
        },
        data: { status: 'EXPIRED' },
      });

      const refreshIteration = refreshCountToday + 1;
      const refreshReferenceId = `contract-refresh:${dateSeed}:${refreshIteration}`;

      await tx.currencyLedger.create({
        data: {
          userId,
          amount: -CONTRACT_REFRESH_COST_CC,
          balanceAfter: currentBalance - CONTRACT_REFRESH_COST_CC,
          entryType: 'PURCHASE',
          referenceId: refreshReferenceId,
        },
      });

      const contractsToCreate = Array.from({ length: slotsToGenerate }, (_, index) => {
        const draft = generateContractDraft(`${userId}-${dateSeed}-refresh-${refreshIteration}-${index}`, {
          playerLevel: progression.currentLevel,
        });

        return {
          userId,
          requiredItemDefId: draft.requiredItemDefId,
          requiredQuantity: draft.requiredQuantity,
          rewardCC: draft.rewardCC,
          rewardXP: draft.rewardXP,
          expiresAt: dayEnd,
          status: 'ACTIVE' as const,
        };
      });

      if (contractsToCreate.length > 0) {
        await tx.userContract.createMany({ data: contractsToCreate });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'contract.refresh',
          payload: {
            requestId: requestId ?? null,
            refreshIteration,
            refreshCostCC: CONTRACT_REFRESH_COST_CC,
            slotsGenerated: contractsToCreate.length,
            referenceId: refreshReferenceId,
          },
        },
      });

      return tx.userContract.findMany({
        where: {
          userId,
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
          status: {
            in: ['ACTIVE', 'COMPLETED'],
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    }, {
      isolationLevel: 'Serializable',
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
