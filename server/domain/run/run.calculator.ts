import 'server-only';
import { PendingLootDTO, ItemRarityDTO } from '../../../types/dto.types';
import { ITEM_CATALOG } from '../../../config/game.config';
import { RunMode } from '../../../types/game.types';
import {
  BUILD_EFFECT_BONUS_CAPS,
  BUILD_SYNERGIES,
  BuildEffectBonuses,
  BuildSynergyDefinition,
  EquipmentFamily,
  EquipmentSlotKey,
  ITEM_FAMILY_BY_ID,
} from '@/config/build-synergies.config';

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

interface RarityEffectProfile {
  lootBonus: number;
  currencyBonus: number;
  dangerResistanceBonus: number;
  xpBonus: number;
}

export interface EquipmentOutcomeMultipliers {
  lootMultiplier: number;
  currencyMultiplier: number;
  xpMultiplier: number;
}

export interface ActiveBuildSynergy {
  id: string;
  name: string;
  description: string;
  isArchetype: boolean;
  effects: Partial<BuildEffectBonuses>;
}

interface SynergyResolutionResult {
  activeSynergies: ActiveBuildSynergy[];
  activeArchetype: ActiveBuildSynergy | null;
  cappedBonuses: BuildEffectBonuses;
}

export interface RunModeRewardProfile {
  lootMultiplier: number;
  currencyMultiplier: number;
  xpMultiplier: number;
  rarityMultipliers: Record<ItemRarityDTO, number>;
}

export const RUN_MODE_REWARD_PROFILES: Record<RunMode, RunModeRewardProfile> = {
  SAFE: {
    lootMultiplier: 0.82,
    currencyMultiplier: 0.72,
    xpMultiplier: 0.78,
    rarityMultipliers: {
      COMMON: 0.86,
      UNCOMMON: 0.74,
      RARE: 0.62,
      EPIC: 0.55,
      LEGENDARY: 0.5,
      CORRUPTED: 0.58,
    },
  },
  HARD: {
    lootMultiplier: 1.26,
    currencyMultiplier: 1.22,
    xpMultiplier: 1.24,
    rarityMultipliers: {
      COMMON: 1,
      UNCOMMON: 1.08,
      RARE: 1.28,
      EPIC: 1.52,
      LEGENDARY: 1.8,
      CORRUPTED: 1.64,
    },
  },
};

export function resolveRunMode(mode: unknown): RunMode {
  return mode === RunMode.HARD ? RunMode.HARD : RunMode.SAFE;
}

export function getRunModeRewardProfile(mode: unknown): RunModeRewardProfile {
  return RUN_MODE_REWARD_PROFILES[resolveRunMode(mode)];
}

const RARITY_EFFECTS: Record<ItemRarityDTO, RarityEffectProfile> = {
  COMMON: { lootBonus: 0, currencyBonus: 0, dangerResistanceBonus: 0, xpBonus: 0 },
  UNCOMMON: { lootBonus: 0.01, currencyBonus: 0.008, dangerResistanceBonus: 0.003, xpBonus: 0.004 },
  RARE: { lootBonus: 0.02, currencyBonus: 0.015, dangerResistanceBonus: 0.006, xpBonus: 0.007 },
  EPIC: { lootBonus: 0.03, currencyBonus: 0.022, dangerResistanceBonus: 0.009, xpBonus: 0.011 },
  LEGENDARY: { lootBonus: 0.045, currencyBonus: 0.032, dangerResistanceBonus: 0.013, xpBonus: 0.016 },
  CORRUPTED: { lootBonus: 0.06, currencyBonus: 0.045, dangerResistanceBonus: 0.017, xpBonus: 0.02 },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getEquippedCatalogItems(equipmentSnapshot: EquipmentSnapshot) {
  const equippedIds = Object.values(equipmentSnapshot).filter((id): id is string => Boolean(id));
  return equippedIds
    .map((itemId) => ITEM_CATALOG.find((catalogItem) => catalogItem.id === itemId))
    .filter((item): item is (typeof ITEM_CATALOG)[number] => Boolean(item));
}

function getSlotEntries(equipmentSnapshot: EquipmentSnapshot): Array<[EquipmentSlotKey, string]> {
  return (Object.entries(equipmentSnapshot) as Array<[string, string | null]>)
    .filter((entry): entry is [EquipmentSlotKey, string] => {
      return entry[1] !== null;
    });
}

function resolveFamilyFromItemId(itemId: string, slot: EquipmentSlotKey): EquipmentFamily {
  const fromConfig = ITEM_FAMILY_BY_ID[itemId];
  if (fromConfig) {
    return fromConfig;
  }

  if (slot === 'HEAD') return 'SCOUT';
  if (slot === 'BODY') return 'BULWARK';
  if (slot === 'HANDS') return 'SALVAGER';
  if (slot === 'TOOL_PRIMARY' || slot === 'TOOL_SECONDARY') return 'UTILITY';
  return 'HAULER';
}

function countRarities(equipmentSnapshot: EquipmentSnapshot): Record<ItemRarityDTO, number> {
  const counts: Record<ItemRarityDTO, number> = {
    COMMON: 0,
    UNCOMMON: 0,
    RARE: 0,
    EPIC: 0,
    LEGENDARY: 0,
    CORRUPTED: 0,
  };

  for (const item of getEquippedCatalogItems(equipmentSnapshot)) {
    const rarity = item.rarity as ItemRarityDTO;
    counts[rarity] += 1;
  }

  return counts;
}

function countFamilies(equipmentSnapshot: EquipmentSnapshot): Record<EquipmentFamily, number> {
  const counts: Record<EquipmentFamily, number> = {
    SCOUT: 0,
    BULWARK: 0,
    SALVAGER: 0,
    UTILITY: 0,
    HAULER: 0,
  };

  for (const [slot, itemId] of getSlotEntries(equipmentSnapshot)) {
    const family = resolveFamilyFromItemId(itemId, slot);
    counts[family] += 1;
  }

  return counts;
}

function isSynergyActive(definition: BuildSynergyDefinition, equipmentSnapshot: EquipmentSnapshot): boolean {
  const families = countFamilies(equipmentSnapshot);
  const rarities = countRarities(equipmentSnapshot);
  const equippedSlots = new Set(getSlotEntries(equipmentSnapshot).map(([slot]) => slot));

  if (definition.conditions.requiredSlots) {
    for (const slot of definition.conditions.requiredSlots) {
      if (!equippedSlots.has(slot)) {
        return false;
      }
    }
  }

  if (definition.conditions.families) {
    for (const [family, requiredCount] of Object.entries(definition.conditions.families)) {
      if ((families[family as EquipmentFamily] ?? 0) < (requiredCount ?? 0)) {
        return false;
      }
    }
  }

  if (definition.conditions.minimumRarityCounts) {
    for (const [rarity, requiredCount] of Object.entries(definition.conditions.minimumRarityCounts)) {
      if ((rarities[rarity as ItemRarityDTO] ?? 0) < (requiredCount ?? 0)) {
        return false;
      }
    }
  }

  return true;
}

function sumBuildEffectBonuses(synergies: BuildSynergyDefinition[]): BuildEffectBonuses {
  const aggregated: BuildEffectBonuses = {
    lootMultiplierBonus: 0,
    currencyMultiplierBonus: 0,
    xpMultiplierBonus: 0,
    dangerResistanceBonus: 0,
    dangerLootBonusBonus: 0,
    catastropheThresholdBonus: 0,
  };

  for (const synergy of synergies) {
    aggregated.lootMultiplierBonus += synergy.effects.lootMultiplierBonus ?? 0;
    aggregated.currencyMultiplierBonus += synergy.effects.currencyMultiplierBonus ?? 0;
    aggregated.xpMultiplierBonus += synergy.effects.xpMultiplierBonus ?? 0;
    aggregated.dangerResistanceBonus += synergy.effects.dangerResistanceBonus ?? 0;
    aggregated.dangerLootBonusBonus += synergy.effects.dangerLootBonusBonus ?? 0;
    aggregated.catastropheThresholdBonus += synergy.effects.catastropheThresholdBonus ?? 0;
  }

  return {
    lootMultiplierBonus: clamp(aggregated.lootMultiplierBonus, -0.3, BUILD_EFFECT_BONUS_CAPS.lootMultiplierBonus),
    currencyMultiplierBonus: clamp(
      aggregated.currencyMultiplierBonus,
      -0.25,
      BUILD_EFFECT_BONUS_CAPS.currencyMultiplierBonus,
    ),
    xpMultiplierBonus: clamp(aggregated.xpMultiplierBonus, -0.25, BUILD_EFFECT_BONUS_CAPS.xpMultiplierBonus),
    dangerResistanceBonus: clamp(
      aggregated.dangerResistanceBonus,
      -0.2,
      BUILD_EFFECT_BONUS_CAPS.dangerResistanceBonus,
    ),
    dangerLootBonusBonus: clamp(
      aggregated.dangerLootBonusBonus,
      -0.25,
      BUILD_EFFECT_BONUS_CAPS.dangerLootBonusBonus,
    ),
    catastropheThresholdBonus: clamp(
      aggregated.catastropheThresholdBonus,
      -0.04,
      BUILD_EFFECT_BONUS_CAPS.catastropheThresholdBonus,
    ),
  };
}

function resolveSynergyData(equipmentSnapshot: EquipmentSnapshot): SynergyResolutionResult {
  const matched = BUILD_SYNERGIES
    .filter((definition) => isSynergyActive(definition, equipmentSnapshot))
    .sort((a, b) => b.priority - a.priority);

  const activeSynergies = matched.map<ActiveBuildSynergy>((definition) => ({
    id: definition.id,
    name: definition.name,
    description: definition.description,
    isArchetype: Boolean(definition.isArchetype),
    effects: definition.effects,
  }));

  const activeArchetype = activeSynergies.find((entry) => entry.isArchetype) ?? null;
  const cappedBonuses = sumBuildEffectBonuses(matched);

  return {
    activeSynergies,
    activeArchetype,
    cappedBonuses,
  };
}

export function resolveActiveBuildSynergies(equipmentSnapshot: EquipmentSnapshot): ActiveBuildSynergy[] {
  return resolveSynergyData(equipmentSnapshot).activeSynergies;
}

export function resolveActiveBuildArchetype(equipmentSnapshot: EquipmentSnapshot): ActiveBuildSynergy | null {
  return resolveSynergyData(equipmentSnapshot).activeArchetype;
}

export function computeEquipmentOutcomeMultipliers(
  equipmentSnapshot: EquipmentSnapshot
): EquipmentOutcomeMultipliers {
  const equippedItems = getEquippedCatalogItems(equipmentSnapshot);
  const synergyData = resolveSynergyData(equipmentSnapshot);

  let lootBonus = 0;
  let currencyBonus = 0;
  let xpBonus = 0;

  for (const item of equippedItems) {
    if (typeof item.configOptions?.lootMultiplier === 'number') {
      lootBonus += item.configOptions.lootMultiplier;
    }

    if (typeof item.configOptions?.currencyMultiplier === 'number') {
      currencyBonus += item.configOptions.currencyMultiplier;
    }

    if (typeof item.configOptions?.xpMultiplier === 'number') {
      xpBonus += item.configOptions.xpMultiplier;
    }

    const rarityEffects = RARITY_EFFECTS[item.rarity as ItemRarityDTO];
    lootBonus += rarityEffects.lootBonus;
    currencyBonus += rarityEffects.currencyBonus;
    xpBonus += rarityEffects.xpBonus;
  }

  lootBonus += synergyData.cappedBonuses.lootMultiplierBonus;
  currencyBonus += synergyData.cappedBonuses.currencyMultiplierBonus;
  xpBonus += synergyData.cappedBonuses.xpMultiplierBonus;

  return {
    lootMultiplier: clamp(1 + lootBonus, 0.6, 2.5),
    currencyMultiplier: clamp(1 + currencyBonus, 0.6, 2.5),
    xpMultiplier: clamp(1 + xpBonus, 0.75, 2.2),
  };
}

export function computeEquipmentDangerResistance(equipmentSnapshot: EquipmentSnapshot): number {
  const equippedItems = getEquippedCatalogItems(equipmentSnapshot);
  const synergyData = resolveSynergyData(equipmentSnapshot);

  let resistance = 0;

  for (const item of equippedItems) {
    if (typeof item.configOptions?.dangerResistance === 'number') {
      resistance += item.configOptions.dangerResistance;
    }

    const rarityEffects = RARITY_EFFECTS[item.rarity as ItemRarityDTO];
    resistance += rarityEffects.dangerResistanceBonus;
  }

  resistance += synergyData.cappedBonuses.dangerResistanceBonus;

  return clamp(resistance, -0.25, 0.4);
}

export function applyEquipmentToDangerConfig(
  baseConfig: DangerConfig,
  equipmentSnapshot: EquipmentSnapshot
): DangerConfig {
  const synergyData = resolveSynergyData(equipmentSnapshot);
  const dangerResistance = computeEquipmentDangerResistance(equipmentSnapshot);

  const baseRateMultiplier = clamp(1 - dangerResistance * 0.55, 0.75, 1.2);
  const quadraticMultiplier = clamp(1 - dangerResistance * 0.9, 0.65, 1.25);
  const catastropheThresholdBonus = clamp(
    dangerResistance * 0.08 + synergyData.cappedBonuses.catastropheThresholdBonus,
    -0.04,
    0.05,
  );

  return {
    ...baseConfig,
    baseRate: Math.max(0.001, baseConfig.baseRate * baseRateMultiplier),
    quadraticFactor: Math.max(0.0000005, baseConfig.quadraticFactor * quadraticMultiplier),
    catastropheThreshold: clamp(baseConfig.catastropheThreshold + catastropheThresholdBonus, 0.75, 0.995),
    dangerLootBonus: clamp(
      baseConfig.dangerLootBonus + synergyData.cappedBonuses.dangerLootBonusBonus,
      0.1,
      2.5,
    ),
  };
}

export function computeDangerLevel(elapsedSeconds: number, config: DangerConfig): number {
  return config.baseRate + (config.quadraticFactor * elapsedSeconds * elapsedSeconds);
}

export function computePendingLoot(
  elapsedSeconds: number,
  equipmentSnapshot: EquipmentSnapshot, // Contains snapshot of itemDefinitionIds
  dangerLevel: number,
  config: DangerConfig,
  mode: RunMode = RunMode.SAFE
): PendingLootDTO[] {
  const { lootMultiplier } = computeEquipmentOutcomeMultipliers(equipmentSnapshot);
  const modeProfile = getRunModeRewardProfile(mode);

  const dangerBonus = 1 + (dangerLevel * config.dangerLootBonus);

  const pendingLoot: PendingLootDTO[] = [];

  for (const [itemId, rate] of Object.entries(config.baseLootPerSecond)) {
    const catalogItem = ITEM_CATALOG.find((cat) => cat.id === itemId);
    if (!catalogItem) {
      continue;
    }

    const rarity = catalogItem.rarity as ItemRarityDTO;
    const rarityMultiplier = modeProfile.rarityMultipliers[rarity] ?? 1;
    const rawQuantity =
      rate *
      elapsedSeconds *
      dangerBonus *
      lootMultiplier *
      modeProfile.lootMultiplier *
      rarityMultiplier;
    const quantity = Math.floor(rawQuantity);

    if (quantity > 0) {
      pendingLoot.push({
        itemId: catalogItem.id,
        displayName: catalogItem.displayName,
        iconKey: catalogItem.iconKey,
        quantity,
        rarity,
      });
    }
  }

  return pendingLoot;
}

export function computeCurrencyEstimate(
  elapsedSeconds: number,
  dangerLevel: number,
  equipmentSnapshot: EquipmentSnapshot,
  config: DangerConfig,
  mode: RunMode = RunMode.SAFE
): number {
  const { currencyMultiplier } = computeEquipmentOutcomeMultipliers(equipmentSnapshot);
  const modeProfile = getRunModeRewardProfile(mode);
  return Math.floor(
    (config.baseCreditsPerMinute / 60) *
      elapsedSeconds *
      (1 + dangerLevel * 0.5) *
      currencyMultiplier *
      modeProfile.currencyMultiplier
  );
}

export function computeCurrencyReward(
  elapsedSeconds: number,
  dangerLevel: number,
  equipmentSnapshot: EquipmentSnapshot,
  config: DangerConfig,
  mode: RunMode = RunMode.SAFE
): number {
  return computeCurrencyEstimate(elapsedSeconds, dangerLevel, equipmentSnapshot, config, mode);
}

export function computeXpReward(
  elapsedSeconds: number,
  _dangerLevel: number,
  equipmentSnapshot: EquipmentSnapshot,
  config: DangerConfig,
  mode: RunMode = RunMode.SAFE
): number {
  const { xpMultiplier } = computeEquipmentOutcomeMultipliers(equipmentSnapshot);
  const modeProfile = getRunModeRewardProfile(mode);
  return Math.floor(config.baseXpPerSecond * elapsedSeconds * xpMultiplier * modeProfile.xpMultiplier);
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
