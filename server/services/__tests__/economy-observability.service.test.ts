import 'server-only';

import { describe, expect, it } from 'vitest';

import { economyObservabilityInternals } from '@/server/services/economy-observability.service';

describe('economy observability service internals', () => {
  it('aggregates faucet/sink totals and net delta deterministically', () => {
    const aggregation = economyObservabilityInternals.aggregateLedgerWindow([
      { entryType: 'EXTRACTION_REWARD', transactionCount: 2, amountSum: 150 },
      { entryType: 'CONTRACT_REWARD', transactionCount: 1, amountSum: 40 },
      { entryType: 'PURCHASE', transactionCount: 1, amountSum: -25 },
      { entryType: 'CATASTROPHE_PENALTY', transactionCount: 1, amountSum: -10 },
      { entryType: 'INITIAL', transactionCount: 1, amountSum: 0 },
    ]);

    expect(aggregation.faucetTotal).toBe(190);
    expect(aggregation.sinkTotal).toBe(35);
    expect(aggregation.netDelta).toBe(155);
  });

  it('returns top faucet and sink entries sorted by absolute amount', () => {
    const groupedEntries = [
      { entryType: 'EXTRACTION_REWARD', totalAmount: 120, transactionCount: 2 },
      { entryType: 'SALE', totalAmount: 30, transactionCount: 1 },
      { entryType: 'CONTRACT_REWARD', totalAmount: 80, transactionCount: 1 },
      { entryType: 'PURCHASE', totalAmount: -60, transactionCount: 2 },
      { entryType: 'CATASTROPHE_PENALTY', totalAmount: -15, transactionCount: 1 },
      { entryType: 'INITIAL', totalAmount: 0, transactionCount: 4 },
    ] as const;

    const topFaucets = economyObservabilityInternals.sortTopEntryTypes(groupedEntries, 'faucet');
    const topSinks = economyObservabilityInternals.sortTopEntryTypes(groupedEntries, 'sink');

    expect(topFaucets.map((entry) => entry.entryType)).toEqual([
      'EXTRACTION_REWARD',
      'CONTRACT_REWARD',
      'SALE',
    ]);
    expect(topFaucets.map((entry) => entry.totalAmount)).toEqual([120, 80, 30]);

    expect(topSinks.map((entry) => entry.entryType)).toEqual(['PURCHASE', 'CATASTROPHE_PENALTY']);
    expect(topSinks.map((entry) => entry.totalAmount)).toEqual([60, 15]);
  });

  it('extracts specific entry amount by ledger type', () => {
    const groupedEntries = [
      { entryType: 'EXTRACTION_REWARD', totalAmount: 120, transactionCount: 2 },
      { entryType: 'SALE', totalAmount: 35, transactionCount: 1 },
      { entryType: 'PURCHASE', totalAmount: -40, transactionCount: 1 },
    ] as const;

    expect(economyObservabilityInternals.getEntryAmountByType(groupedEntries, 'SALE')).toBe(35);
    expect(economyObservabilityInternals.getEntryAmountByType(groupedEntries, 'CONTRACT_REWARD')).toBe(0);
    expect(economyObservabilityInternals.getEntryAmountByType(groupedEntries, 'PURCHASE')).toBe(0);
  });
});
