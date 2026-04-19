import { z } from 'zod';

export const PurchaseUpgradeInputSchema = z.object({
  upgradeId: z.string().min(1, 'El ID de mejora es requerido.'),
});

export type PurchaseUpgradeInput = z.infer<typeof PurchaseUpgradeInputSchema>;
