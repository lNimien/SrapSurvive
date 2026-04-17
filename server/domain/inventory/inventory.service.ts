import 'server-only';
import { ITEM_CATALOG } from '../../../config/game.config';
import { EquipmentSlotKey } from '../../../types/game.types';

export class DomainError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export const InventoryService = {
  /**
   * Validates if an item can be equipped in a specific slot.
   */
  validateEquipType(itemDefinitionId: string, targetSlot: EquipmentSlotKey): boolean {
    const itemDef = ITEM_CATALOG.find((item) => item.id === itemDefinitionId);

    if (!itemDef) {
      // Item definition doesn't exist in the current catalog
      return false;
    }

    // A piece of equipment must explicitly define the slot it belongs to
    // If equipmentSlot is completely undefined, it's not equipable.
    if (!itemDef.equipmentSlot) {
      return false;
    }

    // Must match the slot exactly
    return itemDef.equipmentSlot === targetSlot;
  },
};
