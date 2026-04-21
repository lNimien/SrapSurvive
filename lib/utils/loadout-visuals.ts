import { ItemConfigOptionsDTO } from '@/types/dto.types';

export type TacticalSlotVisualState = 'occupied' | 'empty' | 'blocked' | 'incompatible';

export interface ResolveTacticalSlotStateInput {
  isRunActive: boolean;
  hasEquippedItem: boolean;
  candidateCount: number;
}

export interface TacticalSlotVisualMeta {
  label: string;
  description: string;
  panelClass: string;
  badgeClass: string;
}

type TacticalMetricKey = keyof Pick<
  ItemConfigOptionsDTO,
  | 'dangerResistance'
  | 'lootMultiplier'
  | 'currencyMultiplier'
  | 'xpMultiplier'
  | 'backpackCapacity'
  | 'anomalyDetectionBonus'
>;

interface TacticalMetricMeta {
  key: TacticalMetricKey;
  label: string;
}

export type TacticalComparisonTone = 'positive' | 'negative' | 'neutral';

export interface TacticalComparisonRow {
  metricKey: TacticalMetricKey;
  label: string;
  candidateValue: number;
  equippedValue: number;
  delta: number;
  candidateLabel: string;
  deltaLabel: string;
  tone: TacticalComparisonTone;
}

export type TacticalComparisonSummary = 'upgrade' | 'downgrade' | 'parity';

const TACTICAL_SLOT_META: Record<TacticalSlotVisualState, TacticalSlotVisualMeta> = {
  occupied: {
    label: 'Ocupado',
    description: 'Slot con pieza activa y lista para reemplazo.',
    panelClass: 'border-cyan-500/40 bg-cyan-500/6',
    badgeClass: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200',
  },
  empty: {
    label: 'Vacío',
    description: 'Sin pieza equipada; podés instalar una candidata.',
    panelClass: 'border-emerald-500/35 bg-emerald-500/5',
    badgeClass: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200',
  },
  blocked: {
    label: 'Bloqueado',
    description: 'Expedición activa. El equipamiento queda congelado.',
    panelClass: 'border-amber-500/45 bg-amber-500/6',
    badgeClass: 'border-amber-500/45 bg-amber-500/12 text-amber-200',
  },
  incompatible: {
    label: 'Incompatible',
    description: 'No hay piezas compatibles para este slot.',
    panelClass: 'border-violet-500/35 bg-violet-500/6',
    badgeClass: 'border-violet-500/35 bg-violet-500/12 text-violet-200',
  },
};

const TACTICAL_METRICS: TacticalMetricMeta[] = [
  { key: 'dangerResistance', label: 'Resistencia' },
  { key: 'lootMultiplier', label: 'Botín' },
  { key: 'currencyMultiplier', label: 'Créditos' },
  { key: 'xpMultiplier', label: 'XP' },
  { key: 'backpackCapacity', label: 'Capacidad' },
  { key: 'anomalyDetectionBonus', label: 'Detección' },
];

function toSignedPercent(value: number): string {
  const normalized = Math.round(value * 100);

  if (normalized === 0) {
    return '0%';
  }

  return `${normalized > 0 ? '+' : ''}${normalized}%`;
}

function readMetric(config: ItemConfigOptionsDTO | undefined, key: TacticalMetricKey): number | undefined {
  if (!config) {
    return undefined;
  }

  const value = config[key];
  return typeof value === 'number' ? value : undefined;
}

export function resolveTacticalSlotVisualState({
  isRunActive,
  hasEquippedItem,
  candidateCount,
}: ResolveTacticalSlotStateInput): TacticalSlotVisualState {
  if (isRunActive) {
    return 'blocked';
  }

  if (hasEquippedItem) {
    return 'occupied';
  }

  if (candidateCount === 0) {
    return 'incompatible';
  }

  return 'empty';
}

export function getTacticalSlotVisualMeta(state: TacticalSlotVisualState): TacticalSlotVisualMeta {
  return TACTICAL_SLOT_META[state];
}

export function buildTacticalComparisonRows(
  candidateConfig?: ItemConfigOptionsDTO,
  equippedConfig?: ItemConfigOptionsDTO,
): TacticalComparisonRow[] {
  return TACTICAL_METRICS.map((metric) => {
    const candidateRaw = readMetric(candidateConfig, metric.key);
    const equippedRaw = readMetric(equippedConfig, metric.key);

    if (candidateRaw === undefined && equippedRaw === undefined) {
      return null;
    }

    const candidateValue = candidateRaw ?? 0;
    const equippedValue = equippedRaw ?? 0;
    const delta = candidateValue - equippedValue;

    const tone: TacticalComparisonTone = delta === 0 ? 'neutral' : delta > 0 ? 'positive' : 'negative';

    return {
      metricKey: metric.key,
      label: metric.label,
      candidateValue,
      equippedValue,
      delta,
      candidateLabel: toSignedPercent(candidateValue),
      deltaLabel: toSignedPercent(delta),
      tone,
    };
  })
    .filter((row): row is TacticalComparisonRow => row !== null)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export function summarizeTacticalComparison(rows: TacticalComparisonRow[]): TacticalComparisonSummary {
  let positives = 0;
  let negatives = 0;

  for (const row of rows) {
    if (row.tone === 'positive') {
      positives += 1;
      continue;
    }

    if (row.tone === 'negative') {
      negatives += 1;
    }
  }

  if (positives === negatives) {
    return 'parity';
  }

  return positives > negatives ? 'upgrade' : 'downgrade';
}
