import 'server-only';
import { db } from '../db/client';
import { CraftingCalculator } from '../domain/inventory/crafting.calculator';
import { DomainError } from '../domain/inventory/inventory.service';
import { ITEM_CATALOG } from '../../config/game.config';

export const CraftingService = {
  /**
   * Main crafting logic inside a transaction.
   */
  async craftItem(userId: string, recipeId: string) {
    const now = new Date();

    return await db.$transaction(async (tx) => {
      // 1. Check for active run
      const activeRun = await tx.activeRun.findUnique({
        where: { userId }
      });
      if (activeRun) {
        throw new DomainError('RUN_ALREADY_ACTIVE', 'No puedes fabricar mientras estás en una expedición.');
      }

      // 2. Validate recipe
      const recipe = CraftingCalculator.getRecipe(recipeId);
      if (!recipe) {
        throw new DomainError('NOT_FOUND', 'Receta no encontrada.');
      }

      // 3. Check resources
      const [inventory, latestLedger, progression] = await Promise.all([
        tx.inventoryItem.findMany({ where: { userId } }),
        tx.currencyLedger.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        }),
        tx.userProgression.findUnique({
          where: { userId },
          select: { currentLevel: true },
        }),
      ]);

      const playerLevel = progression?.currentLevel ?? 1;
      const lockReason = CraftingCalculator.getRecipeLockReason(recipe, playerLevel);
      if (lockReason) {
        throw new DomainError('VALIDATION_ERROR', lockReason);
      }

      const currentBalance = latestLedger?.balanceAfter || 0;
      const { success, hasCC, missingMaterials } = CraftingCalculator.canAfford(recipe, inventory, currentBalance);

      if (!success) {
        if (!hasCC) throw new DomainError('INSUFFICIENT_FUNDS', `Créditos insuficientes. Necesitas ${recipe.costCC} CC.`);
        throw new DomainError('VALIDATION_ERROR', `Faltan materiales: ${missingMaterials.map(m => m.itemDefId).join(', ')}`);
      }

      // 4. Consume Credits
      await tx.currencyLedger.create({
        data: {
          userId,
          amount: -recipe.costCC,
          balanceAfter: currentBalance - recipe.costCC,
          entryType: 'PURCHASE',
          referenceId: recipe.id
        }
      });

      // 5. Consume Materials
      for (const req of recipe.requiredMaterials) {
        const inv = inventory.find(i => i.itemDefinitionId === req.itemDefId);
        if (!inv) continue; // Should not happen due to check above

        if (inv.quantity === req.quantity) {
          await tx.inventoryItem.delete({ where: { id: inv.id } });
        } else {
          await tx.inventoryItem.update({
            where: { id: inv.id },
            data: { quantity: { decrement: req.quantity } }
          });
        }
      }

      // 6. Grant Result Item
      const resultDef = ITEM_CATALOG.find(i => i.id === recipe.resultItemDefId);
      if (!resultDef) throw new DomainError('NOT_FOUND', 'El objeto resultante no existe en el catálogo.');

      const existingResult = await tx.inventoryItem.findUnique({
        where: { userId_itemDefinitionId: { userId, itemDefinitionId: resultDef.id } }
      });

      let craftResult;
      if (existingResult && !resultDef.stackable) {
        throw new DomainError(
          'VALIDATION_ERROR',
          `Ya posees ${resultDef.displayName}. No se puede fabricar un duplicado de este objeto.`,
        );
      }

      if (existingResult) {
        craftResult = await tx.inventoryItem.update({
          where: { id: existingResult.id },
          data: { quantity: { increment: 1 }, acquiredAt: now }
        });
      } else {
        craftResult = await tx.inventoryItem.create({
          data: {
            userId,
            itemDefinitionId: resultDef.id,
            quantity: 1,
            acquiredAt: now
          }
        });
      }

      // 7. Audit Log
      await tx.auditLog.create({
        data: {
            userId,
            action: 'inventory.craft',
            payload: { recipeId, resultItemDefinitionId: resultDef.id, costCC: recipe.costCC }
        }
      });

      return craftResult;
    });
  }
};
