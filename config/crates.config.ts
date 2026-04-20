import 'server-only';

import { ItemRarityDTO } from '@/types/dto.types';
import { ITEM_CATALOG } from './game.config';

export type CrateVisualTier = 'SCAVENGER' | 'TACTICAL' | 'RELIC';

export interface CrateRewardEntry {
  itemDefinitionId: string;
  weight: number;
  quantityMin: number;
  quantityMax: number;
}

export interface CrateDefinition {
  id: string;
  name: string;
  description: string;
  imagePath: string;
  priceCC: number;
  visualTier: CrateVisualTier;
  available: boolean;
  minLevel?: number;
  rewards: CrateRewardEntry[];
}

export const CRATE_DEFINITIONS: CrateDefinition[] = [
  {
    id: 'crate_scavenger_cache',
    name: 'Scavenger Cache',
    description: 'Caja barata con piezas de campo y probabilidad baja de equipo útil.',
    imagePath: '/assets/icons/ui/crates/scavenger-cache.svg',
    priceCC: 140,
    visualTier: 'SCAVENGER',
    available: true,
    minLevel: 1,
    rewards: [
      { itemDefinitionId: 'scrap_metal', weight: 32, quantityMin: 18, quantityMax: 34 },
      { itemDefinitionId: 'energy_cell', weight: 20, quantityMin: 12, quantityMax: 24 },
      { itemDefinitionId: 'copper_wire', weight: 14, quantityMin: 8, quantityMax: 18 },
      { itemDefinitionId: 'recycled_component', weight: 12, quantityMin: 4, quantityMax: 10 },
      { itemDefinitionId: 'armor_fiber', weight: 8, quantityMin: 3, quantityMax: 8 },
      { itemDefinitionId: 'tool_secondary_echo_scanner', weight: 5, quantityMin: 1, quantityMax: 1 },
      { itemDefinitionId: 'gloves_precision_weave', weight: 4, quantityMin: 1, quantityMax: 1 },
      { itemDefinitionId: 'backpack_salvager_frame', weight: 3, quantityMin: 1, quantityMax: 1 },
      { itemDefinitionId: 'optic_sensor', weight: 2, quantityMin: 1, quantityMax: 2 },
    ],
  },
  {
    id: 'crate_tactical_locker',
    name: 'Tactical Locker',
    description: 'Paquete intermedio con opciones raras y componentes de alta calidad.',
    imagePath: '/assets/icons/ui/crates/tactical-locker.svg',
    priceCC: 520,
    visualTier: 'TACTICAL',
    available: true,
    minLevel: 4,
    rewards: [
      { itemDefinitionId: 'recycled_component', weight: 22, quantityMin: 8, quantityMax: 16 },
      { itemDefinitionId: 'armor_fiber', weight: 18, quantityMin: 7, quantityMax: 14 },
      { itemDefinitionId: 'optic_sensor', weight: 14, quantityMin: 3, quantityMax: 6 },
      { itemDefinitionId: 'alien_resin', weight: 10, quantityMin: 2, quantityMax: 5 },
      { itemDefinitionId: 'quantum_filament', weight: 8, quantityMin: 2, quantityMax: 4 },
      { itemDefinitionId: 'gloves_quantum_grip', weight: 7, quantityMin: 1, quantityMax: 1 },
      { itemDefinitionId: 'tool_secondary_resonance_anchor', weight: 6, quantityMin: 1, quantityMax: 1 },
      { itemDefinitionId: 'suit_salvage_command', weight: 6, quantityMin: 1, quantityMax: 1 },
      { itemDefinitionId: 'tool_resonance_scanner', weight: 5, quantityMin: 1, quantityMax: 1 },
      { itemDefinitionId: 'plasma_core', weight: 4, quantityMin: 1, quantityMax: 2 },
    ],
  },
  {
    id: 'crate_relic_singularity',
    name: 'Relic Singularity Crate',
    description: 'Contenedor de élite con drop table comprimida para piezas legendarias.',
    imagePath: '/assets/icons/ui/crates/relic-singularity.svg',
    priceCC: 1480,
    visualTier: 'RELIC',
    available: true,
    minLevel: 8,
    rewards: [
      { itemDefinitionId: 'void_alloy', weight: 18, quantityMin: 2, quantityMax: 4 },
      { itemDefinitionId: 'plasma_core', weight: 16, quantityMin: 2, quantityMax: 4 },
      { itemDefinitionId: 'entropy_shard', weight: 12, quantityMin: 1, quantityMax: 2 },
      { itemDefinitionId: 'helmet_chronoguide_array', weight: 9, quantityMin: 1, quantityMax: 1 },
      { itemDefinitionId: 'backpack_event_horizon', weight: 9, quantityMin: 1, quantityMax: 1 },
      { itemDefinitionId: 'tool_singularity_harvester', weight: 8, quantityMin: 1, quantityMax: 1 },
      { itemDefinitionId: 'gloves_event_horizon', weight: 8, quantityMin: 1, quantityMax: 1 },
      { itemDefinitionId: 'tool_secondary_entropic_array', weight: 7, quantityMin: 1, quantityMax: 1 },
      { itemDefinitionId: 'suit_voidharden_shell', weight: 7, quantityMin: 1, quantityMax: 1 },
      { itemDefinitionId: 'extraction_insurance_bundle', weight: 6, quantityMin: 1, quantityMax: 2 },
    ],
  },
];

export const CRATE_BY_ID = CRATE_DEFINITIONS.reduce<Record<string, CrateDefinition>>((acc, crate) => {
  acc[crate.id] = crate;
  return acc;
}, {});

export function getCrateById(crateId: string): CrateDefinition | null {
  return CRATE_BY_ID[crateId] ?? null;
}

export function getRarityFromItemDefinitionId(itemDefinitionId: string): ItemRarityDTO {
  const item = ITEM_CATALOG.find((candidate) => candidate.id === itemDefinitionId);
  return (item?.rarity as ItemRarityDTO | undefined) ?? 'COMMON';
}

