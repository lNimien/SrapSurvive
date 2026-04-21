import { describe, expect, it } from 'vitest';

import { computeContractRefreshCostCC } from '@/server/domain/contract/contract-refresh-cost';

describe('computeContractRefreshCostCC', () => {
  it('starts at base cost on first refresh', () => {
    expect(computeContractRefreshCostCC(0)).toBe(85);
  });

  it('scales cost per refresh in same day', () => {
    expect(computeContractRefreshCostCC(1)).toBe(120);
    expect(computeContractRefreshCostCC(2)).toBe(155);
  });

  it('caps refresh cost to avoid runaway inflation', () => {
    expect(computeContractRefreshCostCC(10)).toBe(225);
    expect(computeContractRefreshCostCC(999)).toBe(225);
  });
});
