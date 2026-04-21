import { ItemRarityDTO } from '@/types/dto.types';

export type EquipmentSlotKey = 'HEAD' | 'BODY' | 'HANDS' | 'TOOL_PRIMARY' | 'TOOL_SECONDARY' | 'BACKPACK';

export type EquipmentFamily = 'SCOUT' | 'BULWARK' | 'SALVAGER' | 'UTILITY' | 'HAULER';

export interface BuildEffectBonuses {
  lootMultiplierBonus: number;
  currencyMultiplierBonus: number;
  xpMultiplierBonus: number;
  dangerResistanceBonus: number;
  dangerLootBonusBonus: number;
  catastropheThresholdBonus: number;
}

export interface BuildSynergyCondition {
  families?: Partial<Record<EquipmentFamily, number>>;
  requiredSlots?: EquipmentSlotKey[];
  minimumRarityCounts?: Partial<Record<ItemRarityDTO, number>>;
}

export interface BuildSynergyDefinition {
  id: string;
  name: string;
  description: string;
  priority: number;
  isArchetype?: boolean;
  conditions: BuildSynergyCondition;
  effects: Partial<BuildEffectBonuses>;
}

export const BUILD_EFFECT_BONUS_CAPS: BuildEffectBonuses = {
  lootMultiplierBonus: 0.4,
  currencyMultiplierBonus: 0.35,
  xpMultiplierBonus: 0.35,
  dangerResistanceBonus: 0.2,
  dangerLootBonusBonus: 0.3,
  catastropheThresholdBonus: 0.04,
};

export const ITEM_FAMILY_BY_ID: Record<string, EquipmentFamily> = {
  basic_work_helmet: 'SCOUT',
  reinforced_helmet: 'BULWARK',
  helmet_explorer_sensor: 'SCOUT',
  helmet_chronoguide_array: 'SCOUT',
  helmet_hazard_predictor: 'SCOUT',

  basic_work_suit: 'BULWARK',
  light_armor_suit: 'BULWARK',
  suit_voidharden_shell: 'BULWARK',
  suit_reactive_bulkframe: 'BULWARK',

  industrial_work_gloves: 'SALVAGER',
  gloves_flux_stabilizer: 'SALVAGER',

  portable_thermal_cutter: 'SALVAGER',
  tool_nanofiber_precision: 'SALVAGER',
  tool_singularity_harvester: 'SALVAGER',
  tool_resonance_scanner: 'UTILITY',

  extended_cargo_backpack: 'HAULER',
  backpack_advanced_expedition: 'HAULER',
  backpack_event_horizon: 'HAULER',
};

export const BUILD_SYNERGIES: BuildSynergyDefinition[] = [
  {
    id: 'volatile_signal',
    name: 'Señal Volátil',
    description: 'Lectura agresiva: más botín y XP, a costa de menor margen de catástrofe.',
    priority: 25,
    conditions: {
      families: { SCOUT: 1, UTILITY: 1 },
      requiredSlots: ['HEAD', 'TOOL_PRIMARY'],
    },
    effects: {
      lootMultiplierBonus: 0.14,
      xpMultiplierBonus: 0.08,
      dangerResistanceBonus: -0.03,
      catastropheThresholdBonus: -0.02,
    },
  },
  {
    id: 'survey_chain',
    name: 'Cadena de Prospección',
    description: 'SCOUT + SALVAGER sincronizados elevan la calidad de extracción.',
    priority: 20,
    conditions: {
      families: { SCOUT: 1, SALVAGER: 2 },
      requiredSlots: ['HEAD', 'TOOL_PRIMARY'],
    },
    effects: {
      lootMultiplierBonus: 0.1,
      xpMultiplierBonus: 0.06,
    },
  },
  {
    id: 'fortress_protocol',
    name: 'Protocolo Fortaleza',
    description: 'BULWARK + HAULER estabilizan casco y carga para runs largas.',
    priority: 30,
    conditions: {
      families: { BULWARK: 1, HAULER: 1 },
      requiredSlots: ['HEAD', 'BODY', 'BACKPACK'],
    },
    effects: {
      dangerResistanceBonus: 0.05,
      catastropheThresholdBonus: 0.015,
      currencyMultiplierBonus: 0.08,
    },
  },
  {
    id: 'void_cartographer',
    name: 'Arquetipo: Cartógrafo del Vacío',
    description: 'Build orientada a control táctico y extracción de alto valor.',
    priority: 100,
    isArchetype: true,
    conditions: {
      requiredSlots: ['HEAD', 'BODY', 'TOOL_PRIMARY', 'BACKPACK'],
      minimumRarityCounts: { EPIC: 2, LEGENDARY: 1 },
      families: { SCOUT: 1, BULWARK: 1, SALVAGER: 1, HAULER: 1 },
    },
    effects: {
      lootMultiplierBonus: 0.12,
      currencyMultiplierBonus: 0.12,
      xpMultiplierBonus: 0.1,
      dangerLootBonusBonus: 0.12,
    },
  },
];
