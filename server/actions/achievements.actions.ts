'use server';

import 'server-only';

import { revalidatePath } from 'next/cache';

import { auth } from '@/server/auth/auth';
import { ClaimAchievementInput, ClaimAchievementInputSchema } from '@/lib/validators/achievements.validators';
import { AchievementService } from '@/server/services/achievement.service';
import { guardMutationCategory } from '@/server/services/mutation-guard.service';
import { DomainError } from '@/server/domain/inventory/inventory.service';
import { AchievementClaimResultDTO, ActionResult } from '@/types/dto.types';

export async function claimAchievementAction(
  input: ClaimAchievementInput
): Promise<ActionResult<AchievementClaimResultDTO>> {
  try {
    const parsedInput = ClaimAchievementInputSchema.parse(input);
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

    const data = await AchievementService.claimAchievement(userId, parsedInput.achievementId);

    revalidatePath('/dashboard');

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

    console.error('[claimAchievementAction] Unexpected error:', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno al reclamar logro.' },
    };
  }
}
