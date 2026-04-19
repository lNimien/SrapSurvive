import 'server-only';
import { CRAFTING_RECIPES } from '../../../config/game.config';
import { Recipe } from '../../../types/game.types';

/**
 * Pure domain logic for crafting calculations.
 */
export const CraftingCalculator = {
  /**
   * Finds a recipe by ID.
   */
  getRecipe(recipeId: string): Recipe | null {
    return CRAFTING_RECIPES.find((r) => r.id === recipeId) ?? null;
  },

  isRecipeUnlocked(recipe: Recipe, playerLevel: number): boolean {
    return Math.max(1, Math.floor(playerLevel)) >= recipe.requiredLevel;
  },

  getRecipeLockReason(recipe: Recipe, playerLevel: number): string | null {
    if (this.isRecipeUnlocked(recipe, playerLevel)) {
      return null;
    }

    return `Nivel ${recipe.requiredLevel} requerido. Nivel actual: ${Math.max(1, Math.floor(playerLevel))}.`;
  },

  /**
   * Checks if the user has enough materials.
   * inventory items is an array of InventoryItem rows (Prisma style/Partial).
   */
  canAfford(
    recipe: Recipe,
    inventory: { itemDefinitionId: string; quantity: number }[],
    currentBalance: number
  ) {
    // 1. Check CC
    const hasCC = currentBalance >= recipe.costCC;

    // 2. Check materials
    const missingMaterials = [];
    for (const req of recipe.requiredMaterials) {
      const inv = inventory.find((i) => i.itemDefinitionId === req.itemDefId);
      const available = inv ? inv.quantity : 0;
      if (available < req.quantity) {
        missingMaterials.push({
          itemDefId: req.itemDefId,
          required: req.quantity,
          available,
        });
      }
    }

    return {
      success: hasCC && missingMaterials.length === 0,
      hasCC,
      missingMaterials,
    };
  }
};
