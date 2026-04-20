import { EquipmentDTO } from '@/types/dto.types';

export type EquipmentSlotKey = keyof EquipmentDTO;

export interface EquipmentSlotMeta {
  key: EquipmentSlotKey;
  label: string;
  shortLabel: string;
  hint: string;
}

export const EQUIPMENT_SLOT_LAYOUT: EquipmentSlotMeta[] = [
  {
    key: 'HEAD',
    label: 'Casco',
    shortLabel: 'Cabeza',
    hint: 'Sensores y protección frontal',
  },
  {
    key: 'BODY',
    label: 'Armadura',
    shortLabel: 'Torso',
    hint: 'Protección principal del torso',
  },
  {
    key: 'HANDS',
    label: 'Guantes',
    shortLabel: 'Manos',
    hint: 'Control de precisión y extracción',
  },
  {
    key: 'TOOL_PRIMARY',
    label: 'Herramienta primaria',
    shortLabel: 'Herramienta Primaria',
    hint: 'Herramienta activa de run',
  },
  {
    key: 'TOOL_SECONDARY',
    label: 'Herramienta secundaria',
    shortLabel: 'Herramienta Secundaria',
    hint: 'Soporte técnico de emergencia',
  },
  {
    key: 'BACKPACK',
    label: 'Mochila',
    shortLabel: 'Mochila',
    hint: 'Capacidad y almacenamiento',
  },
];
