import 'server-only';
import { PendingLootDTO, ItemRarityDTO } from '../../../types/dto.types';
import { ITEM_CATALOG } from '../../../config/game.config';

export interface DangerConfig {
  baseRate: number;
  quadraticFactor: number;
  catastropheThreshold: number;
  dangerLootBonus: number;
  baseLootPerSecond: Record<string, number>;
  baseCreditsPerMinute: number;
  baseXpPerSecond: number;
}

export type EquipmentSnapshot = Record<string, string | null>;

export function computeDangerLevel(elapsedSeconds: number, config: DangerConfig): number {
  return config.baseRate + (config.quadraticFactor * elapsedSeconds * elapsedSeconds);
}

export function computePendingLoot(
  elapsedSeconds: number,
  equipmentSnapshot: EquipmentSnapshot, // Contains snapshot of itemDefinitionIds
  dangerLevel: number,
  config: DangerConfig
): PendingLootDTO[] {
  // A simplistic multiplier extraction
  let equipMultiplier = 1;

  // Search snapshot values against catalog array if needed (MVP simplified logic)
  const allEquippedItems = Object.values(equipmentSnapshot).filter((id): id is string => Boolean(id));
  allEquippedItems.forEach((itemId) => {
    const item = ITEM_CATALOG.find((catItem) => catItem.id === itemId);
    if (item?.configOptions?.lootMultiplier) {
      equipMultiplier += item.configOptions.lootMultiplier as number;
    }
  });

  const dangerBonus = 1 + (dangerLevel * config.dangerLootBonus);

  const pendingLoot: PendingLootDTO[] = [];

  for (const [itemId, rate] of Object.entries(config.baseLootPerSecond)) {
    const rawQuantity = rate * elapsedSeconds * dangerBonus * equipMultiplier;
    const quantity = Math.floor(rawQuantity);

    if (quantity > 0) {
      const catalogItem = ITEM_CATALOG.find((cat) => cat.id === itemId);
      if (catalogItem) {
        pendingLoot.push({
          itemId: catalogItem.id,
          displayName: catalogItem.displayName,
          iconKey: catalogItem.iconKey,
          quantity,
          rarity: catalogItem.rarity as ItemRarityDTO,
        });
      }
    }
  }

  return pendingLoot;
}

export function computeCurrencyEstimate(
  elapsedSeconds: number,
  dangerLevel: number,
  equipmentSnapshot: EquipmentSnapshot,
  config: DangerConfig
): number {
  return Math.floor((config.baseCreditsPerMinute / 60) * elapsedSeconds * (1 + dangerLevel * 0.5));
}

export function computeCurrencyReward(
  elapsedSeconds: number,
  dangerLevel: number,
  equipmentSnapshot: EquipmentSnapshot,
  config: DangerConfig
): number {
  return computeCurrencyEstimate(elapsedSeconds, dangerLevel, equipmentSnapshot, config);
}

export function computeXpReward(
  elapsedSeconds: number,
  dangerLevel: number,
  config: DangerConfig
): number {
  return Math.floor(config.baseXpPerSecond * elapsedSeconds);
}

export interface AnomalyDefinition {
  id: string;
  type: string;
  title: string;
  description: string;
  baseTriggerSeconds: number;
}

export const ANOMALIES: AnomalyDefinition[] = [
  {
    id: 'distortion_echo',
    type: 'SIGNAL',
    title: 'ECO DE DISTORSIÓN',
    description: 'Una señal incoherente emana de los núcleos de plasma cercanos. Investigar podría ser peligroso pero lucrativo.',
    baseTriggerSeconds: 180 // 3 minutes
  }
];

export function hashRunId(runId: string): number {
  let hash = 0;
  for (let i = 0; i < runId.length; i++) {
    hash = ((hash << 5) - hash) + runId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export interface AnomalyStateRecord {
  resolved: boolean;
  decision?: 'IGNORE' | 'INVESTIGATE';
  resolvedAt?: string;
}

export function getTriggeredAnomaly(
  runId: string, 
  elapsedSeconds: number, 
  anomalyState: Record<string, AnomalyStateRecord> | null
): AnomalyDefinition | null {
  const runHash = hashRunId(runId);
  
  for (const anomaly of ANOMALIES) {
    // Randomize trigger time slightly per run (+/- 30s)
    const variance = (runHash % 60) - 30;
    const triggerTime = anomaly.baseTriggerSeconds + variance;

    if (elapsedSeconds >= triggerTime) {
      // If it exists in state and is resolved, skip
      if (anomalyState && anomalyState[anomaly.id]?.resolved) {
        continue;
      }
      return anomaly;
    }
  }

  return null;
}

export function applyCatastrophePenalty(pendingLoot: PendingLootDTO[]): PendingLootDTO[] {
  return pendingLoot.map(item => ({
    ...item,
    quantity: Math.floor(item.quantity * 0.20)
  })).filter(item => item.quantity > 0);
}

export function applyInsurancePenalty(pendingLoot: PendingLootDTO[]): PendingLootDTO[] {
  return pendingLoot.map(item => ({
    ...item,
    quantity: Math.floor(item.quantity * 0.80)
  })).filter(item => item.quantity > 0);
}
