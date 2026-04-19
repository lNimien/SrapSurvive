import 'server-only';

import { LedgerEntryType } from '@prisma/client';
import { evaluateBalanceGovernanceGuardrails } from '@/config/balance-governance.config';
import {
  EconomyObservabilityRepository,
  ExtractionStatusAggregateRow,
  LedgerEntryAggregateRow,
} from '@/server/repositories/economy-observability.repository';

const HOURS_24_MS = 24 * 60 * 60 * 1_000;
const DAYS_7_MS = 7 * 24 * 60 * 60 * 1_000;
const TOP_ENTRY_LIMIT = 3;

type EntryFlowType = 'faucet' | 'sink' | 'neutral';

const LEDGER_ENTRY_FLOW: Record<LedgerEntryType, EntryFlowType> = {
  INITIAL: 'neutral',
  EXTRACTION_REWARD: 'faucet',
  CATASTROPHE_PENALTY: 'sink',
  PURCHASE: 'sink',
  SALE: 'faucet',
  CONTRACT_REWARD: 'faucet',
  ADMIN_ADJUSTMENT: 'faucet',
};

export interface EconomyWindowTelemetry {
  faucetTotal: number;
  sinkTotal: number;
  netDelta: number;
  extractionSuccessCount: number;
  extractionFailedCount: number;
  activeUsers: number;
}

export interface EconomyEntryTypeTelemetry {
  entryType: LedgerEntryType;
  totalAmount: number;
  transactionCount: number;
}

export interface EconomyObservabilityTelemetry {
  window24h: EconomyWindowTelemetry;
  window7d: EconomyWindowTelemetry;
  topFaucetEntryTypes24h: EconomyEntryTypeTelemetry[];
  topSinkEntryTypes24h: EconomyEntryTypeTelemetry[];
  governance: ReturnType<typeof evaluateBalanceGovernanceGuardrails>;
}

interface WindowAggregationOutput {
  telemetry: EconomyWindowTelemetry;
  groupedEntries: EconomyEntryTypeTelemetry[];
}

function toLedgerEntryType(rawEntryType: string): LedgerEntryType {
  if (!(rawEntryType in LEDGER_ENTRY_FLOW)) {
    throw new Error(`[EconomyObservabilityService] Unsupported ledger entry type: ${rawEntryType}`);
  }

  return rawEntryType as LedgerEntryType;
}

function aggregateExtractionCounts(
  extractionRows: ExtractionStatusAggregateRow[],
): Pick<EconomyWindowTelemetry, 'extractionSuccessCount' | 'extractionFailedCount'> {
  let extractionSuccessCount = 0;
  let extractionFailedCount = 0;

  for (const row of extractionRows) {
    if (row.status === 'EXTRACTED') {
      extractionSuccessCount += row.count;
      continue;
    }

    if (row.status === 'FAILED') {
      extractionFailedCount += row.count;
    }
  }

  return {
    extractionSuccessCount,
    extractionFailedCount,
  };
}

function aggregateLedgerWindow(ledgerRows: LedgerEntryAggregateRow[]): {
  faucetTotal: number;
  sinkTotal: number;
  netDelta: number;
  groupedEntries: EconomyEntryTypeTelemetry[];
} {
  let faucetTotal = 0;
  let sinkTotal = 0;
  let netDelta = 0;

  const groupedEntries: EconomyEntryTypeTelemetry[] = [];

  for (const row of ledgerRows) {
    const entryType = toLedgerEntryType(row.entryType);
    const flow = LEDGER_ENTRY_FLOW[entryType];
    const amountSum = row.amountSum;

    groupedEntries.push({
      entryType,
      totalAmount: amountSum,
      transactionCount: row.transactionCount,
    });

    if (flow === 'faucet') {
      faucetTotal += amountSum;
      netDelta += amountSum;
      continue;
    }

    if (flow === 'sink') {
      sinkTotal += Math.abs(amountSum);
      netDelta += amountSum;
    }
  }

  return {
    faucetTotal,
    sinkTotal,
    netDelta,
    groupedEntries,
  };
}

function computeActiveUsers(ledgerUserIds: string[], extractionUserIds: string[]): number {
  return new Set<string>([...ledgerUserIds, ...extractionUserIds]).size;
}

function sortTopEntryTypes(
  groupedEntries: EconomyEntryTypeTelemetry[],
  flow: Extract<EntryFlowType, 'faucet' | 'sink'>,
): EconomyEntryTypeTelemetry[] {
  const filteredEntries = groupedEntries
    .filter((entry) => {
      if (LEDGER_ENTRY_FLOW[entry.entryType] !== flow) {
        return false;
      }

      if (flow === 'faucet') {
        return entry.totalAmount > 0;
      }

      return entry.totalAmount < 0;
    })
    .sort((left, right) => Math.abs(right.totalAmount) - Math.abs(left.totalAmount));

  return filteredEntries.slice(0, TOP_ENTRY_LIMIT).map((entry) => ({
    ...entry,
    totalAmount: Math.abs(entry.totalAmount),
  }));
}

function getEntryAmountByType(
  groupedEntries: EconomyEntryTypeTelemetry[],
  entryType: LedgerEntryType,
): number {
  const entry = groupedEntries.find((candidate) => candidate.entryType === entryType);
  return entry ? Math.max(0, entry.totalAmount) : 0;
}

async function aggregateWindow(since: Date): Promise<WindowAggregationOutput> {
  const [ledgerRows, extractionRows, ledgerUsers, extractionUsers] = await Promise.all([
    EconomyObservabilityRepository.getLedgerEntryAggregates(since),
    EconomyObservabilityRepository.getExtractionStatusAggregates(since),
    EconomyObservabilityRepository.getLedgerActiveUsers(since),
    EconomyObservabilityRepository.getExtractionActiveUsers(since),
  ]);

  const ledgerAggregation = aggregateLedgerWindow(ledgerRows);
  const extractionCounts = aggregateExtractionCounts(extractionRows);

  return {
    telemetry: {
      faucetTotal: ledgerAggregation.faucetTotal,
      sinkTotal: ledgerAggregation.sinkTotal,
      netDelta: ledgerAggregation.netDelta,
      extractionSuccessCount: extractionCounts.extractionSuccessCount,
      extractionFailedCount: extractionCounts.extractionFailedCount,
      activeUsers: computeActiveUsers(ledgerUsers, extractionUsers),
    },
    groupedEntries: ledgerAggregation.groupedEntries,
  };
}

export const EconomyObservabilityService = {
  async getEconomyTelemetry(params?: { now?: Date }): Promise<EconomyObservabilityTelemetry> {
    const now = params?.now ?? new Date();
    const since24h = new Date(now.getTime() - HOURS_24_MS);
    const since7d = new Date(now.getTime() - DAYS_7_MS);

    const [window24hData, window7dData] = await Promise.all([
      aggregateWindow(since24h),
      aggregateWindow(since7d),
    ]);

    return {
      window24h: window24hData.telemetry,
      window7d: window7dData.telemetry,
      topFaucetEntryTypes24h: sortTopEntryTypes(window24hData.groupedEntries, 'faucet'),
      topSinkEntryTypes24h: sortTopEntryTypes(window24hData.groupedEntries, 'sink'),
      governance: evaluateBalanceGovernanceGuardrails({
        faucetTotal24h: window24hData.telemetry.faucetTotal,
        sinkTotal24h: window24hData.telemetry.sinkTotal,
        extractionSuccessCount24h: window24hData.telemetry.extractionSuccessCount,
        extractionFailedCount24h: window24hData.telemetry.extractionFailedCount,
        saleFaucetTotal24h: getEntryAmountByType(window24hData.groupedEntries, 'SALE'),
      }),
    };
  },
};

export const economyObservabilityInternals = {
  aggregateLedgerWindow,
  aggregateExtractionCounts,
  sortTopEntryTypes,
  getEntryAmountByType,
};
