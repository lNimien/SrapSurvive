"use server";

import 'server-only';
import { auth } from '../auth/auth';
import { ContractService } from '../services/contract.service';
import { ActionResult } from '../../types/api.types';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { DomainError } from '../domain/inventory/inventory.service';

const DeliverContractSchema = z.object({
  contractId: z.string().cuid(),
  quantity: z.number().int().positive(),
});

export async function deliverContractAction(
  formData: z.infer<typeof DeliverContractSchema>
): Promise<ActionResult<{ message: string }>> {
  try {
    // 1. Authenticate
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Debes iniciar sesión.' } };
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
      return { success: false, error: { code: error.code as any, message: error.message } };
    }
    console.error('[deliverContractAction] Error:', error);
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Error interno al entregar materiales.' } };
  }
}
