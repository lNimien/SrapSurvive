'use server';

import 'server-only';

import { auth } from '../auth/auth';
import { revalidatePath } from 'next/cache';
import { 
  StartRunInputSchema, 
  StartRunInput, 
  RequestExtractionInputSchema, 
  RequestExtractionInput, 
  ResolveAnomalyInputSchema, 
  ResolveAnomalyInput 
} from '../../lib/validators/run.validators';
import { RunResolutionService } from '../services/run-resolution.service';
import { guardMutationCategory } from '../services/mutation-guard.service';
import { DomainError } from '../domain/inventory/inventory.service';
import { ActionResult, RunStartedDTO, ExtractionResultDTO } from '../../types/dto.types';
import { RunMode } from '../../types/game.types';

export async function startRunAction(input: StartRunInput): Promise<ActionResult<RunStartedDTO>> {
  try {
    const parsed = StartRunInputSchema.parse(input);
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuario no autenticado.' },
      };
    }

    const mutationGuard = guardMutationCategory('extraction');
    if (mutationGuard.blocked) {
      return {
        success: false,
        error: mutationGuard.error,
      };
    }

    const data = await RunResolutionService.startRun(userId, parsed.zoneId, parsed.runMode as RunMode);

    revalidatePath('/dashboard');

    return { success: true, data };
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

    console.error('[Run Actions] Unexpected error:', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno o de base de datos.' },
    };
  }
}

export async function requestExtractionAction(input: RequestExtractionInput): Promise<ActionResult<ExtractionResultDTO>> {
  try {
    const parsed = RequestExtractionInputSchema.parse(input);
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuario no autenticado.' },
      };
    }

    const mutationGuard = guardMutationCategory('extraction');
    if (mutationGuard.blocked) {
      return {
        success: false,
        error: mutationGuard.error,
      };
    }

    const data = await RunResolutionService.resolveExtraction(userId, parsed.runId);

    revalidatePath('/dashboard');
    revalidatePath('/inventory');
    revalidatePath('/history');

    return { success: true, data };
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

    console.error('[Run Actions - requestExtractionAction] Unexpected error:', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno conectando a base de datos.' },
    };
  }
}

export async function resolveAnomalyAction(input: ResolveAnomalyInput): Promise<ActionResult<{ message: string }>> {
  try {
    const parsed = ResolveAnomalyInputSchema.parse(input);
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuario no autenticado.' },
      };
    }

    const mutationGuard = guardMutationCategory('extraction');
    if (mutationGuard.blocked) {
      return {
        success: false,
        error: mutationGuard.error,
      };
    }

    const data = await RunResolutionService.resolveAnomaly(userId, parsed.runId, parsed.anomalyId, parsed.decision);

    revalidatePath('/dashboard');

    return { success: true, data };
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

    console.error('[Run Actions - resolveAnomalyAction] Unexpected error:', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno o de base de datos.' },
    };
  }
}
