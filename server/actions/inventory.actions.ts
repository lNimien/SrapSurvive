'use server';

import 'server-only';

import { auth } from '../auth/auth';
import { db } from '../db/client';
import { revalidatePath } from 'next/cache';
import {
  EquipItemSchema,
  UnequipItemSchema,
  EquipItemInput,
  UnequipItemInput,
  CraftItemSchema,
  CraftItemInput,
  SalvageItemSchema,
  SalvageItemInput,
} from '../../lib/validators/inventory.validators';
import { InventoryService, DomainError } from '../domain/inventory/inventory.service';
import { RunRepository } from '../repositories/run.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { EconomyRepository } from '../repositories/economy.repository';
import { ActionResult, EquipmentDTO, RecipeDTO } from '../../types/dto.types';
import { CraftingService } from '../services/crafting.service';
import { SalvageService } from '../services/salvage.service';
import { guardMutationCategory } from '../services/mutation-guard.service';
import { CRAFTING_RECIPES, ITEM_CATALOG } from '../../config/game.config';
import { Prisma } from '@prisma/client';

async function verifyActionPreconditions() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new DomainError('UNAUTHORIZED', 'Usuario no autenticado.');
  }

  // Domain rule: no equipment changes while a run is active
  const activeRun = await RunRepository.findActiveRun(userId);
  if (activeRun !== null && activeRun.status === 'RUNNING') {
    throw new DomainError('RUN_ALREADY_ACTIVE', 'No puedes alterar tu equipo mientras estás en una expedición.');
  }

  return userId;
}

function handleActionError(error: unknown): ActionResult<any> {
  if (error instanceof DomainError) {
    return {
      success: false,
      error: { code: error.code as any, message: error.message },
    };
  }
  
  if (error instanceof Error && error.name === 'ZodError') {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Datos de entrada inválidos.' },
    };
  }

  console.error('[Inventory Actions] Unexpected error:', error);
  return {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' },
  };
}

export async function equipItemAction(input: EquipItemInput): Promise<ActionResult<void>> {
  try {
    const parsed = EquipItemSchema.parse(input);
    const userId = await verifyActionPreconditions();

    if (!InventoryService.validateEquipType(parsed.itemDefinitionId, parsed.slot)) {
      throw new DomainError('VALIDATION_ERROR', 'Este ítem no puede equiparse en ese slot.');
    }

    // Check if the user actually owns the item and has quantity > 0
    const itemOwned = await db.inventoryItem.findFirst({
      where: {
        userId,
        itemDefinitionId: parsed.itemDefinitionId,
        quantity: { gt: 0 },
      },
    });

    if (!itemOwned) {
      throw new DomainError('VALIDATION_ERROR', 'No posees este ítem en tu inventario.');
    }

    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // Upsert the specific slot (EquipmentSlot_ mapped to EquipmentSlot in schema)
      await tx.equipmentSlot_.upsert({
        where: {
          userId_slot: { userId, slot: parsed.slot },
        },
        update: {
          itemDefinitionId: parsed.itemDefinitionId,
          equippedAt: new Date(),
        },
        create: {
          userId,
          slot: parsed.slot,
          itemDefinitionId: parsed.itemDefinitionId,
          equippedAt: new Date(),
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'inventory.equip',
          payload: { slot: parsed.slot, itemDefinitionId: parsed.itemDefinitionId },
        },
      });
    });

    revalidatePath('/inventory');
    revalidatePath('/dashboard');

    return { success: true, data: undefined };

  } catch (error) {
    return handleActionError(error);
  }
}

export async function unequipItemAction(input: UnequipItemInput): Promise<ActionResult<void>> {
  try {
    const parsed = UnequipItemSchema.parse(input);
    const userId = await verifyActionPreconditions();

    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // Clear the slot
      await tx.equipmentSlot_.upsert({
        where: {
          userId_slot: { userId, slot: parsed.slot },
        },
        update: {
          itemDefinitionId: null,
          equippedAt: null,
        },
        create: {
          userId,
          slot: parsed.slot,
          itemDefinitionId: null,
          equippedAt: null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'inventory.unequip',
          payload: { slot: parsed.slot },
        },
      });
    });

    revalidatePath('/inventory');
    revalidatePath('/dashboard');

    return { success: true, data: undefined };

  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Returns available recipes with current eligibility for the user
 */
export async function getRecipesAction(): Promise<ActionResult<RecipeDTO[]>> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return { success: true, data: [] }; // No recipes for guest

    const [inventory, balance] = await Promise.all([
      InventoryRepository.getInventoryByUser(userId),
      EconomyRepository.getCurrentBalance(userId)
    ]);

    const recipeDTOs: RecipeDTO[] = CRAFTING_RECIPES.map(recipe => {
      const resultDef = ITEM_CATALOG.find(i => i.id === recipe.resultItemDefId)!;
      
      const ingredients = recipe.requiredMaterials.map(req => {
        const inv = inventory.find(i => i.itemDefinitionId === req.itemDefId);
        const def = ITEM_CATALOG.find(i => i.id === req.itemDefId)!;
        
        return {
          itemDefId: req.itemDefId,
          displayName: def.displayName,
          iconKey: def.iconKey,
          rarity: def.rarity as any,
          requiredQuantity: req.quantity,
          currentQuantity: inv?.quantity || 0
        };
      });

      const canAffordMaterials = ingredients.every(i => i.currentQuantity >= i.requiredQuantity);
      const canAffordCC = balance >= recipe.costCC;

      return {
        id: recipe.id,
        resultItem: {
          id: resultDef.id,
          displayName: resultDef.displayName,
          description: resultDef.description,
          rarity: resultDef.rarity as any,
          iconKey: resultDef.iconKey,
          equipmentSlot: resultDef.equipmentSlot,
          configOptions: resultDef.configOptions
        },
        ingredients,
        costCC: recipe.costCC,
        canAffordCC,
        canAffordMaterials
      };
    });

    return { success: true, data: recipeDTOs };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Crafts an item using a recipe
 */
export async function craftItemAction(input: CraftItemInput): Promise<ActionResult<{ success: boolean }>> {
  try {
    const parsed = CraftItemSchema.parse(input);
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new DomainError('UNAUTHORIZED', 'Usuario no autenticado.');

    const mutationGuard = guardMutationCategory('crafting');
    if (mutationGuard.blocked) {
      return {
        success: false,
        error: mutationGuard.error,
      };
    }

    await CraftingService.craftItem(userId, parsed.recipeId);

    revalidatePath('/inventory');
    revalidatePath('/dashboard');
    revalidatePath('/crafting');

    return { success: true, data: { success: true } };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function salvageItemAction(
  input: SalvageItemInput,
): Promise<ActionResult<{ creditsEarned: number; newBalance: number }>> {
  try {
    const parsed = SalvageItemSchema.parse(input);
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      throw new DomainError('UNAUTHORIZED', 'Usuario no autenticado.');
    }

    const mutationGuard = guardMutationCategory('crafting');
    if (mutationGuard.blocked) {
      return {
        success: false,
        error: mutationGuard.error,
      };
    }

    const salvageResult = await SalvageService.salvageItem(
      userId,
      parsed.itemDefinitionId,
      parsed.quantity,
    );

    revalidatePath('/inventory');
    revalidatePath('/dashboard');
    revalidatePath('/market');

    return {
      success: true,
      data: salvageResult,
    };
  } catch (error) {
    return handleActionError(error);
  }
}
