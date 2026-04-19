import 'server-only';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/server/db/client', () => ({
  db: {
    $transaction: vi.fn(),
  },
}));

import { auth } from '@/server/auth/auth';
import { db } from '@/server/db/client';
import { featureFlags } from '@/config/feature-flags.config';
import { buyItemAction, sellItemsAction } from '@/server/actions/economy.actions';

describe('economy actions validation/auth guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    featureFlags.killSwitchMarketMutations = false;
  });

  it('buyItemAction returns UNAUTHORIZED when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const result = await buyItemAction({ itemDefinitionId: 'reinforced_helmet' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected unauthorized ActionResult.');
    }

    expect(result.error.code).toBe('UNAUTHORIZED');
    expect(vi.mocked(db.$transaction)).not.toHaveBeenCalled();
  });

  it('buyItemAction returns VALIDATION_ERROR for invalid input', async () => {
    const result = await buyItemAction({ itemDefinitionId: '' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation ActionResult.');
    }

    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(vi.mocked(auth)).not.toHaveBeenCalled();
    expect(vi.mocked(db.$transaction)).not.toHaveBeenCalled();
  });

  it('sellItemsAction returns UNAUTHORIZED when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const result = await sellItemsAction({
      itemDefinitionId: 'scrap_metal',
      amountToSell: 1,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected unauthorized ActionResult.');
    }

    expect(result.error.code).toBe('UNAUTHORIZED');
    expect(vi.mocked(db.$transaction)).not.toHaveBeenCalled();
  });

  it('sellItemsAction returns VALIDATION_ERROR for invalid input', async () => {
    const result = await sellItemsAction({
      itemDefinitionId: 'scrap_metal',
      amountToSell: 0,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation ActionResult.');
    }

    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(vi.mocked(auth)).not.toHaveBeenCalled();
    expect(vi.mocked(db.$transaction)).not.toHaveBeenCalled();
  });

  it('buyItemAction returns FEATURE_DISABLED when market kill-switch is active', async () => {
    featureFlags.killSwitchMarketMutations = true;
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-market' } } as never);

    const result = await buyItemAction({ itemDefinitionId: 'reinforced_helmet' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected feature-disabled ActionResult.');
    }

    expect(result.error.code).toBe('FEATURE_DISABLED');
    expect(vi.mocked(db.$transaction)).not.toHaveBeenCalled();
  });

  it('sellItemsAction returns FEATURE_DISABLED when market kill-switch is active', async () => {
    featureFlags.killSwitchMarketMutations = true;
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-market' } } as never);

    const result = await sellItemsAction({
      itemDefinitionId: 'scrap_metal',
      amountToSell: 1,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected feature-disabled ActionResult.');
    }

    expect(result.error.code).toBe('FEATURE_DISABLED');
    expect(vi.mocked(db.$transaction)).not.toHaveBeenCalled();
  });

  it('buyItemAction keeps normal flow when market kill-switch is inactive', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-market' } } as never);
    vi.mocked(db.$transaction).mockResolvedValue(undefined as never);

    const result = await buyItemAction({ itemDefinitionId: 'reinforced_helmet' });

    expect(result.success).toBe(true);
    expect(vi.mocked(db.$transaction)).toHaveBeenCalledTimes(1);
  });

  it('sellItemsAction propagates UI quantity to ledger and inventory mutation', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-market' } } as never);

    const tx = {
      inventoryItem: {
        findFirst: vi.fn().mockResolvedValue({ id: 'inv_1', quantity: 5 }),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      currencyLedger: {
        findFirst: vi.fn().mockResolvedValue({ balanceAfter: 40 }),
        create: vi.fn().mockResolvedValue(undefined),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue(undefined),
      },
    };

    vi.mocked(db.$transaction).mockImplementation(async (callback: any) => callback(tx as any));

    const result = await sellItemsAction({
      itemDefinitionId: 'scrap_metal',
      amountToSell: 3,
    });

    expect(result.success).toBe(true);
    expect(tx.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { quantity: { decrement: 3 } },
      }),
    );
    expect(tx.currencyLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ referenceId: 'sell_scrap_metal_3' }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payload: expect.objectContaining({ amountToSell: 3 }),
        }),
      }),
    );
  });
});
