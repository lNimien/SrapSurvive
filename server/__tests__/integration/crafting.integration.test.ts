import 'server-only';

import { describe, expect, it } from 'vitest';

import { db } from '@/server/db/client';
import { seedTestUser } from '@/server/__tests__/helpers/db-test-utils';
import { CRAFTING_RECIPES, ITEM_CATALOG, ZONE_CONFIGS } from '@/config/game.config';
import { VENDOR_CATALOG } from '@/config/vendor.config';
import { CraftingService } from '@/server/services/crafting.service';

async function grantCredits(userId: string, amount: number): Promise<void> {
  const latest = await db.currencyLedger.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { balanceAfter: true },
  });

  const previousBalance = latest?.balanceAfter ?? 0;

  await db.currencyLedger.create({
    data: {
      userId,
      amount,
      balanceAfter: previousBalance + amount,
      entryType: 'ADMIN_ADJUSTMENT',
      referenceId: `test-grant:${userId}`,
    },
  });
}

describe('CraftingService.craftItem (integration)', () => {
  it('ensures every recipe ingredient is obtainable from zones or vendor catalog', async () => {
    const zoneDropItems = new Set(
      ZONE_CONFIGS.flatMap((zone) => Object.keys(zone.baseLootPerSecond))
    );
    const vendorItems = new Set(VENDOR_CATALOG.map((entry) => entry.itemDefinitionId));

    for (const recipe of CRAFTING_RECIPES) {
      for (const required of recipe.requiredMaterials) {
        const obtainable = zoneDropItems.has(required.itemDefId) || vendorItems.has(required.itemDefId);

        expect(
          obtainable,
          `Ingredient ${required.itemDefId} in ${recipe.id} must be obtainable from zone drops or vendor catalog.`
        ).toBe(true);
      }
    }

    expect(CRAFTING_RECIPES.some((recipe) => recipe.id === 'recipe_chronoguide_array')).toBe(true);
    expect(CRAFTING_RECIPES.some((recipe) => recipe.id === 'recipe_voidharden_shell')).toBe(true);
    expect(CRAFTING_RECIPES.some((recipe) => recipe.id === 'recipe_singularity_harvester')).toBe(true);
    expect(CRAFTING_RECIPES.some((recipe) => recipe.id === 'recipe_hazard_predictor')).toBe(true);
    expect(CRAFTING_RECIPES.some((recipe) => recipe.id === 'recipe_reactive_bulkframe')).toBe(true);
    expect(CRAFTING_RECIPES.some((recipe) => recipe.id === 'recipe_flux_stabilizer_gloves')).toBe(true);
    expect(CRAFTING_RECIPES.some((recipe) => recipe.id === 'recipe_resonance_scanner')).toBe(true);

    const filterBuckets = {
      HEAD: 0,
      BODY: 0,
      HANDS: 0,
      TOOLS: 0,
      BACKPACK: 0,
    };

    for (const recipe of CRAFTING_RECIPES) {
      const resultItem = ITEM_CATALOG.find((item) => item.id === recipe.resultItemDefId);
      if (!resultItem?.equipmentSlot) {
        continue;
      }

      if (resultItem.equipmentSlot === 'HEAD') filterBuckets.HEAD += 1;
      if (resultItem.equipmentSlot === 'BODY') filterBuckets.BODY += 1;
      if (resultItem.equipmentSlot === 'HANDS') filterBuckets.HANDS += 1;
      if (resultItem.equipmentSlot === 'BACKPACK') filterBuckets.BACKPACK += 1;
      if (resultItem.equipmentSlot.startsWith('TOOL_')) filterBuckets.TOOLS += 1;
    }

    expect(filterBuckets.HEAD).toBeGreaterThan(0);
    expect(filterBuckets.BODY).toBeGreaterThan(0);
    expect(filterBuckets.HANDS).toBeGreaterThan(0);
    expect(filterBuckets.TOOLS).toBeGreaterThan(0);
    expect(filterBuckets.BACKPACK).toBeGreaterThan(0);
  });

  it('happy path consumes materials + CC and grants crafted item', async () => {
    const userId = 'user-crafting-happy';
    const recipe = CRAFTING_RECIPES.find((entry) => entry.id === 'recipe_backpack_advanced');

    if (!recipe) {
      throw new Error('Expected recipe_backpack_advanced in CRAFTING_RECIPES.');
    }

    await seedTestUser(userId);
    await grantCredits(userId, recipe.costCC);

    for (const ingredient of recipe.requiredMaterials) {
      await db.inventoryItem.create({
        data: {
          userId,
          itemDefinitionId: ingredient.itemDefId,
          quantity: ingredient.quantity,
        },
      });
    }

    await CraftingService.craftItem(userId, recipe.id);

    for (const ingredient of recipe.requiredMaterials) {
      const row = await db.inventoryItem.findUnique({
        where: {
          userId_itemDefinitionId: {
            userId,
            itemDefinitionId: ingredient.itemDefId,
          },
        },
      });
      expect(row).toBeNull();
    }

    const craftedItem = await db.inventoryItem.findUnique({
      where: {
        userId_itemDefinitionId: {
          userId,
          itemDefinitionId: recipe.resultItemDefId,
        },
      },
    });
    expect(craftedItem?.quantity).toBe(1);

    const paymentEntry = await db.currencyLedger.findFirst({
      where: {
        userId,
        entryType: 'PURCHASE',
        referenceId: recipe.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(paymentEntry?.amount).toBe(-recipe.costCC);

    const latestBalance = await db.currencyLedger.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    expect(latestBalance?.balanceAfter).toBe(0);
  });

  it('crafts D.1 legendary recipe path with new zone materials', async () => {
    const userId = 'user-crafting-d1-legendary';
    const recipe = CRAFTING_RECIPES.find((entry) => entry.id === 'recipe_chronoguide_array');

    if (!recipe) {
      throw new Error('Expected recipe_chronoguide_array in CRAFTING_RECIPES.');
    }

    await seedTestUser(userId);
    await grantCredits(userId, recipe.costCC + 50);

    for (const ingredient of recipe.requiredMaterials) {
      await db.inventoryItem.create({
        data: {
          userId,
          itemDefinitionId: ingredient.itemDefId,
          quantity: ingredient.quantity,
        },
      });
    }

    await CraftingService.craftItem(userId, recipe.id);

    const craftedItem = await db.inventoryItem.findUnique({
      where: {
        userId_itemDefinitionId: {
          userId,
          itemDefinitionId: recipe.resultItemDefId,
        },
      },
    });

    expect(craftedItem?.quantity).toBe(1);

    const latestBalance = await db.currencyLedger.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });
    expect(latestBalance?.balanceAfter).toBe(50);
  });

  it('rolls back materials and CC when crafted item FK insert fails', async () => {
    const userId = 'user-crafting-rollback';
    const recipe = CRAFTING_RECIPES.find((entry) => entry.id === 'recipe_helmet_explorer');

    if (!recipe) {
      throw new Error('Expected recipe_helmet_explorer in CRAFTING_RECIPES.');
    }

    await seedTestUser(userId);
    await grantCredits(userId, recipe.costCC + 100);

    for (const ingredient of recipe.requiredMaterials) {
      await db.inventoryItem.create({
        data: {
          userId,
          itemDefinitionId: ingredient.itemDefId,
          quantity: ingredient.quantity,
        },
      });
    }

    await db.itemDefinition.delete({ where: { id: recipe.resultItemDefId } });

    const balanceBefore = await db.currencyLedger.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });

    await expect(CraftingService.craftItem(userId, recipe.id)).rejects.toBeTruthy();

    const balanceAfter = await db.currencyLedger.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });
    expect(balanceAfter?.balanceAfter).toBe(balanceBefore?.balanceAfter);

    for (const ingredient of recipe.requiredMaterials) {
      const row = await db.inventoryItem.findUnique({
        where: {
          userId_itemDefinitionId: {
            userId,
            itemDefinitionId: ingredient.itemDefId,
          },
        },
      });
      expect(row?.quantity).toBe(ingredient.quantity);
    }

    const paymentEntry = await db.currencyLedger.findFirst({
      where: {
        userId,
        entryType: 'PURCHASE',
        referenceId: recipe.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(paymentEntry).toBeNull();

    const craftedItem = await db.inventoryItem.findUnique({
      where: {
        userId_itemDefinitionId: {
          userId,
          itemDefinitionId: recipe.resultItemDefId,
        },
      },
    });
    expect(craftedItem).toBeNull();
  });

  it('blocks crafting when player level is below recipe requiredLevel', async () => {
    const userId = 'user-crafting-level-locked';
    const recipe = CRAFTING_RECIPES.find((entry) => entry.id === 'recipe_resonance_scanner');

    if (!recipe) {
      throw new Error('Expected recipe_resonance_scanner in CRAFTING_RECIPES.');
    }

    await seedTestUser(userId);
    await db.userProgression.update({
      where: { userId },
      data: { currentLevel: recipe.requiredLevel - 1 },
    });
    await grantCredits(userId, recipe.costCC + 20);

    for (const ingredient of recipe.requiredMaterials) {
      await db.inventoryItem.create({
        data: {
          userId,
          itemDefinitionId: ingredient.itemDefId,
          quantity: ingredient.quantity,
        },
      });
    }

    await expect(CraftingService.craftItem(userId, recipe.id)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });

    const craftedItem = await db.inventoryItem.findUnique({
      where: {
        userId_itemDefinitionId: {
          userId,
          itemDefinitionId: recipe.resultItemDefId,
        },
      },
    });
    expect(craftedItem).toBeNull();
  });

  it('allows crafting when player level reaches recipe requiredLevel', async () => {
    const userId = 'user-crafting-level-open';
    const recipe = CRAFTING_RECIPES.find((entry) => entry.id === 'recipe_flux_stabilizer_gloves');

    if (!recipe) {
      throw new Error('Expected recipe_flux_stabilizer_gloves in CRAFTING_RECIPES.');
    }

    await seedTestUser(userId);
    await db.userProgression.update({
      where: { userId },
      data: { currentLevel: recipe.requiredLevel },
    });
    await grantCredits(userId, recipe.costCC);

    for (const ingredient of recipe.requiredMaterials) {
      await db.inventoryItem.create({
        data: {
          userId,
          itemDefinitionId: ingredient.itemDefId,
          quantity: ingredient.quantity,
        },
      });
    }

    await expect(CraftingService.craftItem(userId, recipe.id)).resolves.toBeTruthy();
  });
});
