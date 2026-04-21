import 'server-only';

import { describe, expect, it } from 'vitest';

import {
  buildContractChainSnapshot,
  buildContractChainBonusReference,
  computeContractChainBonus,
  getUtcDateSeed,
  resolveContractChainStageCount,
} from '@/server/domain/contract/contract-chain';

describe('contract-chain helpers', () => {
  it('resolves deterministic stage count and date seed', () => {
    const date = new Date('2026-04-21T12:34:56.000Z');
    const seed = getUtcDateSeed(date);

    expect(seed).toBe('2026-04-21');
    expect(resolveContractChainStageCount('user-a', seed)).toBe(resolveContractChainStageCount('user-a', seed));
    expect([2, 3]).toContain(resolveContractChainStageCount('user-a', seed));
  });

  it('builds chain snapshot and marks FAILED when a stage expires', () => {
    const now = new Date('2026-04-21T12:00:00.000Z');
    const contracts = [
      {
        id: 'c-1',
        rewardCC: 100,
        rewardXP: 120,
        status: 'COMPLETED' as const,
        createdAt: new Date('2026-04-21T01:00:00.000Z'),
        expiresAt: new Date('2026-04-21T23:59:59.000Z'),
      },
      {
        id: 'c-2',
        rewardCC: 120,
        rewardXP: 130,
        status: 'EXPIRED' as const,
        createdAt: new Date('2026-04-21T01:01:00.000Z'),
        expiresAt: new Date('2026-04-21T11:59:59.000Z'),
      },
      {
        id: 'c-3',
        rewardCC: 110,
        rewardXP: 115,
        status: 'ACTIVE' as const,
        createdAt: new Date('2026-04-21T01:02:00.000Z'),
        expiresAt: new Date('2026-04-21T23:59:59.000Z'),
      },
    ];

    const snapshot = buildContractChainSnapshot('user-chain', contracts, now);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.state).toBe('FAILED');
    expect(snapshot?.chainContracts.length).toBe(snapshot?.stageCount);
  });

  it('computes bonus and stable reference', () => {
    const bonus = computeContractChainBonus(300, 450, 3);
    expect(bonus).toEqual({ rewardCC: 150, rewardXP: 225 });

    const reference = buildContractChainBonusReference('user-a', '2026-04-21');
    expect(reference).toBe('contract-chain-bonus:user-a:2026-04-21');
  });
});
