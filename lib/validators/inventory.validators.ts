import { z } from 'zod';
import { EquipmentSlotKey } from '../../types/game.types';

export const EquipItemSchema = z.object({
  slot: z.nativeEnum(EquipmentSlotKey, {
    error: 'Slot de equipamiento inválido.',
  }),
  itemDefinitionId: z.string().min(1, 'El ID del ítem es requerido.'),
});

export type EquipItemInput = z.infer<typeof EquipItemSchema>;

export const UnequipItemSchema = z.object({
  slot: z.nativeEnum(EquipmentSlotKey, {
    error: 'Slot de equipamiento inválido.',
  }),
});

export type UnequipItemInput = z.infer<typeof UnequipItemSchema>;

export const CraftItemSchema = z.object({
  recipeId: z.string().min(1, 'El ID de la receta es requerido.'),
});

export type CraftItemInput = z.infer<typeof CraftItemSchema>;

export const SalvageItemSchema = z.object({
  itemDefinitionId: z.string().min(1, 'El ID del ítem es requerido.'),
  quantity: z
    .number()
    .int('La cantidad a reciclar debe ser un entero.')
    .min(1, 'La cantidad a reciclar debe ser al menos 1.'),
});

export type SalvageItemInput = z.infer<typeof SalvageItemSchema>;
