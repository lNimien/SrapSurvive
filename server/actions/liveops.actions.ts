'use server';

import 'server-only';

import { revalidatePath } from 'next/cache';

import { auth } from '@/server/auth/auth';
import { guardMutationCategory } from '@/server/services/mutation-guard.service';
import { WEEKLY_CLAIM_NOT_CLAIMABLE_MESSAGE, WeeklyGoalsService } from '@/server/services/weekly-goals.service';
import { ClaimWeeklyDirectiveInput, ClaimWeeklyDirectiveInputSchema } from '@/lib/validators/liveops.validators';
import { DomainError } from '@/server/domain/inventory/inventory.service';
import { ActionResult, WeeklyDirectiveClaimResultDTO } from '@/types/dto.types';

function readClaimAttemptContext(input: ClaimWeeklyDirectiveInput): { directiveKey: string | null; weekStart: string | null } {
  if (!input || typeof input !== 'object') {
    return { directiveKey: null, weekStart: null };
  }

  return {
    directiveKey: typeof input.directiveKey === 'string' ? input.directiveKey : null,
    weekStart: typeof input.weekStart === 'string' ? input.weekStart : null,
  };
}

export async function claimWeeklyDirectiveAction(
  input: ClaimWeeklyDirectiveInput,
): Promise<ActionResult<WeeklyDirectiveClaimResultDTO>> {
  const startedAt = Date.now();
  const claimContext = readClaimAttemptContext(input);

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
      await WeeklyGoalsService.trackClaimAttempt({
        userId,
        directiveKey: parsedInput.directiveKey,
        weekStart: parsedInput.weekStart,
        outcome: 'FEATURE_DISABLED',
        durationMs: Date.now() - startedAt,
        errorCode: mutationGuard.error.code,
        errorMessage: mutationGuard.error.message,
      });

      return {
        success: false,
        error: mutationGuard.error,
      };
    }

    const data = await WeeklyGoalsService.claimWeeklyDirective(userId, parsedInput);

    await WeeklyGoalsService.trackClaimAttempt({
      userId,
      directiveKey: parsedInput.directiveKey,
      weekStart: parsedInput.weekStart,
      outcome: data.alreadyClaimed ? 'ALREADY_CLAIMED' : 'CLAIMED',
      durationMs: Date.now() - startedAt,
    });

    revalidatePath('/dashboard');

    return {
      success: true,
      data,
    };
  } catch (error) {
    if (error instanceof DomainError) {
      await WeeklyGoalsService.trackClaimAttempt({
        directiveKey: claimContext.directiveKey,
        weekStart: claimContext.weekStart,
        outcome:
          error.code === 'VALIDATION_ERROR' && error.message === WEEKLY_CLAIM_NOT_CLAIMABLE_MESSAGE
            ? 'NOT_CLAIMABLE'
            : 'ERROR',
        durationMs: Date.now() - startedAt,
        errorCode: error.code,
        errorMessage: error.message,
      });

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
      await WeeklyGoalsService.trackClaimAttempt({
        directiveKey: claimContext.directiveKey,
        weekStart: claimContext.weekStart,
        outcome: 'ERROR',
        durationMs: Date.now() - startedAt,
        errorCode: 'VALIDATION_ERROR',
        errorMessage: 'Datos de entrada inválidos.',
      });

      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Datos de entrada inválidos.' },
      };
    }

    await WeeklyGoalsService.trackClaimAttempt({
      directiveKey: claimContext.directiveKey,
      weekStart: claimContext.weekStart,
      outcome: 'ERROR',
      durationMs: Date.now() - startedAt,
      errorCode: 'INTERNAL_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    console.error('[claimWeeklyDirectiveAction] Unexpected error:', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno al reclamar directiva semanal.' },
    };
  }
}
