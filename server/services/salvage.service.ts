import 'server-only';

import { db } from '@/server/db/client';
import { DomainError } from '@/server/domain/inventory/inventory.service';
import { computeSalvageCredits } from '@/server/domain/inventory/salvage.logic';
import { ITEM_CATALOG } from '@/config/game.config';
import { ItemCategory } from '@/types/game.types';

interface SalvageItemResult {
  creditsEarned: number;
  newBalance: number;
}

export const SalvageService = {
  async salvageItem(
    userId: string,
    itemDefinitionId: string,
    quantity: number,
  ): Promise<SalvageItemResult> {
    if (quantity <= 0) {
      throw new DomainError('VALIDATION_ERROR', 'La cantidad a reciclar debe ser mayor a 0.');
    }

    const itemDefinition = ITEM_CATALOG.find((item) => item.id === itemDefinitionId);

    if (!itemDefinition) {
      throw new DomainError('NOT_FOUND', 'El ítem a reciclar no existe.');
    }

    if (itemDefinition.itemType !== ItemCategory.MATERIAL) {
      throw new DomainError('VALIDATION_ERROR', 'Solo los materiales pueden reciclarse.');
    }

    const creditsEarned = computeSalvageCredits({
      baseValue: itemDefinition.baseValue,
      quantity,
    });

    if (creditsEarned <= 0) {
      throw new DomainError('VALIDATION_ERROR', 'Este material no puede reciclarse por créditos.');
    }

    return db.$transaction(async (tx) => {
      const activeRun = await tx.activeRun.findUnique({ where: { userId } });
      if (activeRun?.status === 'RUNNING') {
        throw new DomainError('RUN_ALREADY_ACTIVE', 'No puedes reciclar materiales durante una expedición.');
      }

      const inventoryItem = await tx.inventoryItem.findUnique({
        where: { userId_itemDefinitionId: { userId, itemDefinitionId } },
      });

      if (!inventoryItem || inventoryItem.quantity < quantity) {
        throw new DomainError('VALIDATION_ERROR', 'No tienes suficiente cantidad para reciclar.');
      }

      if (inventoryItem.quantity === quantity) {
        await tx.inventoryItem.delete({ where: { id: inventoryItem.id } });
      } else {
        await tx.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: { quantity: { decrement: quantity } },
        });
      }

      const latestLedger = await tx.currencyLedger.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      const previousBalance = latestLedger?.balanceAfter ?? 0;
      const newBalance = previousBalance + creditsEarned;

      await tx.currencyLedger.create({
        data: {
          userId,
          amount: creditsEarned,
          balanceAfter: newBalance,
          entryType: 'SALE',
          referenceId: `salvage_${itemDefinitionId}_${quantity}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'inventory.salvage',
          payload: {
            itemDefinitionId,
            quantity,
            creditsEarned,
          },
        },
      });

      return {
        creditsEarned,
        newBalance,
      };
    });
  },
};
