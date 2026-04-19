import 'server-only';

import { describe, expect, it } from 'vitest';

import { CraftingCalculator } from '@/server/domain/inventory/crafting.calculator';

describe('CraftingCalculator level gating', () => {
  it('unlocks recipe when player level matches required level', () => {
    const recipe = CraftingCalculator.getRecipe('recipe_hazard_predictor');
    if (!recipe) {
      throw new Error('Expected recipe_hazard_predictor to exist in config.');
    }

    expect(CraftingCalculator.isRecipeUnlocked(recipe, recipe.requiredLevel)).toBe(true);
    expect(CraftingCalculator.getRecipeLockReason(recipe, recipe.requiredLevel)).toBeNull();
  });

  it('returns lock reason when player level is below recipe requirement', () => {
    const recipe = CraftingCalculator.getRecipe('recipe_resonance_scanner');
    if (!recipe) {
      throw new Error('Expected recipe_resonance_scanner to exist in config.');
    }

    expect(CraftingCalculator.isRecipeUnlocked(recipe, recipe.requiredLevel - 1)).toBe(false);
    expect(CraftingCalculator.getRecipeLockReason(recipe, recipe.requiredLevel - 1)).toContain(
      `Nivel ${recipe.requiredLevel}`,
    );
  });
});
