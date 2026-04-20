'use server';

import 'server-only';

import { revalidatePath } from 'next/cache';

import { auth } from '@/server/auth/auth';
import {
  PurchaseUpgradeInput,
  PurchaseUpgradeInputSchema,
  StartUpgradeResearchInput,
  StartUpgradeResearchInputSchema,
} from '@/lib/validators/upgrades.validators';
import { UpgradeTreeService } from '@/server/services/upgrade-tree.service';
import { guardMutationCategory } from '@/server/services/mutation-guard.service';
import { DomainError } from '@/server/domain/inventory/inventory.service';
import {
  ActionResult,
  CancelUpgradeResearchResultDTO,
  StartUpgradeResearchResultDTO,
} from '@/types/dto.types';

function revalidateUpgradeRelatedViews() {
  revalidatePath('/upgrades');
  revalidatePath('/dashboard');
  revalidatePath('/crafting');
  revalidatePath('/market');
}

export async function startUpgradeResearchAction(
  input: StartUpgradeResearchInput,
): Promise<ActionResult<StartUpgradeResearchResultDTO>> {
  try {
    const parsedInput = StartUpgradeResearchInputSchema.parse(input);
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuario no autenticado.' },
      };
    }

    const mutationGuard = guardMutationCategory('upgrade-achievement-claims');
    if (mutationGuard.blocked) {
      return {
        success: false,
        error: mutationGuard.error,
      };
    }

    const data = await UpgradeTreeService.startResearch(userId, parsedInput.nodeId);

    revalidateUpgradeRelatedViews();

    return {
      success: true,
      data,
    };
  } catch (error) {
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

    console.error('[startUpgradeResearchAction] Unexpected error:', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno al iniciar la investigación.' },
    };
  }
}

export async function cancelUpgradeResearchAction(): Promise<ActionResult<CancelUpgradeResearchResultDTO>> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuario no autenticado.' },
      };
    }

    const mutationGuard = guardMutationCategory('upgrade-achievement-claims');
    if (mutationGuard.blocked) {
      return {
        success: false,
        error: mutationGuard.error,
      };
    }

    const data = await UpgradeTreeService.cancelActiveResearch(userId);

    revalidateUpgradeRelatedViews();

    return {
      success: true,
      data,
    };
  } catch (error) {
    if (error instanceof DomainError) {
      return {
        success: false,
        error: { code: error.code as any, message: error.message },
      };
    }

    console.error('[cancelUpgradeResearchAction] Unexpected error:', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno al cancelar investigación.' },
    };
  }
}

/**
 * Backward compatibility wrapper for legacy UI/tests.
 * Maps old payload shape to the new research action.
 */
export async function purchaseUpgradeAction(
  input: PurchaseUpgradeInput,
): Promise<ActionResult<StartUpgradeResearchResultDTO>> {
  const parsedInput = PurchaseUpgradeInputSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Datos de entrada inválidos.' },
    };
  }

  return startUpgradeResearchAction({ nodeId: parsedInput.data.upgradeId });
}

