'use server';

import 'server-only';

import { revalidatePath } from 'next/cache';

import { auth } from '@/server/auth/auth';
import { isAdminUser } from '@/server/auth/admin';
import { getActiveMutationKillSwitches } from '@/server/services/mutation-guard.service';
import { EconomyObservabilityService } from '@/server/services/economy-observability.service';
import {
  ApplyMutatorSuggestionInput,
  ApplyMutatorSuggestionInputSchema,
  RollbackMutatorSuggestionInput,
  RollbackMutatorSuggestionInputSchema,
  SetMutatorTuningCapsInput,
  SetMutatorTuningCapsInputSchema,
} from '@/lib/validators/ops.validators';
import {
  ActionResult,
  ApplyMutatorBalanceSuggestionResultDTO,
  MutatorAdjustmentProfileDTO,
  MutatorTuningCapsDTO,
} from '@/types/dto.types';
import { MutatorTuningService, NEUTRAL_MUTATOR_PROFILE, sanitizeMutatorAdjustmentProfile } from '@/server/services/mutator-tuning.service';

function deriveAfterProfile(
  actionType: 'buff_difficulty' | 'nerf_rewards' | 'hold',
  suggestedDeltaPercent: number,
): MutatorAdjustmentProfileDTO {
  if (actionType === 'buff_difficulty') {
    return {
      rewardDeltaPercent: 0,
      dangerPressureDeltaPercent: suggestedDeltaPercent,
    };
  }

  if (actionType === 'nerf_rewards') {
    return {
      rewardDeltaPercent: suggestedDeltaPercent,
      dangerPressureDeltaPercent: 0,
    };
  }

  return {
    rewardDeltaPercent: 0,
    dangerPressureDeltaPercent: 0,
  };
}

export async function applyMutatorSuggestionAction(
  input: ApplyMutatorSuggestionInput,
): Promise<ActionResult<ApplyMutatorBalanceSuggestionResultDTO>> {
  try {
    const parsed = ApplyMutatorSuggestionInputSchema.parse(input);
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuario no autenticado.' },
      };
    }

    if (!isAdminUser(userId)) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Acción restringida a admins.' },
      };
    }

    const hasActiveIncident = getActiveMutationKillSwitches().some((switchState) => switchState.active);
    const telemetry = await EconomyObservabilityService.getEconomyTelemetry({ hasActiveIncident });

    const suggestion = telemetry.runMutatorActionPack.suggestions.find((candidate) => (
      candidate.mutatorId === parsed.mutatorId
      && candidate.runMode === parsed.runMode
      && candidate.actionType === parsed.actionType
    ));

    if (!suggestion) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Sugerencia no encontrada en action pack vigente.' },
      };
    }

    const beforeProfile = await MutatorTuningService.getActiveProfile(suggestion.mutatorId, suggestion.runMode);
    const afterProfile = sanitizeMutatorAdjustmentProfile(
      deriveAfterProfile(suggestion.actionType, suggestion.suggestedDeltaPercent),
    );

    if (suggestion.applicability === 'BLOCKED') {
      return {
        success: false,
        error: {
          code: 'FEATURE_DISABLED',
          message: 'Safety gate bloqueó la aplicación de esta sugerencia.',
          details: {
            blockedReasons: suggestion.blockedReasons,
          },
        },
      };
    }

    if (parsed.dryRun) {
      return {
        success: true,
        data: {
          applied: false,
          dryRun: true,
          mutatorId: suggestion.mutatorId,
          runMode: suggestion.runMode,
          actionType: suggestion.actionType,
          suggestedDeltaPercent: suggestion.suggestedDeltaPercent,
          beforeProfile,
          afterProfile,
          blockedReasons: [],
        },
      };
    }

    await MutatorTuningService.applyAdjustment({
      mutatorId: suggestion.mutatorId,
      runMode: suggestion.runMode,
      actionType: suggestion.actionType,
      suggestedDeltaPercent: suggestion.suggestedDeltaPercent,
      beforeProfile,
      afterProfile,
      appliedByUserId: userId,
      sourceGeneratedAt: telemetry.runMutatorActionPack.generatedAt,
    });

    revalidatePath('/ops');

    return {
      success: true,
      data: {
        applied: true,
        dryRun: false,
        mutatorId: suggestion.mutatorId,
        runMode: suggestion.runMode,
        actionType: suggestion.actionType,
        suggestedDeltaPercent: suggestion.suggestedDeltaPercent,
        beforeProfile,
        afterProfile,
        blockedReasons: [],
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Entrada inválida.' },
      };
    }

    console.error('[applyMutatorSuggestionAction] Unexpected error:', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno al aplicar sugerencia de mutador.' },
    };
  }
}

export async function rollbackMutatorSuggestionAction(
  input: RollbackMutatorSuggestionInput,
): Promise<ActionResult<ApplyMutatorBalanceSuggestionResultDTO>> {
  try {
    const parsed = RollbackMutatorSuggestionInputSchema.parse(input);
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId || !isAdminUser(userId)) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Acción restringida a admins.' },
      };
    }

    const beforeProfile = await MutatorTuningService.getActiveProfile(parsed.mutatorId, parsed.runMode);
    const afterProfile: MutatorAdjustmentProfileDTO = NEUTRAL_MUTATOR_PROFILE;

    await MutatorTuningService.applyAdjustment({
      mutatorId: parsed.mutatorId,
      runMode: parsed.runMode,
      actionType: 'hold',
      suggestedDeltaPercent: 0,
      beforeProfile,
      afterProfile,
      appliedByUserId: userId,
    });

    revalidatePath('/ops');

    return {
      success: true,
      data: {
        applied: true,
        dryRun: false,
        mutatorId: parsed.mutatorId,
        runMode: parsed.runMode,
        actionType: 'hold',
        suggestedDeltaPercent: 0,
        beforeProfile,
        afterProfile,
        blockedReasons: [],
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Entrada inválida.' },
      };
    }

    console.error('[rollbackMutatorSuggestionAction] Unexpected error:', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno al revertir ajuste de mutador.' },
    };
  }
}

export async function setMutatorTuningCapsAction(
  input: SetMutatorTuningCapsInput,
): Promise<ActionResult<MutatorTuningCapsDTO>> {
  try {
    const parsed = SetMutatorTuningCapsInputSchema.parse(input);
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId || !isAdminUser(userId)) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Acción restringida a admins.' },
      };
    }

    const caps = await MutatorTuningService.upsertPolicyCaps(
      parsed.mutatorId,
      parsed.runMode,
      {
        maxAbsRewardDeltaPercent: parsed.maxAbsRewardDeltaPercent,
        maxAbsDangerDeltaPercent: parsed.maxAbsDangerDeltaPercent,
      },
      userId,
    );

    revalidatePath('/ops');

    return {
      success: true,
      data: {
        mutatorId: parsed.mutatorId,
        runMode: parsed.runMode,
        maxAbsRewardDeltaPercent: caps.maxAbsRewardDeltaPercent,
        maxAbsDangerDeltaPercent: caps.maxAbsDangerDeltaPercent,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Entrada inválida.' },
      };
    }

    console.error('[setMutatorTuningCapsAction] Unexpected error:', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno al actualizar caps de mutador.' },
    };
  }
}
