'use server';

import 'server-only';

import { revalidatePath } from 'next/cache';
import { db } from '../db/client';
import { auth } from '../auth/auth';
import { ITEM_CATALOG } from '../../config/game.config';
import { VENDOR_CATALOG } from '../../config/vendor.config';
import { ActionResult } from '../../types/dto.types';
import { SellItemsSchema, SellItemsInput, BuyItemSchema, BuyItemInput } from '../../lib/validators/economy.validators';
import { guardMutationCategory } from '../services/mutation-guard.service';
import { computeSellUnitPrice } from '../domain/economy/market.calculator';
import { UpgradeTreeService } from '../services/upgrade-tree.service';
import {
  applyMarketBuyPriceMultiplier,
  applyMarketSellPriceMultiplier,
} from '../domain/progression/upgrade-tree.logic';

export async function buyItemAction(
  input: BuyItemInput,
): Promise<ActionResult<{ itemDefinitionId: string }>> {
  const validation = BuyItemSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Datos de compra invalidos.' },
    };
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Debes iniciar sesion para comprar.' },
    };
  }

  const mutationGuard = guardMutationCategory('market');
  if (mutationGuard.blocked) {
    return {
      success: false,
      error: mutationGuard.error,
    };
  }

  const upgradeProfile = await UpgradeTreeService.getRuntimeProfile(userId);
  const { itemDefinitionId } = validation.data;

  const vendorEntry = VENDOR_CATALOG.find((entry) => entry.itemDefinitionId === itemDefinitionId);
  const itemDef = ITEM_CATALOG.find((entry) => entry.id === itemDefinitionId);

  if (!vendorEntry || !itemDef) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'El item no esta disponible para compra.' },
    };
  }

  if ((vendorEntry.requiredAccessTier ?? 0) > upgradeProfile.blackMarketAccessTier) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Requiere mayor reputacion clandestina para desbloquear este articulo.',
      },
    };
  }

  const price = applyMarketBuyPriceMultiplier(vendorEntry.priceCC, upgradeProfile);

  try {
    await db.$transaction(async (tx) => {
      const latestLedger = await tx.currencyLedger.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      const currentBalance = latestLedger?.balanceAfter || 0;

      if (currentBalance < price) {
        throw new Error('Creditos insuficientes para esta compra.');
      }

      await tx.currencyLedger.create({
        data: {
          userId,
          amount: -price,
          balanceAfter: currentBalance - price,
          entryType: 'PURCHASE',
          referenceId: `buy_${itemDefinitionId}`,
        },
      });

      const existingInv = await tx.inventoryItem.findFirst({
        where: { userId, itemDefinitionId },
      });

      if (existingInv) {
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
    if (error.message === 'Creditos insuficientes para esta compra.') {
      return {
        success: false,
        error: { code: 'INSUFFICIENT_FUNDS', message: error.message },
      };
    }

    console.error('[buyItemAction] Error:', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Ocurrio un error inesperado al realizar la compra.' },
    };
  }
}

export async function sellItemsAction(
  input: SellItemsInput,
): Promise<ActionResult<{ creditsEarned: number }>> {
  const validation = SellItemsSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Datos de venta invalidos.' },
    };
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Debes iniciar sesion para vender.' },
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
  const upgradeProfile = await UpgradeTreeService.getRuntimeProfile(userId);

  const itemDef = ITEM_CATALOG.find((entry) => entry.id === itemDefinitionId);
  if (!itemDef) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'El item no existe en el catalogo.' },
    };
  }

  if (itemDef.baseValue <= 0) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Este item no tiene valor en el mercado.' },
    };
  }

  const currentSellPrice = applyMarketSellPriceMultiplier(computeSellUnitPrice(itemDef.baseValue), upgradeProfile);
  const creditsToEarn = currentSellPrice * amountToSell;

  try {
    const creditsEarned = await db.$transaction(async (tx) => {
      const invItem = await tx.inventoryItem.findFirst({
        where: { userId, itemDefinitionId },
      });

      if (!invItem || invItem.quantity < amountToSell) {
        throw new Error('No tienes suficiente cantidad de este item para vender.');
      }

      if (invItem.quantity === amountToSell) {
        await tx.inventoryItem.delete({ where: { id: invItem.id } });
      } else {
        await tx.inventoryItem.update({
          where: { id: invItem.id },
          data: { quantity: { decrement: amountToSell } },
        });
      }

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

      await tx.auditLog.create({
        data: {
          userId,
          action: 'inventory.sell',
          payload: { itemDefinitionId, amountToSell, creditsEarned: creditsToEarn },
        },
      });

      return creditsToEarn;
    });

    revalidatePath('/inventory');
    revalidatePath('/market');
    revalidatePath('/dashboard');

    return { success: true, data: { creditsEarned } };
  } catch (error: any) {
    if (error.message === 'No tienes suficiente cantidad de este item para vender.') {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message },
      };
    }

    console.error('[sellItemsAction] Error:', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Ocurrio un error inesperado al realizar la venta.' },
    };
  }
}

