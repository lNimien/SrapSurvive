'use server';

import 'server-only';

import { revalidatePath } from 'next/cache';

import { auth } from '@/server/auth/auth';
import { guardMutationCategory } from '@/server/services/mutation-guard.service';
import { WeeklyGoalsService } from '@/server/services/weekly-goals.service';
import { ClaimWeeklyDirectiveInput, ClaimWeeklyDirectiveInputSchema } from '@/lib/validators/liveops.validators';
import { DomainError } from '@/server/domain/inventory/inventory.service';
import { ActionResult, WeeklyDirectiveClaimResultDTO } from '@/types/dto.types';

export async function claimWeeklyDirectiveAction(
  input: ClaimWeeklyDirectiveInput,
): Promise<ActionResult<WeeklyDirectiveClaimResultDTO>> {
  try {
    const parsedInput = ClaimWeeklyDirectiveInputSchema.parse(input);
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

    const data = await WeeklyGoalsService.claimWeeklyDirective(userId, parsedInput);

    revalidatePath('/dashboard');

    return {
      success: true,
      data,
    };
  } catch (error) {
    if (error instanceof DomainError) {
      return {
        success: false,
        error: {
          code: error.code as
            | 'NOT_FOUND'
            | 'VALIDATION_ERROR'
            | 'UNAUTHORIZED'
            | 'RUN_ALREADY_ACTIVE'
            | 'RUN_NOT_RUNNING'
            | 'RUN_ALREADY_RESOLVED'
            | 'INSUFFICIENT_BALANCE'
            | 'INSUFFICIENT_FUNDS'
            | 'EXPIRED'
            | 'TRANSACTION_FAILED'
            | 'INTERNAL_ERROR'
            | 'FEATURE_DISABLED',
          message: error.message,
        },
      };
    }

    if (error instanceof Error && error.name === 'ZodError') {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Datos de entrada inválidos.' },
      };
    }

    console.error('[claimWeeklyDirectiveAction] Unexpected error:', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno al reclamar directiva semanal.' },
    };
  }
}
