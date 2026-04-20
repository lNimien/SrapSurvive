import { ItemDefinition, EquipmentSlotKey, ItemRarity, ItemCategory, Recipe } from '../types/game.types';

export interface ZoneConfig {
  internalKey: string;
  displayName: string;
  minLevel: number;
  baseRate: number;
  quadraticFactor: number;
  catastropheThreshold: number;
  spikeChance: number;
  spikeMagnitude: number;
  dangerLootBonus: number;
  baseLootPerSecond: Record<string, number>;
  baseCreditsPerMinute: number;
  baseXpPerSecond: number;
}

export const SHIPYARD_CEMETERY_CONFIG = {
  internalKey: 'shipyard_cemetery',
  displayName: 'Cementerio de Naves',
  minLevel: 1,
  baseRate: 0.04,
  quadraticFactor: 0.000004,
  catastropheThreshold: 0.90,
  spikeChance: 0.02,
  spikeMagnitude: 0.05,
  dangerLootBonus: 0.80,
  baseLootPerSecond: {
    scrap_metal: 0.50,
    energy_cell: 0.15,
    recycled_component: 0.08,
    corrupted_crystal: 0.02,
    armor_fiber: 0.05, 
  },
  baseCreditsPerMinute: 45,
  baseXpPerSecond: 3.5,
} as const satisfies ZoneConfig;

export const ORBITAL_DERELICT_CONFIG = {
  internalKey: 'orbital_derelict',
  displayName: 'Derelict Orbital',
  minLevel: 4,
  baseRate: 0.06,
  quadraticFactor: 0.000005,
  catastropheThreshold: 0.92,
  spikeChance: 0.03,
  spikeMagnitude: 0.07,
  dangerLootBonus: 0.95,
  baseLootPerSecond: {
    scrap_metal: 0.35,
    energy_cell: 0.20,
    recycled_component: 0.11,
    corrupted_crystal: 0.04,
    armor_fiber: 0.08,
    alien_resin: 0.015,
    optic_sensor: 0.012,
    plasma_core: 0.0035,
  },
  baseCreditsPerMinute: 62,
  baseXpPerSecond: 4.6,
} as const satisfies ZoneConfig;

export const ABYSSAL_FRACTURE_CONFIG = {
  internalKey: 'abyssal_fracture',
  displayName: 'Fisura Abisal',
  minLevel: 8,
  baseRate: 0.082,
  quadraticFactor: 0.0000075,
  catastropheThreshold: 0.935,
  spikeChance: 0.045,
  spikeMagnitude: 0.09,
  dangerLootBonus: 1.2,
  baseLootPerSecond: {
    scrap_metal: 0.25,
    energy_cell: 0.22,
    recycled_component: 0.14,
    corrupted_crystal: 0.08,
    armor_fiber: 0.09,
    alien_resin: 0.04,
    optic_sensor: 0.03,
    plasma_core: 0.012,
    quantum_filament: 0.01,
    void_alloy: 0.006,
    entropy_shard: 0.0025,
  },
  baseCreditsPerMinute: 88,
  baseXpPerSecond: 6.4,
} as const satisfies ZoneConfig;

export const ZONE_CONFIGS = [
  SHIPYARD_CEMETERY_CONFIG,
  ORBITAL_DERELICT_CONFIG,
  ABYSSAL_FRACTURE_CONFIG,
] as const;

export const ZONE_CONFIG_BY_ID = ZONE_CONFIGS.reduce<Record<string, ZoneConfig>>((acc, zone) => {
  acc[zone.internalKey] = zone;
  return acc;
}, {});

export const AVAILABLE_ZONE_IDS = ZONE_CONFIGS.map((zone) => zone.internalKey);

export function getZoneConfigById(zoneId: string): ZoneConfig | null {
  return ZONE_CONFIG_BY_ID[zoneId] ?? null;
}

export function isRegisteredZone(zoneId: string): boolean {
  return zoneId in ZONE_CONFIG_BY_ID;
}

export function isZoneUnlockedForLevel(zoneId: string, playerLevel: number): boolean {
  const zone = getZoneConfigById(zoneId);
  if (!zone) {
    return false;
  }

  const normalizedLevel = Math.max(1, Math.floor(playerLevel));
  return normalizedLevel >= zone.minLevel;
}

export const ID_EXTRACTION_INSURANCE = 'extraction_insurance';

// Catalogo inicial MVP (18 items)
export const ITEM_CATALOG: ItemDefinition[] = [
  {
    id: ID_EXTRACTION_INSURANCE,
    displayName: "Seguro de Extracción",
    description: "Un contrato digital que garantiza la recuperación del 80% del botín en caso de catástrofe catastrófica.",
    itemType: ItemCategory.CONSUMABLE,
    rarity: ItemRarity.RARE,
    iconKey: "icon_extraction_insurance",
    baseValue: 0, // No se vende de vuelta al mercado
    maxStack: 10,
  },
  // MATERIALES (10 items)
  {
    id: "scrap_metal",
    displayName: "Chatarra Metálica",
    description: "Restos de aleaciones estelares deformadas por el tiempo.",
    itemType: ItemCategory.MATERIAL,
    rarity: ItemRarity.COMMON,
    iconKey: "icon_scrap_metal",
    baseValue: 1,
    maxStack: 9999,
  },
  {
    id: "energy_cell",
    displayName: "Célula de Energía",
    description: "Unidades de almacenamiento descargadas parcialmente.",
    itemType: ItemCategory.MATERIAL,
    rarity: ItemRarity.COMMON,
    iconKey: "icon_energy_cell",
    baseValue: 4,
    maxStack: 9999,
  },
  {
    id: "recycled_component",
    displayName: "Componente Reciclado",
    description: "Placa de circuito desmontada a mano.",
    itemType: ItemCategory.MATERIAL,
    rarity: ItemRarity.UNCOMMON,
    iconKey: "icon_recycled_component",
    baseValue: 12,
    maxStack: 9999,
  },
  {
    id: "corrupted_crystal",
    displayName: "Cristal Corrupto",
    description: "Formaciones cristalinas de origen desconocido.",
    itemType: ItemCategory.MATERIAL,
    rarity: ItemRarity.UNCOMMON,
    iconKey: "icon_corrupted_crystal",
    baseValue: 20,
    maxStack: 9999,
  },
  {
    id: "armor_fiber",
    displayName: "Fibra de Blindaje",
    description: "Tiras de polímero reforzado de antiguas cubiertas.",
    itemType: ItemCategory.MATERIAL,
    rarity: ItemRarity.UNCOMMON,
    iconKey: "icon_armor_fiber",
    baseValue: 10,
    maxStack: 9999,
  },
  {
    id: "copper_wire",
    displayName: "Cableado de Cobre",
    description: "Rollos de cable conductor oxidado.",
    itemType: ItemCategory.MATERIAL,
    rarity: ItemRarity.COMMON,
    iconKey: "icon_copper_wire",
    baseValue: 2,
    maxStack: 9999,
  },
  {
    id: "optic_sensor",
    displayName: "Sensor Óptico Roto",
    description: "Lente estrellada pero el procesador interno sigue intacto.",
    itemType: ItemCategory.MATERIAL,
    rarity: ItemRarity.RARE,
    iconKey: "icon_optic_sensor",
    baseValue: 45,
    maxStack: 999,
  },
  {
    id: "plasma_core",
    displayName: "Núcleo de Plasma Inestable",
    description: "Célula radiactiva de plasma frío. Altamente valiosa.",
    itemType: ItemCategory.MATERIAL,
    rarity: ItemRarity.EPIC,
    iconKey: "icon_plasma_core",
    baseValue: 150,
    maxStack: 99,
  },
  {
    id: "synthetic_lubricant",
    displayName: "Lubricante Sintético",
    description: "Fluido viscoso para maquinaria pesada.",
    itemType: ItemCategory.MATERIAL,
    rarity: ItemRarity.COMMON,
    iconKey: "icon_synthetic_lubricant",
    baseValue: 5,
    maxStack: 9999,
  },
  {
    id: "alien_resin",
    displayName: "Resina Biomecánica",
    description: "Sustancia purpúrea pegada al casco de naves antiguas.",
    itemType: ItemCategory.MATERIAL,
    rarity: ItemRarity.RARE,
    iconKey: "icon_alien_resin",
    baseValue: 60,
    maxStack: 999,
  },
  {
    id: "quantum_filament",
    displayName: "Filamento Cuántico",
    description: "Hebra superconductora extraída de bobinas de salto colapsadas.",
    itemType: ItemCategory.MATERIAL,
    rarity: ItemRarity.RARE,
    iconKey: "icon_quantum_filament",
    baseValue: 95,
    maxStack: 999,
  },
  {
    id: "void_alloy",
    displayName: "Aleación de Vacío",
    description: "Metal negro de compresión extrema, difícil de estabilizar.",
    itemType: ItemCategory.MATERIAL,
    rarity: ItemRarity.EPIC,
    iconKey: "icon_void_alloy",
    baseValue: 180,
    maxStack: 199,
  },
  {
    id: "entropy_shard",
    displayName: "Esquirla Entrópica",
    description: "Fragmento de singularidad encapsulada. Potencia brutal, manejo delicado.",
    itemType: ItemCategory.MATERIAL,
    rarity: ItemRarity.LEGENDARY,
    iconKey: "icon_entropy_shard",
    baseValue: 420,
    maxStack: 49,
  },

  // EQUIPAMIENTO (7 items)
  {
    id: "basic_work_helmet",
    displayName: "Casco de Trabajo Básico",
    description: "Un casco de obra estandarizado. Al menos detiene micrometeoritos lentos.",
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.COMMON,
    iconKey: "icon_helmet_basic",
    baseValue: 15,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.HEAD,
    configOptions: { dangerResistance: 0.05 }
  },
  {
    id: "reinforced_helmet",
    displayName: "Casco Reforzado",
    description: "Casco minero con linterna y visor resistente.",
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.UNCOMMON,
    iconKey: "icon_helmet_reinforced",
    baseValue: 50,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.HEAD,
    configOptions: { dangerResistance: 0.10 }
  },
  {
    id: "basic_work_suit",
    displayName: "Traje de Trabajo Básico",
    description: "Mono de lona ignífuga. Protege de la suciedad, no del vacío.",
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.COMMON,
    iconKey: "icon_suit_basic",
    baseValue: 20,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.BODY,
    configOptions: { dangerResistance: 0 }
  },
  {
    id: "light_armor_suit",
    displayName: "Traje con Placas Ligeras",
    description: "Traje con placas insertadas. Absorbe ondas de presión.",
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.UNCOMMON,
    iconKey: "icon_suit_light_armor",
    baseValue: 80,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.BODY,
    configOptions: { dangerResistance: 0.12 }
  },
  {
    id: "industrial_work_gloves",
    displayName: "Guantes de Trabajo",
    description: "Guantes reforzados con grafeno sintético.",
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.COMMON,
    iconKey: "icon_gloves_industrial",
    baseValue: 12,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.HANDS,
    configOptions: { lootMultiplier: 0.05 }
  },
  {
    id: "portable_thermal_cutter",
    displayName: "Cortador Térmico Portátil",
    description: "Herramienta de haz térmico concentrado.",
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.UNCOMMON,
    iconKey: "icon_tool_thermal_cutter",
    baseValue: 120,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.TOOL_PRIMARY,
    configOptions: { lootMultiplier: 0.15 }
  },
  {
    id: "extended_cargo_backpack",
    displayName: "Mochila de Carga Ampliada",
    description: "Estructura modular con compartimentos extensibles.",
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.UNCOMMON,
    iconKey: "icon_backpack_extended",
    baseValue: 90,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.BACKPACK,
    configOptions: { backpackCapacity: 0.30 }
  },
  // HIGH-TIER CRAFTABLE EQUIPMENT (3 items)
  {
    id: "backpack_advanced_expedition",
    displayName: "Mochila de Expedición Avanzada",
    description: "Estructura de fibra de carbono con estabilizadores inerciales. Máxima capacidad.",
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.RARE,
    iconKey: "icon_backpack_advanced",
    baseValue: 350,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.BACKPACK,
    configOptions: { backpackCapacity: 0.60, dangerResistance: 0.05 }
  },
  {
    id: "tool_nanofiber_precision",
    displayName: "Multi-herramienta de Nanofibra",
    description: "Corte por inducción molecular. Extrae hasta el último gramo de valor.",
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.EPIC,
    iconKey: "icon_tool_precision",
    baseValue: 800,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.TOOL_PRIMARY,
    configOptions: { lootMultiplier: 0.40, dangerResistance: -0.05 } // El ruido atrae peligro
  },
  {
    id: "helmet_explorer_sensor",
    displayName: "Casco de Sensor de Explorador",
    description: "HUD integrado con escaneo térmico y detección de anomalías.",
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.RARE,
    iconKey: "icon_helmet_explorer",
    baseValue: 400,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.HEAD,
    configOptions: { dangerResistance: 0.15, anomalyDetectionBonus: 0.10 }
  },
  {
    id: "helmet_chronoguide_array",
    displayName: "Array Cronoguía",
    description: "Visor de predicción cinética con rutas de extracción en tiempo real.",
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.LEGENDARY,
    iconKey: "icon_helmet_chronoguide",
    baseValue: 1750,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.HEAD,
    configOptions: { dangerResistance: 0.2, xpMultiplier: 0.08 }
  },
  {
    id: "suit_voidharden_shell",
    displayName: "Armadura Voidharden",
    description: "Capas reactivas que absorben fragmentación y sobrecarga térmica.",
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.LEGENDARY,
    iconKey: "icon_suit_voidharden",
    baseValue: 2300,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.BODY,
    configOptions: { dangerResistance: 0.24, xpMultiplier: 0.05 }
  },
  {
    id: "tool_singularity_harvester",
    displayName: "Recolector de Singularidad",
    description: "Taladro de compresión gravitatoria para extraer núcleos intactos.",
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.LEGENDARY,
    iconKey: "icon_tool_singularity",
    baseValue: 2600,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.TOOL_PRIMARY,
    configOptions: { lootMultiplier: 0.48, dangerResistance: -0.04, xpMultiplier: 0.12 }
  },
  {
    id: "backpack_event_horizon",
    displayName: "Mochila Horizonte de Eventos",
    description: "Módulo de compresión pseudoespacial para cargas de altísimo valor.",
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.LEGENDARY,
    iconKey: "icon_backpack_event_horizon",
    baseValue: 2150,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.BACKPACK,
    configOptions: { backpackCapacity: 0.85, dangerResistance: 0.08, xpMultiplier: 0.06 }
  },
  {
    id: 'helmet_hazard_predictor',
    displayName: 'Casco Predictor de Riesgo',
    description: 'Matriz balística que anticipa microfracturas estructurales antes del colapso.',
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.EPIC,
    iconKey: 'icon_helmet_hazard_predictor',
    baseValue: 980,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.HEAD,
    configOptions: { dangerResistance: 0.17, xpMultiplier: 0.03 }
  },
  {
    id: 'suit_reactive_bulkframe',
    displayName: 'Armadura Bulkframe Reactiva',
    description: 'Paneles de reacción secuencial para absorber impacto y redirigir calor.',
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.EPIC,
    iconKey: 'icon_suit_bulkframe',
    baseValue: 1220,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.BODY,
    configOptions: { dangerResistance: 0.2, currencyMultiplier: 0.06 }
  },
  {
    id: 'gloves_flux_stabilizer',
    displayName: 'Guantes Estabilizadores de Flujo',
    description: 'Servomotores de ajuste fino para separar scrap valioso en zonas inestables.',
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.RARE,
    iconKey: 'icon_gloves_flux',
    baseValue: 540,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.HANDS,
    configOptions: { lootMultiplier: 0.2, dangerResistance: 0.04 }
  },
  {
    id: 'tool_resonance_scanner',
    displayName: 'Escáner de Resonancia',
    description: 'Módulo secundario para identificar aleaciones complejas y rutas seguras de extracción.',
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.EPIC,
    iconKey: 'icon_tool_resonance',
    baseValue: 1100,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.TOOL_SECONDARY,
    configOptions: { lootMultiplier: 0.18, xpMultiplier: 0.07 }
  },
  {
    id: 'gloves_precision_weave',
    displayName: 'Guantes de Trama de Precisión',
    description: 'Micromotores de ajuste para separar aleaciones sin perder rendimiento.',
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.UNCOMMON,
    iconKey: 'icon_gloves_precision_weave',
    baseValue: 210,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.HANDS,
    configOptions: { lootMultiplier: 0.1, dangerResistance: 0.02 }
  },
  {
    id: 'gloves_quantum_grip',
    displayName: 'Guantes Quantum Grip',
    description: 'Anillos de estabilización cuántica para trabajo fino bajo presión extrema.',
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.EPIC,
    iconKey: 'icon_gloves_quantum_grip',
    baseValue: 1280,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.HANDS,
    configOptions: { lootMultiplier: 0.28, dangerResistance: 0.05, xpMultiplier: 0.04 }
  },
  {
    id: 'gloves_event_horizon',
    displayName: 'Guantes Horizonte de Eventos',
    description: 'Actuadores de compresión táctica para extracciones de altísima densidad.',
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.LEGENDARY,
    iconKey: 'icon_gloves_event_horizon',
    baseValue: 2360,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.HANDS,
    configOptions: { lootMultiplier: 0.36, dangerResistance: 0.07, xpMultiplier: 0.08 }
  },
  {
    id: 'tool_secondary_echo_scanner',
    displayName: 'Escáner Eco Mk-I',
    description: 'Módulo secundario de detección temprana para rutas de menor riesgo.',
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.COMMON,
    iconKey: 'icon_tool_secondary_echo',
    baseValue: 120,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.TOOL_SECONDARY,
    configOptions: { dangerResistance: 0.03 }
  },
  {
    id: 'tool_secondary_phase_link',
    displayName: 'Phase-Link Mk-II',
    description: 'Interfaz secundaria de calibración de trayectorias en zonas inestables.',
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.UNCOMMON,
    iconKey: 'icon_tool_secondary_phase',
    baseValue: 320,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.TOOL_SECONDARY,
    configOptions: { dangerResistance: 0.05, xpMultiplier: 0.02 }
  },
  {
    id: 'tool_secondary_resonance_anchor',
    displayName: 'Ancla de Resonancia Mk-III',
    description: 'Ancla de apoyo para mantener integridad estructural durante extracciones largas.',
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.RARE,
    iconKey: 'icon_tool_secondary_anchor',
    baseValue: 680,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.TOOL_SECONDARY,
    configOptions: { dangerResistance: 0.09, lootMultiplier: 0.1 }
  },
  {
    id: 'tool_secondary_entropic_array',
    displayName: 'Array Entrópico Secundario',
    description: 'Sub-sistema legendario de mitigación y análisis para operaciones de elite.',
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.LEGENDARY,
    iconKey: 'icon_tool_secondary_entropic',
    baseValue: 2440,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.TOOL_SECONDARY,
    configOptions: { dangerResistance: 0.13, lootMultiplier: 0.16, xpMultiplier: 0.09 }
  },
  {
    id: 'suit_salvage_command',
    displayName: 'Armadura Salvage Command',
    description: 'Placas de mando con circuito de reparto energético para jornadas largas.',
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.RARE,
    iconKey: 'icon_suit_salvage_command',
    baseValue: 730,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.BODY,
    configOptions: { dangerResistance: 0.14, currencyMultiplier: 0.04 }
  },
  {
    id: 'backpack_salvager_frame',
    displayName: 'Mochila Salvager Frame',
    description: 'Estructura modular compacta para aumentar capacidad sin penalizar movilidad.',
    itemType: ItemCategory.EQUIPMENT,
    rarity: ItemRarity.UNCOMMON,
    iconKey: 'icon_backpack_salvager_frame',
    baseValue: 250,
    maxStack: 1,
    equipmentSlot: EquipmentSlotKey.BACKPACK,
    configOptions: { backpackCapacity: 0.42, dangerResistance: 0.02 }
  },
  {
    id: 'extraction_insurance_bundle',
    displayName: 'Bundle de Seguro de Extracción',
    description: 'Póliza premium de despliegue rápido para operaciones de alto riesgo.',
    itemType: ItemCategory.CONSUMABLE,
    rarity: ItemRarity.LEGENDARY,
    iconKey: 'icon_extraction_insurance_bundle',
    baseValue: 520,
    maxStack: 5
  }
];

export const CRAFTING_RECIPES: Recipe[] = [
  {
    id: "recipe_backpack_advanced",
    resultItemDefId: "backpack_advanced_expedition",
    requiredLevel: 3,
    requiredMaterials: [
      { itemDefId: "armor_fiber", quantity: 4 },
      { itemDefId: "alien_resin", quantity: 1 },
      { itemDefId: "recycled_component", quantity: 3 }
    ],
    costCC: 520
  },
  {
    id: "recipe_tool_precision",
    resultItemDefId: "tool_nanofiber_precision",
    requiredLevel: 5,
    requiredMaterials: [
      { itemDefId: "optic_sensor", quantity: 2 },
      { itemDefId: "plasma_core", quantity: 1 },
      { itemDefId: "energy_cell", quantity: 6 }
    ],
    costCC: 1360
  },
  {
    id: "recipe_helmet_explorer",
    resultItemDefId: "helmet_explorer_sensor",
    requiredLevel: 4,
    requiredMaterials: [
      { itemDefId: "optic_sensor", quantity: 2 },
      { itemDefId: "recycled_component", quantity: 4 },
      { itemDefId: "copper_wire", quantity: 8 }
    ],
    costCC: 860
  },
  {
    id: "recipe_chronoguide_array",
    resultItemDefId: "helmet_chronoguide_array",
    requiredLevel: 10,
    requiredMaterials: [
      { itemDefId: "optic_sensor", quantity: 3 },
      { itemDefId: "quantum_filament", quantity: 2 },
      { itemDefId: "void_alloy", quantity: 1 },
      { itemDefId: "plasma_core", quantity: 1 }
    ],
    costCC: 2200
  },
  {
    id: "recipe_voidharden_shell",
    resultItemDefId: "suit_voidharden_shell",
    requiredLevel: 11,
    requiredMaterials: [
      { itemDefId: "armor_fiber", quantity: 8 },
      { itemDefId: "alien_resin", quantity: 3 },
      { itemDefId: "void_alloy", quantity: 2 },
      { itemDefId: "entropy_shard", quantity: 1 }
    ],
    costCC: 2860
  },
  {
    id: "recipe_singularity_harvester",
    resultItemDefId: "tool_singularity_harvester",
    requiredLevel: 12,
    requiredMaterials: [
      { itemDefId: "plasma_core", quantity: 2 },
      { itemDefId: "quantum_filament", quantity: 3 },
      { itemDefId: "entropy_shard", quantity: 1 },
      { itemDefId: "recycled_component", quantity: 6 }
    ],
    costCC: 3320
  },
  {
    id: "recipe_event_horizon_backpack",
    resultItemDefId: "backpack_event_horizon",
    requiredLevel: 11,
    requiredMaterials: [
      { itemDefId: "armor_fiber", quantity: 6 },
      { itemDefId: "quantum_filament", quantity: 2 },
      { itemDefId: "void_alloy", quantity: 2 },
      { itemDefId: "alien_resin", quantity: 2 }
    ],
    costCC: 3040
  },
  {
    id: 'recipe_hazard_predictor',
    resultItemDefId: 'helmet_hazard_predictor',
    requiredLevel: 8,
    requiredMaterials: [
      { itemDefId: 'optic_sensor', quantity: 4 },
      { itemDefId: 'quantum_filament', quantity: 2 },
      { itemDefId: 'plasma_core', quantity: 1 },
      { itemDefId: 'recycled_component', quantity: 8 }
    ],
    costCC: 2480
  },
  {
    id: 'recipe_reactive_bulkframe',
    resultItemDefId: 'suit_reactive_bulkframe',
    requiredLevel: 9,
    requiredMaterials: [
      { itemDefId: 'armor_fiber', quantity: 10 },
      { itemDefId: 'void_alloy', quantity: 2 },
      { itemDefId: 'alien_resin', quantity: 3 },
      { itemDefId: 'plasma_core', quantity: 1 }
    ],
    costCC: 2960
  },
  {
    id: 'recipe_flux_stabilizer_gloves',
    resultItemDefId: 'gloves_flux_stabilizer',
    requiredLevel: 6,
    requiredMaterials: [
      { itemDefId: 'armor_fiber', quantity: 5 },
      { itemDefId: 'energy_cell', quantity: 10 },
      { itemDefId: 'optic_sensor', quantity: 2 },
      { itemDefId: 'copper_wire', quantity: 12 }
    ],
    costCC: 1680
  },
  {
    id: 'recipe_resonance_scanner',
    resultItemDefId: 'tool_resonance_scanner',
    requiredLevel: 9,
    requiredMaterials: [
      { itemDefId: 'optic_sensor', quantity: 3 },
      { itemDefId: 'quantum_filament', quantity: 3 },
      { itemDefId: 'alien_resin', quantity: 2 },
      { itemDefId: 'recycled_component', quantity: 10 }
    ],
    costCC: 2740
  },
  {
    id: 'recipe_gloves_precision_weave',
    resultItemDefId: 'gloves_precision_weave',
    requiredLevel: 3,
    requiredMaterials: [
      { itemDefId: 'armor_fiber', quantity: 3 },
      { itemDefId: 'copper_wire', quantity: 10 },
      { itemDefId: 'energy_cell', quantity: 6 }
    ],
    costCC: 460
  },
  {
    id: 'recipe_gloves_quantum_grip',
    resultItemDefId: 'gloves_quantum_grip',
    requiredLevel: 9,
    requiredMaterials: [
      { itemDefId: 'optic_sensor', quantity: 3 },
      { itemDefId: 'quantum_filament', quantity: 2 },
      { itemDefId: 'void_alloy', quantity: 1 },
      { itemDefId: 'armor_fiber', quantity: 8 }
    ],
    costCC: 2580
  },
  {
    id: 'recipe_gloves_event_horizon',
    resultItemDefId: 'gloves_event_horizon',
    requiredLevel: 12,
    requiredMaterials: [
      { itemDefId: 'entropy_shard', quantity: 1 },
      { itemDefId: 'void_alloy', quantity: 2 },
      { itemDefId: 'quantum_filament', quantity: 4 },
      { itemDefId: 'plasma_core', quantity: 2 }
    ],
    costCC: 3480
  },
  {
    id: 'recipe_tool_secondary_phase_link',
    resultItemDefId: 'tool_secondary_phase_link',
    requiredLevel: 3,
    requiredMaterials: [
      { itemDefId: 'recycled_component', quantity: 4 },
      { itemDefId: 'copper_wire', quantity: 12 },
      { itemDefId: 'energy_cell', quantity: 8 }
    ],
    costCC: 620
  },
  {
    id: 'recipe_tool_secondary_anchor',
    resultItemDefId: 'tool_secondary_resonance_anchor',
    requiredLevel: 7,
    requiredMaterials: [
      { itemDefId: 'optic_sensor', quantity: 2 },
      { itemDefId: 'alien_resin', quantity: 2 },
      { itemDefId: 'recycled_component', quantity: 9 },
      { itemDefId: 'energy_cell', quantity: 14 }
    ],
    costCC: 1740
  },
  {
    id: 'recipe_tool_secondary_entropic_array',
    resultItemDefId: 'tool_secondary_entropic_array',
    requiredLevel: 12,
    requiredMaterials: [
      { itemDefId: 'entropy_shard', quantity: 1 },
      { itemDefId: 'void_alloy', quantity: 2 },
      { itemDefId: 'optic_sensor', quantity: 4 },
      { itemDefId: 'quantum_filament', quantity: 4 }
    ],
    costCC: 3360
  },
  {
    id: 'recipe_suit_salvage_command',
    resultItemDefId: 'suit_salvage_command',
    requiredLevel: 7,
    requiredMaterials: [
      { itemDefId: 'armor_fiber', quantity: 7 },
      { itemDefId: 'alien_resin', quantity: 2 },
      { itemDefId: 'optic_sensor', quantity: 2 },
      { itemDefId: 'recycled_component', quantity: 8 }
    ],
    costCC: 1880
  },
  {
    id: 'recipe_backpack_salvager_frame',
    resultItemDefId: 'backpack_salvager_frame',
    requiredLevel: 4,
    requiredMaterials: [
      { itemDefId: 'armor_fiber', quantity: 5 },
      { itemDefId: 'recycled_component', quantity: 5 },
      { itemDefId: 'copper_wire', quantity: 14 }
    ],
    costCC: 880
  }
];
