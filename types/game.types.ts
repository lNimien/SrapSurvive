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
}

// These interfaces match the Prisma models (assumed)
// Used in server layer repositories
export interface ItemDefinition {
  id: string; // The internal key like "basic_work_helmet"
  displayName: string;
  description: string;
  itemType: "EQUIPMENT" | "MATERIAL" | "RESOURCE";
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" | "CORRUPTED";
  iconKey: string;
  baseValue: number;
  maxStack: number;
  
  // Specific to equipment
  equipmentSlot?: EquipmentSlotKey; // Use Enum for runtime
  configOptions?: any; // JSONB
}
