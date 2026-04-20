import { z } from 'zod';

export const StartUpgradeResearchInputSchema = z.object({
  nodeId: z.string().min(1, 'El ID del nodo es requerido.'),
});

export type StartUpgradeResearchInput = z.infer<typeof StartUpgradeResearchInputSchema>;

// Backward compatibility alias with previous payload naming.
export const PurchaseUpgradeInputSchema = z.object({
  upgradeId: z.string().min(1, 'El ID de mejora es requerido.'),
});

export type PurchaseUpgradeInput = z.infer<typeof PurchaseUpgradeInputSchema>;

