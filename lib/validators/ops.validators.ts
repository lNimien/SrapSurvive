import { z } from 'zod';

export const ApplyMutatorSuggestionInputSchema = z.object({
  mutatorId: z.string().min(1),
  runMode: z.enum(['SAFE', 'HARD']),
  actionType: z.enum(['buff_difficulty', 'nerf_rewards', 'hold']),
  dryRun: z.boolean().default(false),
});

export type ApplyMutatorSuggestionInput = z.infer<typeof ApplyMutatorSuggestionInputSchema>;

export const RollbackMutatorSuggestionInputSchema = z.object({
  mutatorId: z.string().min(1),
  runMode: z.enum(['SAFE', 'HARD']),
});

export type RollbackMutatorSuggestionInput = z.infer<typeof RollbackMutatorSuggestionInputSchema>;

export const SetMutatorTuningCapsInputSchema = z.object({
  mutatorId: z.string().min(1),
  runMode: z.enum(['SAFE', 'HARD']),
  maxAbsRewardDeltaPercent: z.number().int().min(1).max(50),
  maxAbsDangerDeltaPercent: z.number().int().min(1).max(50),
});

export type SetMutatorTuningCapsInput = z.infer<typeof SetMutatorTuningCapsInputSchema>;
