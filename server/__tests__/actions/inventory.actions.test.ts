import 'server-only';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/server/services/salvage.service', () => ({
  SalvageService: {
    salvageItem: vi.fn(),
  },
}));

vi.mock('@/server/services/crafting.service', () => ({
  CraftingService: {
    craftItem: vi.fn(),
  },
}));

import { auth } from '@/server/auth/auth';
import { featureFlags } from '@/config/feature-flags.config';
import { CraftingService } from '@/server/services/crafting.service';
import { SalvageService } from '@/server/services/salvage.service';
import { craftItemAction, salvageItemAction } from '@/server/actions/inventory.actions';

describe('inventory actions validation/auth guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    featureFlags.killSwitchCraftingMutations = false;
  });

  it('salvageItemAction returns UNAUTHORIZED when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const result = await salvageItemAction({
      itemDefinitionId: 'scrap_metal',
      quantity: 1,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected unauthorized ActionResult.');
    }

    expect(result.error.code).toBe('UNAUTHORIZED');
    expect(vi.mocked(SalvageService.salvageItem)).not.toHaveBeenCalled();
  });

  it('salvageItemAction returns VALIDATION_ERROR for invalid input', async () => {
    const result = await salvageItemAction({
      itemDefinitionId: 'scrap_metal',
      quantity: 0,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation ActionResult.');
    }

    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(vi.mocked(auth)).not.toHaveBeenCalled();
    expect(vi.mocked(SalvageService.salvageItem)).not.toHaveBeenCalled();
  });

  it('craftItemAction returns FEATURE_DISABLED when crafting kill-switch is active', async () => {
    featureFlags.killSwitchCraftingMutations = true;
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-crafting' } } as never);

    const result = await craftItemAction({ recipeId: 'legendary_recipe_01' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected feature-disabled ActionResult.');
    }

    expect(result.error.code).toBe('FEATURE_DISABLED');
    expect(vi.mocked(CraftingService.craftItem)).not.toHaveBeenCalled();
  });

  it('salvageItemAction returns FEATURE_DISABLED when crafting kill-switch is active', async () => {
    featureFlags.killSwitchCraftingMutations = true;
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-crafting' } } as never);

    const result = await salvageItemAction({
      itemDefinitionId: 'scrap_metal',
      quantity: 1,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected feature-disabled ActionResult.');
    }

    expect(result.error.code).toBe('FEATURE_DISABLED');
    expect(vi.mocked(SalvageService.salvageItem)).not.toHaveBeenCalled();
  });

  it('craftItemAction keeps normal flow when crafting kill-switch is inactive', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-crafting' } } as never);
    vi.mocked(CraftingService.craftItem).mockResolvedValue(undefined as never);

    const result = await craftItemAction({ recipeId: 'legendary_recipe_01' });

    expect(result.success).toBe(true);
    expect(vi.mocked(CraftingService.craftItem)).toHaveBeenCalledTimes(1);
  });
});
