import { describe, expect, it } from 'vitest';

import { CRAFTING_RECIPES, ITEM_CATALOG } from '@/config/game.config';
import { EquipmentSlotKey } from '@/types/game.types';

const CRAFTABLE_SLOT_SET = new Set(
  CRAFTING_RECIPES.map((recipe) => {
    const result = ITEM_CATALOG.find((item) => item.id === recipe.resultItemDefId);
    return result?.equipmentSlot;
  }).filter((slot): slot is EquipmentSlotKey => Boolean(slot)),
);

describe('crafting catalog coverage', () => {
  it('covers every supported equipment slot with at least one recipe', () => {
    const expectedSlots: EquipmentSlotKey[] = [
      EquipmentSlotKey.HEAD,
      EquipmentSlotKey.BODY,
      EquipmentSlotKey.HANDS,
      EquipmentSlotKey.TOOL_PRIMARY,
      EquipmentSlotKey.TOOL_SECONDARY,
      EquipmentSlotKey.BACKPACK,
    ];

    expect([...CRAFTABLE_SLOT_SET].sort()).toEqual(expectedSlots.sort());
  });

  it('adds tier depth for hands and secondary tool slots', () => {
    const handsTiers = new Set(
      CRAFTING_RECIPES.map((recipe) => {
        const item = ITEM_CATALOG.find((candidate) => candidate.id === recipe.resultItemDefId);
        return item?.equipmentSlot === EquipmentSlotKey.HANDS ? item.rarity : null;
      }).filter(Boolean),
    );

    const secondaryToolTiers = new Set(
      CRAFTING_RECIPES.map((recipe) => {
        const item = ITEM_CATALOG.find((candidate) => candidate.id === recipe.resultItemDefId);
        return item?.equipmentSlot === EquipmentSlotKey.TOOL_SECONDARY ? item.rarity : null;
      }).filter(Boolean),
    );

    expect(handsTiers.size).toBeGreaterThanOrEqual(3);
    expect(secondaryToolTiers.size).toBeGreaterThanOrEqual(4);
  });
});

