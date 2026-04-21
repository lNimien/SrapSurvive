import { describe, expect, it } from 'vitest';

import {
  getContractActionState,
  getContractOperationalMeta,
  getContractOperationalState,
  getContractProgress,
} from '@/lib/utils/contracts-ui';
import { UserContractDTO } from '@/types/dto.types';

function buildContract(overrides: Partial<UserContractDTO> = {}): UserContractDTO {
  return {
    id: 'contract-1',
    requiredItemDefId: 'scrap_metal',
    requiredItemName: 'Metal Chatarra',
    requiredItemIcon: 'icon_scrap',
    requiredQuantity: 10,
    currentQuantity: 2,
    availableQuantity: 0,
    rewardCC: 120,
    rewardXP: 40,
    status: 'ACTIVE',
    expiresAt: new Date('2026-04-21T23:59:59.000Z').toISOString(),
    ...overrides,
  };
}

describe('contracts ui helpers', () => {
  it('marks active contract as ready when inventory covers remaining quantity', () => {
    const contract = buildContract({ currentQuantity: 3, availableQuantity: 7 });

    expect(getContractOperationalState(contract)).toBe('ready');
    expect(getContractActionState(contract)).toMatchObject({
      disabled: false,
      quantityToDeliver: 7,
      label: 'Entregar 7 u',
    });
  });

  it('keeps active contract as incomplete and supports partial delivery when possible', () => {
    const contract = buildContract({ currentQuantity: 1, availableQuantity: 4 });

    expect(getContractOperationalState(contract)).toBe('incomplete');
    expect(getContractActionState(contract)).toMatchObject({
      disabled: false,
      quantityToDeliver: 4,
      label: 'Entregar parcial (4 u)',
    });
  });

  it('blocks action for delivered and expired contracts', () => {
    expect(getContractActionState(buildContract({ status: 'COMPLETED', currentQuantity: 10, availableQuantity: 3 }))).toMatchObject({
      disabled: true,
      label: 'Entregado',
    });

    expect(getContractActionState(buildContract({ status: 'EXPIRED', availableQuantity: 9 }))).toMatchObject({
      disabled: true,
      label: 'Bloqueado',
    });
  });

  it('returns consistent progress snapshot and meta labels', () => {
    const progress = getContractProgress(buildContract({ currentQuantity: 5, availableQuantity: 2 }));

    expect(progress).toMatchObject({
      delivered: 5,
      required: 10,
      remaining: 5,
      available: 2,
      progressPercent: 50,
    });

    expect(getContractOperationalMeta('incomplete').label).toBe('Incompleto');
    expect(getContractOperationalMeta('ready').label).toBe('Listo');
    expect(getContractOperationalMeta('delivered').label).toBe('Entregado');
    expect(getContractOperationalMeta('blocked').label).toBe('Bloqueado');
  });
});
