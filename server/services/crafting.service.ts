import 'server-only';

import { db } from '../db/client';
import { CraftingCalculator } from '../domain/inventory/crafting.calculator';
import { DomainError } from '../domain/inventory/inventory.service';
import { ITEM_CATALOG, ZONE_CONFIGS } from '../../config/game.config';
import { UpgradeTreeService } from './upgrade-tree.service';
import { applyCraftingCostMultiplier } from '../domain/progression/upgrade-tree.logic';

type TxClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

async function ensureItemDefinitionIds(
  tx: TxClient,
  internalKeys: string[],
): Promise<Map<string, string>> {
  const uniqueKeys = [...new Set(internalKeys)];
  const map = new Map<string, string>();

  for (const internalKey of uniqueKeys) {
    const catalogItem = ITEM_CATALOG.find((item) => item.id === internalKey);
    if (!catalogItem) {
      continue;
    }

    const definition = await tx.itemDefinition.upsert({
      where: { internalKey },
      update: {
        displayName: catalogItem.displayName,
        description: catalogItem.description,
        rarity: catalogItem.rarity as any,
        baseValue: catalogItem.baseValue,
        stackable: catalogItem.maxStack > 1,
        maxStack: catalogItem.maxStack,
        iconKey: catalogItem.iconKey,
        metadata: catalogItem.configOptions ?? {},
      },
      create: {
        id: catalogItem.id,
        internalKey: catalogItem.id,
        displayName: catalogItem.displayName,
        description: catalogItem.description,
        rarity: catalogItem.rarity as any,
        baseValue: catalogItem.baseValue,
        stackable: catalogItem.maxStack > 1,
        maxStack: catalogItem.maxStack,
        iconKey: catalogItem.iconKey,
        metadata: catalogItem.configOptions ?? {},
      },
      select: {
        id: true,
        internalKey: true,
      },
    });

    map.set(definition.internalKey, definition.id);
  }

  return map;
}

function getHighestUnlockedZoneLevel(playerLevel: number): number {
  return ZONE_CONFIGS.reduce((highest, zone) => {
    return playerLevel >= zone.minLevel ? Math.max(highest, zone.minLevel) : highest;
  }, 1);
}

export const CraftingService = {
  /**
   * Main crafting logic inside a transaction.
   */
  async craftItem(userId: string, recipeId: string) {
    const now = new Date();
    const runtimeProfile = await UpgradeTreeService.getRuntimeProfile(userId);

    return await db.$transaction(async (tx) => {
      // 1. Check for active run
      const activeRun = await tx.activeRun.findUnique({
        where: { userId },
      });
      if (activeRun) {
        throw new DomainError('RUN_ALREADY_ACTIVE', 'No puedes fabricar mientras estas en una expedicion.');
      }

      // 2. Validate recipe
      const recipe = CraftingCalculator.getRecipe(recipeId);
      if (!recipe) {
        throw new DomainError('NOT_FOUND', 'Receta no encontrada.');
      }
      const effectiveCostCC = applyCraftingCostMultiplier(recipe.costCC, runtimeProfile);

      const definitionIdMap = await ensureItemDefinitionIds(tx, [
        ...recipe.requiredMaterials.map((material) => material.itemDefId),
        recipe.resultItemDefId,
      ]);
      const definitionKeyById = new Map<string, string>();
      for (const [internalKey, definitionId] of definitionIdMap.entries()) {
        definitionKeyById.set(definitionId, internalKey);
      }

      // 3. Check resources
      const [inventory, latestLedger, progression] = await Promise.all([
        tx.inventoryItem.findMany({ where: { userId } }),
        tx.currencyLedger.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        }),
        tx.userProgression.findUnique({
          where: { userId },
          select: { currentLevel: true },
        }),
      ]);

      const playerLevel = progression?.currentLevel ?? 1;
      const lockReason = CraftingCalculator.getRecipeLockReason(recipe, {
        playerLevel,
        highestUnlockedZoneLevel: getHighestUnlockedZoneLevel(playerLevel),
        workshopTierBoost: runtimeProfile.workshopTierBoost,
      });
      if (lockReason) {
        throw new DomainError('VALIDATION_ERROR', lockReason);
      }

      const currentBalance = latestLedger?.balanceAfter || 0;
      const affordabilityInventory = inventory.map((item) => ({
        itemDefinitionId: definitionKeyById.get(item.itemDefinitionId) ?? item.itemDefinitionId,
        quantity: item.quantity,
      }));

      const { success, hasCC, missingMaterials } = CraftingCalculator.canAfford(
        {
          ...recipe,
          costCC: effectiveCostCC,
        },
        affordabilityInventory,
        currentBalance,
      );

      if (!success) {
        if (!hasCC) {
          throw new DomainError('INSUFFICIENT_FUNDS', `Creditos insuficientes. Necesitas ${effectiveCostCC} CC.`);
        }

        throw new DomainError(
          'VALIDATION_ERROR',
          `Faltan materiales: ${missingMaterials.map((material) => material.itemDefId).join(', ')}`,
        );
      }

      // 4. Consume credits
      await tx.currencyLedger.create({
        data: {
          userId,
          amount: -effectiveCostCC,
          balanceAfter: currentBalance - effectiveCostCC,
          entryType: 'PURCHASE',
          referenceId: recipe.id,
        },
      });

      // 5. Consume materials
      for (const req of recipe.requiredMaterials) {
        const itemDefinitionId = definitionIdMap.get(req.itemDefId);
        if (!itemDefinitionId) {
          throw new DomainError('NOT_FOUND', `Definicion de item no encontrada: ${req.itemDefId}`);
        }

        const inv = inventory.find((item) => item.itemDefinitionId === itemDefinitionId);
        if (!inv) continue;

        if (inv.quantity === req.quantity) {
          await tx.inventoryItem.delete({ where: { id: inv.id } });
        } else {
          await tx.inventoryItem.update({
            where: { id: inv.id },
            data: { quantity: { decrement: req.quantity } },
          });
        }
      }

      // 6. Grant result item
      const resultDef = ITEM_CATALOG.find((item) => item.id === recipe.resultItemDefId);
      if (!resultDef) {
        throw new DomainError('NOT_FOUND', 'El objeto resultante no existe en el catalogo.');
      }

      const resultDefinitionId = definitionIdMap.get(resultDef.id);
      if (!resultDefinitionId) {
        throw new DomainError('NOT_FOUND', `Definicion de item no encontrada: ${resultDef.id}`);
      }

      const existingResult = await tx.inventoryItem.findUnique({
        where: { userId_itemDefinitionId: { userId, itemDefinitionId: resultDefinitionId } },
      });

      let craftResult;
      if (existingResult && resultDef.maxStack <= 1) {
        throw new DomainError(
          'VALIDATION_ERROR',
          `Ya posees ${resultDef.displayName}. No se puede fabricar un duplicado de este objeto.`,
        );
      }

      if (existingResult) {
        craftResult = await tx.inventoryItem.update({
          where: { id: existingResult.id },
          data: { quantity: { increment: 1 }, acquiredAt: now },
        });
      } else {
        craftResult = await tx.inventoryItem.create({
          data: {
            userId,
            itemDefinitionId: resultDefinitionId,
            quantity: 1,
            acquiredAt: now,
          },
        });
      }

      // 7. Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'inventory.craft',
          payload: { recipeId, resultItemDefinitionId: resultDef.id, costCC: effectiveCostCC },
        },
      });

      return craftResult;
    });
  },
};

