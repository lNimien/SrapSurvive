import { z } from 'zod';

export const OpenCrateSchema = z.object({
  crateId: z.string().min(1, 'El crateId es requerido.'),
});

export type OpenCrateInput = z.infer<typeof OpenCrateSchema>;

