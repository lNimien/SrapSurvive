import { z } from 'zod';

export const StartRunInputSchema = z.object({
  zoneId: z.string().min(1, 'El zoneId es requerido.').refine(val => val === 'shipyard_cemetery', {
    message: 'Zona inválida. En la versión actual solo puedes visitar el Cementerio de Naves.',
  }),
});

export type StartRunInput = z.infer<typeof StartRunInputSchema>;

export const RequestExtractionInputSchema = z.object({
  runId: z.string().min(1, 'El runId es requerido para extraer.'),
});

export type RequestExtractionInput = z.infer<typeof RequestExtractionInputSchema>;
