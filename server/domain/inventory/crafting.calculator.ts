import 'server-only';
import { CRAFTING_RECIPES } from '../../../config/game.config';
import { Recipe } from '../../../types/game.types';
import { ITEM_TIER_LADDER, ITEM_TIER_META, ItemTier } from '@/config/item-tiers.config';

export interface CraftingProgressSnapshot {
  playerLevel: number;
  highestUnlockedZoneLevel: number;
  workshopTierBoost?: number;
}

function getTierByLevel(level: number): ItemTier {
  const normalizedLevel = Math.max(1, Math.floor(level));

  const tier = [...ITEM_TIER_LADDER].reverse().find((candidate) => {
    return normalizedLevel >= ITEM_TIER_META[candidate].craftingLevelFloor;
  });

  return tier ?? 'COMMON';
}

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

  getRequiredTier(requiredLevel: number): ItemTier {
    return getTierByLevel(requiredLevel);
  },

  getUnlockedCraftingTiers(progress: CraftingProgressSnapshot): ItemTier[] {
    const levelTier = getTierByLevel(progress.playerLevel);
    const zoneTier = getTierByLevel(progress.highestUnlockedZoneLevel);
    const workshopBoost = Math.max(0, Math.floor(progress.workshopTierBoost ?? 0));

    const unlockedRank = Math.min(
      ITEM_TIER_LADDER.length - 1,
      Math.max(ITEM_TIER_META[levelTier].rank, ITEM_TIER_META[zoneTier].rank + workshopBoost),
    );

    return ITEM_TIER_LADDER.filter((tier) => ITEM_TIER_META[tier].rank <= unlockedRank);
  },

  isRecipeUnlocked(recipe: Recipe, progress: CraftingProgressSnapshot): boolean {
    const byLevel = Math.max(1, Math.floor(progress.playerLevel)) >= recipe.requiredLevel;
    const requiredTier = this.getRequiredTier(recipe.requiredLevel);
    const unlockedTiers = this.getUnlockedCraftingTiers(progress);

    return byLevel && unlockedTiers.includes(requiredTier);
  },

  getRecipeLockReason(recipe: Recipe, progress: CraftingProgressSnapshot): string | null {
    if (this.isRecipeUnlocked(recipe, progress)) {
      return null;
    }

    const requiredTier = this.getRequiredTier(recipe.requiredLevel);
    const playerTier = getTierByLevel(progress.playerLevel);

    if (Math.max(1, Math.floor(progress.playerLevel)) < recipe.requiredLevel) {
      return `Autorización ${ITEM_TIER_META[requiredTier].label} requerida. Mejora taller y alcance de expedición para desbloquear este plano.`;
    }

    return `Receta ${ITEM_TIER_META[requiredTier].label} bloqueada. Tu autorización operativa actual es ${ITEM_TIER_META[playerTier].label}.`;
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
