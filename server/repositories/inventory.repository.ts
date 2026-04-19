import 'server-only';
import { db } from '../db/client';
import { ITEM_CATALOG } from '../../config/game.config';

// ─── Domain types returned by this repo ───────────────────────────────────────

export interface InventoryItemDomain {
  itemId: string;
  itemDefinitionId: string;
  // Resolved from ITEM_CATALOG (source of truth in MVP — no DB join needed for item defs)
  displayName: string;
  description: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'CORRUPTED';
  iconKey: string;
  quantity: number;
  baseValue: number;
  isEquipable: boolean;
  equipmentSlot?: EquipmentSlotKey;
  configOptions?: {
    dangerResistance?: number;
    lootMultiplier?: number;
    currencyMultiplier?: number;
    xpMultiplier?: number;
    backpackCapacity?: number;
    anomalyDetectionBonus?: number;
  };
}

export type EquipmentSlotKey = 'HEAD' | 'BODY' | 'HANDS' | 'TOOL_PRIMARY' | 'TOOL_SECONDARY' | 'BACKPACK';

export interface EquipmentDomain {
  HEAD: InventoryItemDomain | null;
  BODY: InventoryItemDomain | null;
  HANDS: InventoryItemDomain | null;
  TOOL_PRIMARY: InventoryItemDomain | null;
  TOOL_SECONDARY: InventoryItemDomain | null;
  BACKPACK: InventoryItemDomain | null;
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

function resolveItemDefinition(itemDefinitionId: string) {
  return ITEM_CATALOG.find((item) => item.id === itemDefinitionId) ?? null;
}

function toInventoryItemDomain(
  id: string,
  itemDefinitionId: string,
  quantity: number
): InventoryItemDomain | null {
  const def = resolveItemDefinition(itemDefinitionId);
  if (!def) return null;
  return {
    itemId: id,
    itemDefinitionId,
    displayName: def.displayName,
    description: def.description,
    rarity: def.rarity as InventoryItemDomain['rarity'],
    iconKey: def.iconKey,
    quantity,
    baseValue: def.baseValue,
    isEquipable: def.equipmentSlot !== undefined,
    equipmentSlot: def.equipmentSlot as EquipmentSlotKey | undefined,
    configOptions: (def.configOptions ?? undefined) as InventoryItemDomain['configOptions'],
  };
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const InventoryRepository = {
  /**
   * Returns all equipment slots for the user, with item info resolved from
   * the in-memory ITEM_CATALOG (no join needed — catalog is seeded at startup).
   */
  async getEquipmentByUser(userId: string): Promise<EquipmentDomain> {
    const slots = await db.equipmentSlot_.findMany({
      where: { userId },
    });

    const empty: EquipmentDomain = {
      HEAD: null,
      BODY: null,
      HANDS: null,
      TOOL_PRIMARY: null,
      TOOL_SECONDARY: null,
      BACKPACK: null,
    };

    for (const slot of slots) {
      const key = slot.slot as EquipmentSlotKey;
      if (slot.itemDefinitionId) {
        const item = toInventoryItemDomain(slot.id, slot.itemDefinitionId, 1);
        empty[key] = item;
      }
    }

    return empty;
  },

  /**
   * Returns all inventory items for the user with display info resolved.
   * Excludes items with 0 quantity.
   */
  async getInventoryByUser(userId: string): Promise<InventoryItemDomain[]> {
    const rows = await db.inventoryItem.findMany({
      where: { userId, quantity: { gt: 0 } },
      orderBy: { acquiredAt: 'asc' },
    });

    return rows
      .map((row: any) => toInventoryItemDomain(row.id, row.itemDefinitionId, row.quantity))
      .filter((item: any): item is InventoryItemDomain => item !== null);
  },
};
