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
