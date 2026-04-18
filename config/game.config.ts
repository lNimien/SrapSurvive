import { ItemDefinition, EquipmentSlotKey, ItemRarity, ItemCategory, Recipe } from '../types/game.types';

export const SHIPYARD_CEMETERY_CONFIG = {
  internalKey: 'shipyard_cemetery',
  displayName: 'Cementerio de Naves',
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
};

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
  }
];

export const CRAFTING_RECIPES: Recipe[] = [
  {
    id: "recipe_backpack_advanced",
    resultItemDefId: "backpack_advanced_expedition",
    requiredMaterials: [
      { itemDefId: "armor_fiber", quantity: 8 },
      { itemDefId: "alien_resin", quantity: 3 },
      { itemDefId: "recycled_component", quantity: 5 }
    ],
    costCC: 500
  },
  {
    id: "recipe_tool_precision",
    resultItemDefId: "tool_nanofiber_precision",
    requiredMaterials: [
      { itemDefId: "optic_sensor", quantity: 4 },
      { itemDefId: "plasma_core", quantity: 2 },
      { itemDefId: "energy_cell", quantity: 10 }
    ],
    costCC: 1500
  },
  {
    id: "recipe_helmet_explorer",
    resultItemDefId: "helmet_explorer_sensor",
    requiredMaterials: [
      { itemDefId: "optic_sensor", quantity: 5 },
      { itemDefId: "recycled_component", quantity: 8 },
      { itemDefId: "copper_wire", quantity: 15 }
    ],
    costCC: 800
  }
];
