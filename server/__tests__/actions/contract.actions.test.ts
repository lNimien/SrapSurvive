import 'server-only';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/server/services/contract.service', () => ({
  ContractService: {
    deliverMaterial: vi.fn(),
    refreshContracts: vi.fn(),
  },
}));

import { auth } from '@/server/auth/auth';
import { ContractService } from '@/server/services/contract.service';
import { featureFlags } from '@/config/feature-flags.config';
import { deliverContractAction, refreshContractsAction } from '@/server/actions/contract.actions';

describe('deliverContractAction validation/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    featureFlags.killSwitchContractsMutations = false;
  });

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const result = await deliverContractAction({
      contractId: 'ckqv0x9s70000000000000000',
      quantity: 1,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected unauthorized ActionResult.');
    }

    expect(result.error.code).toBe('UNAUTHORIZED');
    expect(vi.mocked(ContractService.deliverMaterial)).not.toHaveBeenCalled();
  });

  it('returns VALIDATION_ERROR for invalid input payload', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-contract-validation' } } as never);

    const result = await deliverContractAction({
      contractId: 'invalid-id',
      quantity: 0,
    } as never);

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation ActionResult.');
    }

    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(vi.mocked(ContractService.deliverMaterial)).not.toHaveBeenCalled();
  });

  it('returns FEATURE_DISABLED when contracts kill-switch is active', async () => {
    featureFlags.killSwitchContractsMutations = true;
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-contract-guarded' } } as never);

    const result = await deliverContractAction({
      contractId: 'ckqv0x9s70000000000000000',
      quantity: 1,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected feature-disabled ActionResult.');
    }

    expect(result.error.code).toBe('FEATURE_DISABLED');
    expect(vi.mocked(ContractService.deliverMaterial)).not.toHaveBeenCalled();
  });

  it('keeps normal flow when contracts kill-switch is inactive', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-contract-ok' } } as never);
    vi.mocked(ContractService.deliverMaterial).mockResolvedValue(undefined as never);

    const result = await deliverContractAction({
      contractId: 'ckqv0x9s70000000000000000',
      quantity: 1,
    });

    expect(result.success).toBe(true);
    expect(vi.mocked(ContractService.deliverMaterial)).toHaveBeenCalledTimes(1);
  });
});

describe('refreshContractsAction validation/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    featureFlags.killSwitchContractsMutations = false;
  });

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const result = await refreshContractsAction({ requestId: 'request-0001' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected unauthorized ActionResult.');
    }

    expect(result.error.code).toBe('UNAUTHORIZED');
    expect(vi.mocked(ContractService.refreshContracts)).not.toHaveBeenCalled();
  });

  it('returns VALIDATION_ERROR for invalid requestId payload', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-contract-refresh-validation' } } as never);

    const result = await refreshContractsAction({ requestId: '' } as never);

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation ActionResult.');
    }

    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(vi.mocked(ContractService.refreshContracts)).not.toHaveBeenCalled();
  });

  it('returns FEATURE_DISABLED when contracts kill-switch is active', async () => {
    featureFlags.killSwitchContractsMutations = true;
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-contract-refresh' } } as never);

    const result = await refreshContractsAction({ requestId: 'request-kill-switch' });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected feature-disabled ActionResult.');
    }

    expect(result.error.code).toBe('FEATURE_DISABLED');
    expect(vi.mocked(ContractService.refreshContracts)).not.toHaveBeenCalled();
  });
});
