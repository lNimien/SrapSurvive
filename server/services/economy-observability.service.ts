import 'server-only';

import { LedgerEntryType } from '@prisma/client';
import { evaluateBalanceGovernanceGuardrails } from '@/config/balance-governance.config';
import { db } from '@/server/db/client';
import {
  AuditLogWindowRow,
  EconomyObservabilityRepository,
  ExtractionStatusAggregateRow,
  LedgerEntryAggregateRow,
} from '@/server/repositories/economy-observability.repository';
import {
  MutatorAdjustmentHistoryEntry,
  MutatorTuningService,
  MutatorTuningStorageSource,
} from '@/server/services/mutator-tuning.service';

const HOURS_24_MS = 24 * 60 * 60 * 1_000;
const DAYS_7_MS = 7 * 24 * 60 * 60 * 1_000;
const DAYS_30_MS = 30 * 24 * 60 * 60 * 1_000;
const TOP_ENTRY_LIMIT = 3;
const CLAIM_AUDIT_ACTION = 'liveops.weekly.claim';
const CLAIM_ATTEMPT_AUDIT_ACTION = 'liveops.weekly.claim_attempt';
const RUN_EXTRACTION_AUDIT_ACTION = 'run.extraction';
const RUN_CATASTROPHE_AUDIT_ACTION = 'run.catastrophe';
const MUTATOR_BLOCKED_SUGGESTION_AUDIT_ACTION = 'ops.mutator_suggestion_blocked';

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
  runMutatorHealth: RunMutatorHealthTelemetry;
  runMutatorActionPack: RunMutatorActionPack;
  mutatorAdjustmentHistory: MutatorAdjustmentHistoryEntry[];
  mutatorRecentAdjustedKeys7d: string[];
  mutatorTuningSource: MutatorTuningStorageSource;
  governance: ReturnType<typeof evaluateBalanceGovernanceGuardrails>;
}

export interface RunMutatorActionSuggestion {
  mutatorId: string;
  runMode: 'SAFE' | 'HARD';
  status: 'warning' | 'critical';
  actionType: 'buff_difficulty' | 'nerf_rewards' | 'hold';
  suggestedDeltaPercent: number;
  rationale: string;
  sampleSize: number;
  applicability: 'APPLICABLE' | 'BLOCKED';
  blockedReasons: string[];
}

export interface RunMutatorActionPack {
  generatedAt: string;
  suggestions: RunMutatorActionSuggestion[];
  policySummary: string[];
}


export interface RunMutatorMetric {
  mutatorId: string;
  runMode: 'SAFE' | 'HARD';
  totalRuns: number;
  extractedRuns: number;
  failedRuns: number;
  extractionRate: number;
  averageDurationSeconds: number;
  guardrailStatus: 'healthy' | 'warning' | 'critical' | 'insufficient_data';
  recommendation: string;
}

export interface RunMutatorHealthTelemetry {
  window24h: RunMutatorMetric[];
  window7d: RunMutatorMetric[];
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

interface RunMutatorSample {
  createdAt: Date;
  runMode: 'SAFE' | 'HARD';
  mutatorId: string;
  elapsedSeconds: number;
  outcome: 'EXTRACTED' | 'FAILED';
}

interface MutatorPolicyContext {
  hasActiveIncident: boolean;
  recentAppliedAdjustments: Set<string>;
}

const MUTATOR_GUARDRAIL_MIN_SAMPLE = 12;
const MUTATOR_GUARDRAIL_WARNING = { min: 0.35, max: 0.9 };
const MUTATOR_GUARDRAIL_CRITICAL = { min: 0.25, max: 0.95 };

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

function parseRunMutatorRow(
  row: AuditLogWindowRow,
  outcome: 'EXTRACTED' | 'FAILED',
): RunMutatorSample | null {
  if (!isObjectRecord(row.payload)) {
    return null;
  }

  const runMode = row.payload.runMode === 'HARD' ? 'HARD' : row.payload.runMode === 'SAFE' ? 'SAFE' : null;
  const elapsedSeconds = toFiniteNonNegativeNumber(row.payload.elapsedSeconds);
  const mutator = isObjectRecord(row.payload.runMutator) ? row.payload.runMutator : null;
  const mutatorId = typeof mutator?.id === 'string' ? mutator.id : null;

  if (!runMode || elapsedSeconds === null || !mutatorId) {
    return null;
  }

  return {
    createdAt: row.createdAt,
    runMode,
    mutatorId,
    elapsedSeconds: Math.floor(elapsedSeconds),
    outcome,
  };
}

function aggregateRunMutatorWindow(samples: RunMutatorSample[]): RunMutatorMetric[] {
  const aggregates = new Map<string, {
    mutatorId: string;
    runMode: 'SAFE' | 'HARD';
    totalRuns: number;
    extractedRuns: number;
    failedRuns: number;
    durationTotal: number;
  }>();

  for (const sample of samples) {
    const key = `${sample.mutatorId}:${sample.runMode}`;
    const current = aggregates.get(key) ?? {
      mutatorId: sample.mutatorId,
      runMode: sample.runMode,
      totalRuns: 0,
      extractedRuns: 0,
      failedRuns: 0,
      durationTotal: 0,
    };

    current.totalRuns += 1;
    current.durationTotal += sample.elapsedSeconds;
    if (sample.outcome === 'EXTRACTED') {
      current.extractedRuns += 1;
    } else {
      current.failedRuns += 1;
    }

    aggregates.set(key, current);
  }

  return [...aggregates.values()]
    .map((entry) => {
      const extractionRate = entry.totalRuns === 0 ? 0 : entry.extractedRuns / entry.totalRuns;
      const guardrail = evaluateMutatorGuardrail(extractionRate, entry.totalRuns);

      return {
        mutatorId: entry.mutatorId,
        runMode: entry.runMode,
        totalRuns: entry.totalRuns,
        extractedRuns: entry.extractedRuns,
        failedRuns: entry.failedRuns,
        extractionRate,
        averageDurationSeconds: entry.totalRuns === 0 ? 0 : Math.round(entry.durationTotal / entry.totalRuns),
        guardrailStatus: guardrail.status,
        recommendation: guardrail.recommendation,
      };
    })
    .sort((left, right) => right.totalRuns - left.totalRuns || left.mutatorId.localeCompare(right.mutatorId));
}

function evaluateMutatorGuardrail(
  extractionRate: number,
  totalRuns: number,
): {
  status: 'healthy' | 'warning' | 'critical' | 'insufficient_data';
  recommendation: string;
} {
  if (totalRuns < MUTATOR_GUARDRAIL_MIN_SAMPLE) {
    return {
      status: 'insufficient_data',
      recommendation: `Muestra insuficiente (<${MUTATOR_GUARDRAIL_MIN_SAMPLE} runs): observar otra ventana antes de ajustar.`,
    };
  }

  if (extractionRate < MUTATOR_GUARDRAIL_CRITICAL.min || extractionRate > MUTATOR_GUARDRAIL_CRITICAL.max) {
    return {
      status: 'critical',
      recommendation:
        extractionRate > MUTATOR_GUARDRAIL_CRITICAL.max
          ? 'Éxito extremo: considerar nerf de payout o aumento de riesgo del mutador.'
          : 'Fallo extremo: considerar buff de payout o reducción de presión de riesgo.',
    };
  }

  if (extractionRate < MUTATOR_GUARDRAIL_WARNING.min || extractionRate > MUTATOR_GUARDRAIL_WARNING.max) {
    return {
      status: 'warning',
      recommendation:
        extractionRate > MUTATOR_GUARDRAIL_WARNING.max
          ? 'Éxito alto sostenido: revisar tuning de recompensa para evitar trivialización.'
          : 'Éxito bajo sostenido: revisar tuning de dificultad para evitar frustración.',
    };
  }

  return {
    status: 'healthy',
    recommendation: 'Mutador dentro de banda objetivo: mantener y seguir monitoreando.',
  };
}

function buildMutatorKey(mutatorId: string, runMode: 'SAFE' | 'HARD'): string {
  return `${mutatorId}:${runMode}`;
}

function buildRunMutatorActionPack(
  metrics: RunMutatorMetric[],
  now: Date,
  policyContext: MutatorPolicyContext,
): RunMutatorActionPack {
  const policySummary: string[] = [
    'No aplicar con incidentes/kill-switch activos.',
    'No aplicar más de 1 ajuste por mutador+modo en 7d.',
  ];

  const suggestions = metrics
    .filter((metric) => metric.guardrailStatus === 'critical' || metric.guardrailStatus === 'warning')
    .map<RunMutatorActionSuggestion>((metric) => {
      const status = metric.guardrailStatus as 'warning' | 'critical';
      const severityDelta = status === 'critical' ? 8 : 5;
      const tooEasy = metric.extractionRate > MUTATOR_GUARDRAIL_WARNING.max;

      const mutatorKey = `${metric.mutatorId}:${metric.runMode}`;
      const blockedReasons: string[] = [];

      if (policyContext.hasActiveIncident) {
        blockedReasons.push('Incidente/kill-switch activo: congelar ajustes de balance.');
      }

      if (policyContext.recentAppliedAdjustments.has(mutatorKey)) {
        blockedReasons.push('Ya existe ajuste aplicado para este mutador+modo en la ventana de 7d.');
      }

      const applicability: 'APPLICABLE' | 'BLOCKED' = blockedReasons.length > 0 ? 'BLOCKED' : 'APPLICABLE';

      if (tooEasy) {
        if (metric.runMode === 'HARD') {
          return {
            mutatorId: metric.mutatorId,
            runMode: metric.runMode,
            status,
            actionType: 'buff_difficulty',
            suggestedDeltaPercent: severityDelta,
            rationale: 'Winrate alta sostenida en HARD: subir presión de riesgo para recuperar tensión.',
            sampleSize: metric.totalRuns,
            applicability,
            blockedReasons,
          };
        }

        return {
          mutatorId: metric.mutatorId,
          runMode: metric.runMode,
          status,
          actionType: 'nerf_rewards',
          suggestedDeltaPercent: -severityDelta,
          rationale: 'Winrate alta sostenida en SAFE: recortar payout para evitar trivialización.',
          sampleSize: metric.totalRuns,
          applicability,
          blockedReasons,
        };
      }

      return {
        mutatorId: metric.mutatorId,
        runMode: metric.runMode,
        status,
        actionType: 'hold',
        suggestedDeltaPercent: 0,
        rationale: 'Winrate baja: mantener cambios automáticos en hold y revisar tuning manual con cohortes.',
        sampleSize: metric.totalRuns,
        applicability,
        blockedReasons,
      };
    })
    .sort((left, right) => {
      const statusWeight = (value: 'warning' | 'critical') => (value === 'critical' ? 2 : 1);
      return statusWeight(right.status) - statusWeight(left.status) || right.sampleSize - left.sampleSize;
    })
    .slice(0, 3);

  return {
    generatedAt: now.toISOString(),
    suggestions,
    policySummary,
  };
}

async function recordBlockedMutatorSuggestions(
  reviewerUserId: string,
  suggestions: RunMutatorActionSuggestion[],
  now: Date,
): Promise<void> {
  const blocked = suggestions.filter((suggestion) => suggestion.applicability === 'BLOCKED');
  if (blocked.length === 0) {
    return;
  }

  const since24h = new Date(now.getTime() - HOURS_24_MS);
  const existingRows = await EconomyObservabilityRepository.getAuditLogsByActionSince(
    MUTATOR_BLOCKED_SUGGESTION_AUDIT_ACTION,
    since24h,
  );

  const existingFingerprints = new Set(
    existingRows
      .map((row) => {
        const payload = row.payload as Record<string, unknown>;
        return typeof payload.fingerprint === 'string' ? payload.fingerprint : null;
      })
      .filter((fingerprint): fingerprint is string => fingerprint !== null),
  );

  for (const suggestion of blocked) {
    const fingerprint = `${suggestion.mutatorId}:${suggestion.runMode}:${suggestion.actionType}`;
    if (existingFingerprints.has(fingerprint)) {
      continue;
    }

    await db.auditLog.create({
      data: {
        userId: reviewerUserId,
        action: MUTATOR_BLOCKED_SUGGESTION_AUDIT_ACTION,
        payload: {
          fingerprint,
          mutatorId: suggestion.mutatorId,
          runMode: suggestion.runMode,
          actionType: suggestion.actionType,
          suggestedDeltaPercent: suggestion.suggestedDeltaPercent,
          blockedReasons: suggestion.blockedReasons,
        },
      },
    });
  }
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
  groupedEntries: readonly EconomyEntryTypeTelemetry[],
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
  groupedEntries: readonly EconomyEntryTypeTelemetry[],
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
  async getEconomyTelemetry(params?: { now?: Date; hasActiveIncident?: boolean; reviewerUserId?: string }): Promise<EconomyObservabilityTelemetry> {
    const now = params?.now ?? new Date();
    const since24h = new Date(now.getTime() - HOURS_24_MS);
    const since7d = new Date(now.getTime() - DAYS_7_MS);
    const since30d = new Date(now.getTime() - DAYS_30_MS);

    const [window24hData, window7dData, claimAttemptAuditRows, claimRewardAuditRows, runExtractionAuditRows, runCatastropheAuditRows, mutatorAdjustmentResult] = await Promise.all([
      aggregateWindow(since24h),
      aggregateWindow(since7d),
      EconomyObservabilityRepository.getAuditLogsByActionSince(CLAIM_ATTEMPT_AUDIT_ACTION, since7d),
      EconomyObservabilityRepository.getAuditLogsByActionSince(CLAIM_AUDIT_ACTION, since7d),
      EconomyObservabilityRepository.getAuditLogsByActionSince(RUN_EXTRACTION_AUDIT_ACTION, since7d),
      EconomyObservabilityRepository.getAuditLogsByActionSince(RUN_CATASTROPHE_AUDIT_ACTION, since7d),
      MutatorTuningService.listAdjustmentHistoryWithSource(since30d),
    ]);

    const mutatorAdjustmentHistory = mutatorAdjustmentResult.entries;

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

    const parsedRunMutators = [
      ...runExtractionAuditRows
        .map((row) => parseRunMutatorRow(row, 'EXTRACTED'))
        .filter((row): row is RunMutatorSample => row !== null),
      ...runCatastropheAuditRows
        .map((row) => parseRunMutatorRow(row, 'FAILED'))
        .filter((row): row is RunMutatorSample => row !== null),
    ];

    const runMutators24h = parsedRunMutators.filter((row) => isInsideWindow(row.createdAt, since24h));

    const runMutatorHealth: RunMutatorHealthTelemetry = {
      window24h: aggregateRunMutatorWindow(runMutators24h),
      window7d: aggregateRunMutatorWindow(parsedRunMutators),
    };

    const mutatorRecentAdjustedKeys7d = Array.from(
      new Set(
        mutatorAdjustmentHistory
          .filter((entry) => new Date(entry.createdAt).getTime() >= since7d.getTime())
          .map((entry) => buildMutatorKey(entry.mutatorId, entry.runMode)),
      ),
    );

    const recentAppliedAdjustments = new Set(mutatorRecentAdjustedKeys7d);

    const runMutatorActionPack = buildRunMutatorActionPack(runMutatorHealth.window7d, now, {
      hasActiveIncident: Boolean(params?.hasActiveIncident),
      recentAppliedAdjustments,
    });

    if (params?.reviewerUserId) {
      await recordBlockedMutatorSuggestions(params.reviewerUserId, runMutatorActionPack.suggestions, now);
    }

    return {
      window24h: window24hData.telemetry,
      window7d: window7dData.telemetry,
      topFaucetEntryTypes24h: sortTopEntryTypes(window24hData.groupedEntries, 'faucet'),
      topSinkEntryTypes24h: sortTopEntryTypes(window24hData.groupedEntries, 'sink'),
      weeklyClaimsHealth,
      runMutatorHealth,
      runMutatorActionPack,
      mutatorAdjustmentHistory,
      mutatorRecentAdjustedKeys7d,
      mutatorTuningSource: mutatorAdjustmentResult.source,
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
  aggregateRunMutatorWindow,
  parseRunMutatorRow,
  evaluateMutatorGuardrail,
  buildRunMutatorActionPack,
  buildMutatorKey,
};
