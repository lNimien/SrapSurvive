'use server';

import { auth } from '../auth/auth';
import { db } from '../db/client';
import { revalidatePath } from 'next/cache';
import { EquipItemSchema, UnequipItemSchema, EquipItemInput, UnequipItemInput } from '../../lib/validators/inventory.validators';
import { InventoryService, DomainError } from '../domain/inventory/inventory.service';
import { RunRepository } from '../repositories/run.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { ActionResult, EquipmentDTO } from '../../types/dto.types';
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
