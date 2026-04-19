'use server';

import 'server-only';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db/client';
import { auth } from '../auth/auth';
import { ITEM_CATALOG } from '../../config/game.config';
import { VENDOR_CATALOG } from '../../config/vendor.config';
import { ActionResult } from '../../types/dto.types';
import { SellItemsSchema, SellItemsInput, BuyItemSchema, BuyItemInput } from '../../lib/validators/economy.validators';
import { RunRepository } from '../repositories/run.repository';
import { computeItemPrice, computeSellUnitPrice } from '../domain/economy/market.calculator';
import { guardMutationCategory } from '../services/mutation-guard.service';

// Assuming we want to return the amount earned.
// ... (sellItemsAction code exists above)

export async function buyItemAction(
  input: BuyItemInput
): Promise<ActionResult<{ itemDefinitionId: string }>> {
  // 1. Validation
  const validation = BuyItemSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Datos de compra inválidos.' },
    };
  }

  // 2. Auth checking
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Debes iniciar sesión para comprar.' },
    };
  }

  const mutationGuard = guardMutationCategory('market');
  if (mutationGuard.blocked) {
    return {
      success: false,
      error: mutationGuard.error,
    };
  }

  const { itemDefinitionId } = validation.data;

  // 3. Verify the item exists in vendor catalog
  const vendorEntry = VENDOR_CATALOG.find(v => v.itemDefinitionId === itemDefinitionId);
  const itemDef = ITEM_CATALOG.find(i => i.id === itemDefinitionId);
  
  if (!vendorEntry || !itemDef) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'El ítem no está disponible para compra.' },
    };
  }

  const price = vendorEntry.priceCC;

  try {
    await db.$transaction(async (tx) => {
      // Check balance
      const latestLedger = await tx.currencyLedger.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      const currentBalance = latestLedger?.balanceAfter || 0;

      if (currentBalance < price) {
        throw new Error('Créditos insuficientes para esta compra.');
      }

      // 1. Deduct credits
      await tx.currencyLedger.create({
        data: {
          userId,
          amount: -price,
          balanceAfter: currentBalance - price,
          entryType: 'PURCHASE',
          referenceId: `buy_${itemDefinitionId}`,
        },
      });

      // 2. Add to inventory
      const existingInv = await tx.inventoryItem.findFirst({
        where: { userId, itemDefinitionId },
      });

      if (existingInv) {
        // Special case: if it's equipment and already has it, maybe we don't want duplicates? 
        // In this game MVP, multiple equipment items are allowed in inventory, but only 1 equipped.
        await tx.inventoryItem.update({
          where: { id: existingInv.id },
          data: { quantity: { increment: 1 }, acquiredAt: new Date() },
        });
      } else {
        await tx.inventoryItem.create({
          data: {
            userId,
            itemDefinitionId,
            quantity: 1,
            acquiredAt: new Date(),
          },
        });
      }

      // 3. Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'inventory.buy',
          payload: { itemDefinitionId, priceCC: price },
        },
      });
    });

    revalidatePath('/inventory');
    revalidatePath('/market');
    revalidatePath('/dashboard');

    return { success: true, data: { itemDefinitionId } };
  } catch (error: any) {
    if (error.message === 'Créditos insuficientes para esta compra.') {
      return {
        success: false,
        error: { code: 'INSUFFICIENT_FUNDS', message: error.message },
      };
    }

    console.error('[buyItemAction] Error:', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado al realizar la compra.' },
    };
  }
}
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

  const mutationGuard = guardMutationCategory('market');
  if (mutationGuard.blocked) {
    return {
      success: false,
      error: mutationGuard.error,
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

  const currentSellPrice = computeSellUnitPrice(itemDef.baseValue);
  const creditsToEarn = currentSellPrice * amountToSell;

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
