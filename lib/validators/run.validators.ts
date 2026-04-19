import { z } from 'zod';
import { AVAILABLE_ZONE_IDS, getZoneConfigById, isZoneUnlockedForLevel } from '../../config/game.config';

const AVAILABLE_ZONE_ID_SET = new Set<string>(AVAILABLE_ZONE_IDS as readonly string[]);

export const StartRunInputSchema = z.object({
  zoneId: z.string().min(1, 'El zoneId es requerido.').refine((val) => AVAILABLE_ZONE_ID_SET.has(val), {
    message: 'Zona inválida. Selecciona una zona disponible.',
  }),
  runMode: z.enum(['SAFE', 'HARD']).default('SAFE'),
});

export function getStartRunInputSchemaForLevel(playerLevel: number) {
  return StartRunInputSchema.superRefine((value, ctx) => {
    if (isZoneUnlockedForLevel(value.zoneId, playerLevel)) {
      return;
    }

    const zone = getZoneConfigById(value.zoneId);
    const requiredLevel = zone?.minLevel ?? 1;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['zoneId'],
      message: `Zona bloqueada. Requiere nivel ${requiredLevel}.`,
    });
  });
}

export type StartRunInput = z.input<typeof StartRunInputSchema>;

export const RequestExtractionInputSchema = z.object({
  runId: z.string().min(1, 'El runId es requerido para extraer.'),
});

export type RequestExtractionInput = z.infer<typeof RequestExtractionInputSchema>;

export const ResolveAnomalyInputSchema = z.object({
  runId: z.string().min(1),
  anomalyId: z.string().min(1),
  decision: z.enum(['IGNORE', 'INVESTIGATE']),
});

export type ResolveAnomalyInput = z.infer<typeof ResolveAnomalyInputSchema>;
