'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db/client';
import { auth } from '../auth/auth';
import { ITEM_CATALOG } from '../../config/game.config';
import { ActionResult } from '../../types/api.types';
import { SellItemsSchema, SellItemsInput } from '../../lib/validators/economy.validators';
import { RunRepository } from '../repositories/run.repository';

// Assuming we want to return the amount earned.
export async function sellItemsAction(
  input: SellItemsInput
): Promise<ActionResult<{ creditsEarned: number }>> {
  // 1. Validation
  const validation = SellItemsSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Datos de venta inválidos.' },
    };
  }

  // 2. Auth checking
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Debes iniciar sesión para vender.' },
    };
  }

  const { itemDefinitionId, amountToSell } = validation.data;

  // Verify the item exists and can be sold.
  const itemDef = ITEM_CATALOG.find(i => i.id === itemDefinitionId);
  if (!itemDef) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'El ítem no existe en el catálogo.' },
    };
  }

  if (itemDef.baseValue <= 0) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Este ítem no tiene valor en el mercado.' },
    };
  }

  const creditsToEarn = itemDef.baseValue * amountToSell;

  try {
    // We do atomic transactions to deduct from inventory and add to ledger.
    const creditsEarned = await db.$transaction(async (tx) => {
      // Find the inventory item.
      const invItem = await tx.inventoryItem.findFirst({
        where: { userId, itemDefinitionId },
      });

      if (!invItem || invItem.quantity < amountToSell) {
        throw new Error('No tienes suficiente cantidad de este ítem para vender.');
      }

      // Deduct quantity, if 0 delete it to keep db clean.
      if (invItem.quantity === amountToSell) {
        await tx.inventoryItem.delete({
          where: { id: invItem.id },
        });
      } else {
        await tx.inventoryItem.update({
          where: { id: invItem.id },
          data: { quantity: { decrement: amountToSell } },
        });
      }

      // Economy ledger resolution
      const latestLedger = await tx.currencyLedger.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      const prevBalance = latestLedger?.balanceAfter || 0;

      await tx.currencyLedger.create({
        data: {
          userId,
          amount: creditsToEarn,
          balanceAfter: prevBalance + creditsToEarn,
          entryType: 'SALE',
          referenceId: `sell_${itemDefinitionId}_${amountToSell}`,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'inventory.sell',
          payload: { itemDefinitionId, amountToSell, creditsEarned: creditsToEarn },
        },
      });

      return creditsToEarn;
    });

    // We revalidate both inventory and market so UI refreshes.
    revalidatePath('/inventory');
    revalidatePath('/market');
    revalidatePath('/dashboard'); // Balance update

    return { success: true, data: { creditsEarned } };
  } catch (error: any) {
    if (error.message === 'No tienes suficiente cantidad de este ítem para vender.') {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message },
      };
    }

    console.error('[sellItemsAction] Error:', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado al realizar la venta.' },
    };
  }
}
