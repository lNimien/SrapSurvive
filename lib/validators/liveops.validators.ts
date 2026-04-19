import { z } from 'zod';

export const ClaimWeeklyDirectiveInputSchema = z.object({
  directiveKey: z.string().min(1, 'El ID de directiva semanal es requerido.'),
  weekStart: z
    .string()
    .datetime({ offset: true, message: 'weekStart debe ser una fecha ISO válida.' }),
});

export type ClaimWeeklyDirectiveInput = z.infer<typeof ClaimWeeklyDirectiveInputSchema>;
