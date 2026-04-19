"use server";

import 'server-only';
import { auth } from '../auth/auth';
import { ContractService } from '../services/contract.service';
import { ActionResult, ErrorCode } from '../../types/dto.types';
import { revalidatePath } from 'next/cache';
import { DomainError } from '../domain/inventory/inventory.service';
import {
  DeliverContractInput,
  DeliverContractSchema,
  RefreshContractsInput,
  RefreshContractsSchema,
} from '@/lib/validators/contracts.validators';
import { guardMutationCategory } from '@/server/services/mutation-guard.service';

export async function deliverContractAction(
  formData: DeliverContractInput
): Promise<ActionResult<{ message: string }>> {
  try {
    // 1. Authenticate
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Debes iniciar sesión.' } };
    }

    const mutationGuard = guardMutationCategory('contracts');
    if (mutationGuard.blocked) {
      return {
        success: false,
        error: mutationGuard.error,
      };
    }

    // 2. Validate input
    const validated = DeliverContractSchema.safeParse(formData);
    if (!validated.success) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos de entrega inválidos.' } };
    }

    // 3. Call service
    await ContractService.deliverMaterial(userId, validated.data.contractId, validated.data.quantity);

    // 4. Revalidate
    revalidatePath('/dashboard');
    revalidatePath('/inventory');

    return { success: true, data: { message: 'Materiales entregados correctamente.' } };

  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: { code: error.code as ErrorCode, message: error.message } };
    }
    console.error('[deliverContractAction] Error:', error);
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Error interno al entregar materiales.' } };
  }
}

export async function refreshContractsAction(
  formData: RefreshContractsInput
): Promise<ActionResult<{ message: string }>> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Debes iniciar sesión.' },
      };
    }

    const mutationGuard = guardMutationCategory('contracts');
    if (mutationGuard.blocked) {
      return {
        success: false,
        error: mutationGuard.error,
      };
    }

    const validated = RefreshContractsSchema.safeParse(formData);
    if (!validated.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Datos de refresco inválidos.' },
      };
    }

    const refreshedContracts = await ContractService.refreshContracts(userId, validated.data.requestId);

    revalidatePath('/dashboard');

    return {
      success: true,
      data: {
        message: `Contratos actualizados (${refreshedContracts.length} disponibles).`,
      },
    };
  } catch (error) {
    if (error instanceof DomainError) {
      return {
        success: false,
        error: { code: error.code as ErrorCode, message: error.message },
      };
    }

    console.error('[refreshContractsAction] Error:', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error interno al refrescar contratos.',
      },
    };
  }
}
