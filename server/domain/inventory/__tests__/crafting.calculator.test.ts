import 'server-only';

import { describe, expect, it } from 'vitest';

import { CraftingCalculator } from '@/server/domain/inventory/crafting.calculator';

describe('CraftingCalculator level gating', () => {
  const baseProgress = {
    playerLevel: 1,
    highestUnlockedZoneLevel: 1,
  };

  it('unlocks recipe when player level matches required level', () => {
    const recipe = CraftingCalculator.getRecipe('recipe_hazard_predictor');
    if (!recipe) {
      throw new Error('Expected recipe_hazard_predictor to exist in config.');
    }

    expect(
      CraftingCalculator.isRecipeUnlocked(recipe, {
        ...baseProgress,
        playerLevel: recipe.requiredLevel,
        highestUnlockedZoneLevel: recipe.requiredLevel,
      }),
    ).toBe(true);
    expect(
      CraftingCalculator.getRecipeLockReason(recipe, {
        ...baseProgress,
        playerLevel: recipe.requiredLevel,
        highestUnlockedZoneLevel: recipe.requiredLevel,
      }),
    ).toBeNull();
  });

  it('returns lock reason when player level is below recipe requirement', () => {
    const recipe = CraftingCalculator.getRecipe('recipe_resonance_scanner');
    if (!recipe) {
      throw new Error('Expected recipe_resonance_scanner to exist in config.');
    }

    expect(
      CraftingCalculator.isRecipeUnlocked(recipe, {
        ...baseProgress,
        playerLevel: recipe.requiredLevel - 1,
        highestUnlockedZoneLevel: recipe.requiredLevel - 1,
      }),
    ).toBe(false);
    expect(
      CraftingCalculator.getRecipeLockReason(recipe, {
        ...baseProgress,
        playerLevel: recipe.requiredLevel - 1,
        highestUnlockedZoneLevel: recipe.requiredLevel - 1,
      }),
    ).toContain('Autorización');
  });

  it('calculates unlocked crafting tiers from mixed progression inputs', () => {
    expect(
      CraftingCalculator.getUnlockedCraftingTiers({
        playerLevel: 5,
        highestUnlockedZoneLevel: 5,
      }),
    ).toEqual(['COMMON', 'UNCOMMON']);

    expect(
      CraftingCalculator.getUnlockedCraftingTiers({
        playerLevel: 5,
        highestUnlockedZoneLevel: 9,
      }),
    ).toEqual(['COMMON', 'UNCOMMON', 'RARE', 'EPIC']);
  });
});
