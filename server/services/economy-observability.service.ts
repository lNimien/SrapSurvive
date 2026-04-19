import 'server-only';

import { LedgerEntryType } from '@prisma/client';
import { evaluateBalanceGovernanceGuardrails } from '@/config/balance-governance.config';
import {
  AuditLogWindowRow,
  EconomyObservabilityRepository,
  ExtractionStatusAggregateRow,
  LedgerEntryAggregateRow,
} from '@/server/repositories/economy-observability.repository';

const HOURS_24_MS = 24 * 60 * 60 * 1_000;
const DAYS_7_MS = 7 * 24 * 60 * 60 * 1_000;
const TOP_ENTRY_LIMIT = 3;
const CLAIM_AUDIT_ACTION = 'liveops.weekly.claim';
const CLAIM_ATTEMPT_AUDIT_ACTION = 'liveops.weekly.claim_attempt';

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
  weeklyClaimsHealth: WeeklyClaimsHealthTelemetry;
  governance: ReturnType<typeof evaluateBalanceGovernanceGuardrails>;
}

export type WeeklyClaimOutcome = 'CLAIMED' | 'ALREADY_CLAIMED' | 'NOT_CLAIMABLE' | 'FEATURE_DISABLED' | 'ERROR';

export interface WeeklyClaimLatencyTelemetry {
  p50Ms: number | null;
  p95Ms: number | null;
}

export interface WeeklyClaimItemFaucetTelemetry {
  itemDefinitionId: string;
  quantity: number;
}

export interface WeeklyClaimsWindowTelemetry {
  totalAttempts: number;
  attemptsByOutcome: Record<WeeklyClaimOutcome, number>;
  successRatio: number;
  latency: WeeklyClaimLatencyTelemetry;
  itemFaucetByItemDef: WeeklyClaimItemFaucetTelemetry[];
}

export interface WeeklyClaimsHealthTelemetry {
  window24h: WeeklyClaimsWindowTelemetry;
  window7d: WeeklyClaimsWindowTelemetry;
}

interface WindowAggregationOutput {
  telemetry: EconomyWindowTelemetry;
  groupedEntries: EconomyEntryTypeTelemetry[];
}

interface WeeklyClaimAttemptSample {
  createdAt: Date;
  outcome: WeeklyClaimOutcome;
  durationMs: number;
}

interface WeeklyClaimRewardSample {
  createdAt: Date;
  rewardItems: WeeklyClaimItemFaucetTelemetry[];
}

const WEEKLY_CLAIM_OUTCOMES: WeeklyClaimOutcome[] = [
  'CLAIMED',
  'ALREADY_CLAIMED',
  'NOT_CLAIMABLE',
  'FEATURE_DISABLED',
  'ERROR',
];

function createEmptyClaimOutcomeCounters(): Record<WeeklyClaimOutcome, number> {
  return {
    CLAIMED: 0,
    ALREADY_CLAIMED: 0,
    NOT_CLAIMABLE: 0,
    FEATURE_DISABLED: 0,
    ERROR: 0,
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function toWeeklyClaimOutcome(value: unknown): WeeklyClaimOutcome | null {
  if (typeof value !== 'string') {
    return null;
  }

  return WEEKLY_CLAIM_OUTCOMES.includes(value as WeeklyClaimOutcome) ? (value as WeeklyClaimOutcome) : null;
}

function toFiniteNonNegativeNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, value);
}

function parseWeeklyClaimAttemptRow(row: AuditLogWindowRow): WeeklyClaimAttemptSample | null {
  if (!isObjectRecord(row.payload)) {
    return null;
  }

  const outcome = toWeeklyClaimOutcome(row.payload.outcome);
  const durationMs = toFiniteNonNegativeNumber(row.payload.durationMs);

  if (!outcome || durationMs === null) {
    return null;
  }

  return {
    createdAt: row.createdAt,
    outcome,
    durationMs,
  };
}

function parseWeeklyClaimRewardRow(row: AuditLogWindowRow): WeeklyClaimRewardSample | null {
  if (!isObjectRecord(row.payload) || !Array.isArray(row.payload.rewardItems)) {
    return null;
  }

  const rewardItems = row.payload.rewardItems
    .filter((rewardItem): rewardItem is { itemDefinitionId: string; quantity: number } => {
      if (!isObjectRecord(rewardItem)) {
        return false;
      }

      return (
        typeof rewardItem.itemDefinitionId === 'string' &&
        rewardItem.itemDefinitionId.length > 0 &&
        typeof rewardItem.quantity === 'number' &&
        Number.isFinite(rewardItem.quantity) &&
        rewardItem.quantity > 0
      );
    })
    .map((rewardItem) => ({
      itemDefinitionId: rewardItem.itemDefinitionId,
      quantity: Math.floor(rewardItem.quantity),
    }));

  return {
    createdAt: row.createdAt,
    rewardItems,
  };
}

function computeLatencyPercentile(samples: number[], percentile: number): number | null {
  if (samples.length === 0) {
    return null;
  }

  const sortedSamples = [...samples].sort((left, right) => left - right);
  const rank = Math.ceil(percentile * sortedSamples.length) - 1;
  const normalizedRank = Math.max(0, Math.min(sortedSamples.length - 1, rank));
  return Math.round(sortedSamples[normalizedRank]);
}

function aggregateWeeklyClaimWindow(
  attempts: WeeklyClaimAttemptSample[],
  claimRewards: WeeklyClaimRewardSample[],
): WeeklyClaimsWindowTelemetry {
  const attemptsByOutcome = createEmptyClaimOutcomeCounters();

  for (const attempt of attempts) {
    attemptsByOutcome[attempt.outcome] += 1;
  }

  const totalAttempts = attempts.length;
  const successRatio = totalAttempts === 0 ? 0 : attemptsByOutcome.CLAIMED / totalAttempts;

  const faucetByItemDefinition = new Map<string, number>();
  for (const claimReward of claimRewards) {
    for (const rewardItem of claimReward.rewardItems) {
      const previousQuantity = faucetByItemDefinition.get(rewardItem.itemDefinitionId) ?? 0;
      faucetByItemDefinition.set(rewardItem.itemDefinitionId, previousQuantity + rewardItem.quantity);
    }
  }

  const itemFaucetByItemDef = [...faucetByItemDefinition.entries()]
    .map(([itemDefinitionId, quantity]) => ({ itemDefinitionId, quantity }))
    .sort((left, right) => right.quantity - left.quantity || left.itemDefinitionId.localeCompare(right.itemDefinitionId));

  return {
    totalAttempts,
    attemptsByOutcome,
    successRatio,
    latency: {
      p50Ms: computeLatencyPercentile(
        attempts.map((attempt) => attempt.durationMs),
        0.5,
      ),
      p95Ms: computeLatencyPercentile(
        attempts.map((attempt) => attempt.durationMs),
        0.95,
      ),
    },
    itemFaucetByItemDef,
  };
}

function isInsideWindow(rowDate: Date, since: Date): boolean {
  return rowDate.getTime() >= since.getTime();
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

    const [window24hData, window7dData, claimAttemptAuditRows, claimRewardAuditRows] = await Promise.all([
      aggregateWindow(since24h),
      aggregateWindow(since7d),
      EconomyObservabilityRepository.getAuditLogsByActionSince(CLAIM_ATTEMPT_AUDIT_ACTION, since7d),
      EconomyObservabilityRepository.getAuditLogsByActionSince(CLAIM_AUDIT_ACTION, since7d),
    ]);

    const parsedAttemptRows = claimAttemptAuditRows
      .map((row) => parseWeeklyClaimAttemptRow(row))
      .filter((row): row is WeeklyClaimAttemptSample => row !== null);

    const parsedRewardRows = claimRewardAuditRows
      .map((row) => parseWeeklyClaimRewardRow(row))
      .filter((row): row is WeeklyClaimRewardSample => row !== null);

    const attempts24h = parsedAttemptRows.filter((row) => isInsideWindow(row.createdAt, since24h));
    const rewardRows24h = parsedRewardRows.filter((row) => isInsideWindow(row.createdAt, since24h));

    const weeklyClaimsHealth: WeeklyClaimsHealthTelemetry = {
      window24h: aggregateWeeklyClaimWindow(attempts24h, rewardRows24h),
      window7d: aggregateWeeklyClaimWindow(parsedAttemptRows, parsedRewardRows),
    };

    return {
      window24h: window24hData.telemetry,
      window7d: window7dData.telemetry,
      topFaucetEntryTypes24h: sortTopEntryTypes(window24hData.groupedEntries, 'faucet'),
      topSinkEntryTypes24h: sortTopEntryTypes(window24hData.groupedEntries, 'sink'),
      weeklyClaimsHealth,
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
  computeLatencyPercentile,
  aggregateWeeklyClaimWindow,
};
