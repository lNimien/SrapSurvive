import { z } from 'zod';

export const ClaimAchievementInputSchema = z.object({
  achievementId: z.string().min(1, 'El ID de logro es requerido.'),
});

export type ClaimAchievementInput = z.infer<typeof ClaimAchievementInputSchema>;
