'use server';

import 'server-only';

import { auth } from '@/server/auth/auth';
import { ActionResult, CrateDTO, CrateOpenResultDTO, ErrorCode } from '@/types/dto.types';
import { CratesService } from '@/server/services/crates.service';
import { DomainError } from '@/server/domain/inventory/inventory.service';
import { OpenCrateInput, OpenCrateSchema } from '@/lib/validators/crates.validators';
import { revalidatePath } from 'next/cache';
import { guardMutationCategory } from '@/server/services/mutation-guard.service';

function mapDomainErrorCode(code: string): ErrorCode {
  const knownCodes: ErrorCode[] = [
    'UNAUTHORIZED',
    'VALIDATION_ERROR',
    'FEATURE_DISABLED',
    'RUN_ALREADY_ACTIVE',
    'RUN_NOT_RUNNING',
    'RUN_ALREADY_RESOLVED',
    'NOT_FOUND',
    'INSUFFICIENT_BALANCE',
    'INSUFFICIENT_FUNDS',
    'EXPIRED',
    'TRANSACTION_FAILED',
    'INTERNAL_ERROR',
  ];

  return knownCodes.includes(code as ErrorCode) ? (code as ErrorCode) : 'INTERNAL_ERROR';
}

function toActionError(error: unknown): ActionResult<never> {
  if (error instanceof DomainError) {
    return {
      success: false,
      error: { code: mapDomainErrorCode(error.code), message: error.message },
    };
  }

  if (error instanceof Error && error.name === 'ZodError') {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Datos de entrada inválidos.' },
    };
  }

  console.error('[crates.actions] Unexpected error:', error);
  return {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del sistema de crates.' },
  };
}

export async function getCratesCatalogAction(): Promise<ActionResult<CrateDTO[]>> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuario no autenticado.' } };
    }

    const crates = await CratesService.getCratesCatalog(userId);
    return { success: true, data: crates };
  } catch (error) {
    return toActionError(error);
  }
}

export async function openCrateAction(input: OpenCrateInput): Promise<ActionResult<CrateOpenResultDTO>> {
  try {
    const payload = OpenCrateSchema.parse(input);
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuario no autenticado.' } };
    }

    const mutationGuard = guardMutationCategory('market');
    if (mutationGuard.blocked) {
      return {
        success: false,
        error: mutationGuard.error,
      };
    }

    const result = await CratesService.openCrate(userId, payload.crateId);

    revalidatePath('/crates');
    revalidatePath('/inventory');
    revalidatePath('/dashboard');

    return { success: true, data: result };
  } catch (error) {
    return toActionError(error);
  }
}

