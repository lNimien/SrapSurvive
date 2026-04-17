import { z } from 'zod';

export const SellItemsSchema = z.object({
  itemDefinitionId: z.string().min(1, 'El ID del ítem es requerido.'),
  amountToSell: z.number().int().min(1, 'La cantidad debe ser al menos 1.'),
});

export type SellItemsInput = z.infer<typeof SellItemsSchema>;
