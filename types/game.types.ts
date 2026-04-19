// Domain enums and interfaces for Scrap & Survive.
// This file is isomorphic — importable from both server and client code.
// Prisma enums are mirrored here as TypeScript enums for compile-time safety.

export enum EquipmentSlotKey {
  HEAD = "HEAD",
  BODY = "BODY",
  HANDS = "HANDS",
  TOOL_PRIMARY = "TOOL_PRIMARY",
  TOOL_SECONDARY = "TOOL_SECONDARY",
  BACKPACK = "BACKPACK",
}

export enum RunStatus {
  RUNNING = "RUNNING",
  EXTRACTED = "EXTRACTED",
  FAILED = "FAILED",
}

export enum RunMode {
  SAFE = "SAFE",
  HARD = "HARD",
}

export enum ItemRarity {
  COMMON = "COMMON",
  UNCOMMON = "UNCOMMON",
  RARE = "RARE",
  EPIC = "EPIC",
  LEGENDARY = "LEGENDARY",
  CORRUPTED = "CORRUPTED",
}

export enum ItemCategory {
  EQUIPMENT = "EQUIPMENT",
  MATERIAL = "MATERIAL",
  RESOURCE = "RESOURCE",
  CONSUMABLE = "CONSUMABLE",
}

// These interfaces match the Prisma models (assumed)
// Used in server layer repositories
export interface ItemDefinition {
  id: string; // The internal key like "basic_work_helmet"
  displayName: string;
  description: string;
  itemType: ItemCategory;
  rarity: ItemRarity;
  iconKey: string;
  baseValue: number;
  maxStack: number;
  
  // Specific to equipment
  equipmentSlot?: EquipmentSlotKey; // Use Enum for runtime
  configOptions?: any; // JSONB
}

export interface DangerConfig {
  baseRate: number;
  quadraticFactor: number;
  catastropheThreshold: number;
  dangerLootBonus: number;
  baseLootPerSecond: Record<string, number>;
  baseCreditsPerMinute: number;
  baseXpPerSecond: number;
}

export interface ZoneDefinition {
  id: string;
  displayName: string;
  description: string;
  minLevel: number;
  config: DangerConfig;
}

export interface Recipe {
  id: string;
  resultItemDefId: string;
  requiredLevel: number;
  requiredMaterials: { itemDefId: string; quantity: number }[];
  costCC: number;
}
