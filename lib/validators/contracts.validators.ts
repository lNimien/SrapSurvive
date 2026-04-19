import { z } from 'zod';

export const DeliverContractSchema = z.object({
  contractId: z.string().cuid(),
  quantity: z.number().int().positive(),
});

export type DeliverContractInput = z.infer<typeof DeliverContractSchema>;

export const RefreshContractsSchema = z.object({
  requestId: z
    .string()
    .min(8, 'requestId inválido.')
    .max(120, 'requestId inválido.'),
});

export type RefreshContractsInput = z.infer<typeof RefreshContractsSchema>;
