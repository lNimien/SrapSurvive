import 'server-only';
import {
  PlayerStateDTO,
  InventoryItemDTO,
  EquipmentDTO,
  RunStateDTO,
  BuildSynergyDTO,
  WeeklyGoalsDTO,
  PlayerAnalyticsDTO,
} from '../../types/dto.types';
import { UserRepository } from '../repositories/user.repository';
import { EconomyRepository } from '../repositories/economy.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { RunRepository } from '../repositories/run.repository';
import { InventoryItemDomain, EquipmentDomain } from '../repositories/inventory.repository';
import { ITEM_CATALOG } from '../../config/game.config';
import { getXpThreshold } from '../domain/progression/progression.calculator';
import { ContractService } from './contract.service';
import { UserContractDTO } from '../../types/dto.types';
import { AccountUpgradeService } from './account-upgrade.service';
import { AchievementService } from './achievement.service';
import { ProvisioningService } from './provisioning.service';
import { WeeklyGoalsService } from './weekly-goals.service';
import { PlayerAnalyticsService } from './player-analytics.service';
import { featureFlags } from '@/config/feature-flags.config';
import { buildContractChainSnapshot, ContractChainState } from '../domain/contract/contract-chain';

// ─── Internal mappers (Prisma/Domain → DTO) ───────────────────────────────────

function toInventoryItemDTO(domain: InventoryItemDomain): InventoryItemDTO {
  return {
    itemId: domain.itemId,
    itemDefinitionId: domain.itemDefinitionId,
    displayName: domain.displayName,
    description: domain.description,
    rarity: domain.rarity,
    iconKey: domain.iconKey,
    quantity: domain.quantity,
    baseValue: domain.baseValue,
    isEquipable: domain.isEquipable,
    equipmentSlot: domain.equipmentSlot,
    configOptions: domain.configOptions,
  };
}

function toEquipmentDTO(domain: EquipmentDomain): EquipmentDTO {
  return {
    HEAD: domain.HEAD ? toInventoryItemDTO(domain.HEAD) : null,
    BODY: domain.BODY ? toInventoryItemDTO(domain.BODY) : null,
    HANDS: domain.HANDS ? toInventoryItemDTO(domain.HANDS) : null,
    TOOL_PRIMARY: domain.TOOL_PRIMARY ? toInventoryItemDTO(domain.TOOL_PRIMARY) : null,
    TOOL_SECONDARY: domain.TOOL_SECONDARY ? toInventoryItemDTO(domain.TOOL_SECONDARY) : null,
    BACKPACK: domain.BACKPACK ? toInventoryItemDTO(domain.BACKPACK) : null,
  };
}

import {
  computeDangerLevel,
  computePendingLoot,
  getTriggeredAnomaly,
  EquipmentSnapshot,
  AnomalyStateRecord,
  resolveActiveBuildArchetype,
  resolveActiveBuildSynergies,
} from '../domain/run/run.calculator';
import { RunMode } from '@/types/game.types';

const EMPTY_WEEKLY_GOALS: WeeklyGoalsDTO = {
  weekKey: 'disabled',
  weekStart: new Date(0).toISOString(),
  activeEvent: {
    id: 'disabled',
    title: 'LiveOps desactivado',
    description: 'El panel de directivas semanales está deshabilitado por feature flag.',
    startsAt: new Date(0).toISOString(),
    endsAt: new Date(0).toISOString(),
    eventModifierLabel: 'Sin overlay activo.',
  },
  directives: [],
};

const EMPTY_ANALYTICS: PlayerAnalyticsDTO = {
  totalExtractions: 0,
  successRate: 0,
  averageCcPerExtraction: 0,
  averageXpPerExtraction: 0,
  runMix: {
    safe: 0,
    hard: 0,
  },
  bestZoneByEarnings: null,
};

function toEquipmentSnapshot(equipment: EquipmentDomain): EquipmentSnapshot {
  return {
    HEAD: equipment.HEAD?.itemDefinitionId ?? null,
    BODY: equipment.BODY?.itemDefinitionId ?? null,
    HANDS: equipment.HANDS?.itemDefinitionId ?? null,
    TOOL_PRIMARY: equipment.TOOL_PRIMARY?.itemDefinitionId ?? null,
    TOOL_SECONDARY: equipment.TOOL_SECONDARY?.itemDefinitionId ?? null,
    BACKPACK: equipment.BACKPACK?.itemDefinitionId ?? null,
  };
}

function toBuildSynergyDTO(input: ReturnType<typeof resolveActiveBuildSynergies>[number]): BuildSynergyDTO {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    isArchetype: input.isArchetype,
    effects: input.effects,
  };
}

function toRunStateDTO(
  run: NonNullable<Awaited<ReturnType<typeof RunRepository.findActiveRun>>>
): RunStateDTO {
  const dangerConfig = run.dangerConfig as {
    baseRate: number;
    quadraticFactor: number;
    catastropheThreshold: number;
    dangerLootBonus: number;
    baseLootPerSecond: Record<string, number>;
    baseCreditsPerMinute: number;
    baseXpPerSecond: number;
    runMode?: RunMode;
    runMutator?: {
      id: 'unstable_currents' | 'dense_scrapyard' | 'narrow_escape';
      label: string;
      summary: string;
    };
  };

  const runMode = dangerConfig.runMode === RunMode.HARD ? RunMode.HARD : RunMode.SAFE;
  const elapsedSeconds = (Date.now() - run.startedAt.getTime()) / 1000;
  
  const equipmentSnapshot = run.equipmentSnapshot as EquipmentSnapshot;
  const dangerLevel = computeDangerLevel(elapsedSeconds, dangerConfig);
  const pendingLoot = computePendingLoot(elapsedSeconds, equipmentSnapshot, dangerLevel, dangerConfig, runMode);

  const status: RunStateDTO['status'] =
    dangerLevel >= dangerConfig.catastropheThreshold ? 'catastrophe' : 'running';

  const anomalyState = run.anomalyState as Record<string, AnomalyStateRecord> | null;
  const anomalyDef = getTriggeredAnomaly(run.id, elapsedSeconds, anomalyState);

  return {
    status,
    runMode,
    runId: run.id, // run.runId was a typo in previous version if it doesn't match Prisma, checking... 
    // Actually in schema it is `id`. 
    zoneId: run.zoneId,
    startedAt: run.startedAt.toISOString(),
    dangerLevel: Math.min(dangerLevel, 1.5), // cap visual at 150%
    catastropheThreshold: dangerConfig.catastropheThreshold,
    elapsedSeconds: Math.floor(elapsedSeconds),
    pendingLoot,
    anomaly: anomalyDef ? {
      ...anomalyDef,
      discoveredAt: new Date(run.startedAt.getTime() + (anomalyDef.baseTriggerSeconds * 1000)).toISOString()
    } : null,
    runMutator: dangerConfig.runMutator ?? null,
  };
}

function toUserContractDTO(contract: {
  id: string;
  requiredItemDefId: string;
  requiredQuantity: number;
  currentQuantity: number;
  rewardCC: number;
  rewardXP: number;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  expiresAt: Date;
}, availableByItemDefId: Record<string, number>, chainMeta?: ContractChainContractMeta): UserContractDTO {
  const itemDef = ITEM_CATALOG.find(i => i.id === contract.requiredItemDefId);
  return {
    id: contract.id,
    requiredItemDefId: contract.requiredItemDefId,
    requiredItemName: itemDef?.displayName || 'Desconocido',
    requiredItemIcon: itemDef?.iconKey || 'icon_unknown',
    requiredQuantity: contract.requiredQuantity,
    currentQuantity: contract.currentQuantity,
    availableQuantity: availableByItemDefId[contract.requiredItemDefId] ?? 0,
    rewardCC: contract.rewardCC,
    rewardXP: contract.rewardXP,
    status: contract.status,
    expiresAt: contract.expiresAt.toISOString(),
    chainStage: chainMeta?.chainStage ?? null,
    chainStageCount: chainMeta?.chainStageCount ?? null,
    chainState: chainMeta?.chainState ?? null,
    chainBonusCC: chainMeta?.chainBonusCC ?? 0,
    chainBonusXP: chainMeta?.chainBonusXP ?? 0,
  };
}

interface ContractChainContractMeta {
  chainStage: number;
  chainStageCount: number;
  chainState: ContractChainState;
  chainBonusCC: number;
  chainBonusXP: number;
}

function toContractChainMetaById(
  userId: string,
  contracts: Array<{
    id: string;
    requiredItemDefId: string;
    requiredQuantity: number;
    currentQuantity: number;
    rewardCC: number;
    rewardXP: number;
    status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
    expiresAt: Date;
    createdAt: Date;
  }>,
): Record<string, ContractChainContractMeta> {
  const snapshot = buildContractChainSnapshot(userId, contracts);
  if (!snapshot) {
    return {};
  }

  return snapshot.chainContracts.reduce<Record<string, ContractChainContractMeta>>((acc, contract, index) => {
    acc[contract.id] = {
      chainStage: index + 1,
      chainStageCount: snapshot.stageCount,
      chainState: snapshot.state,
      chainBonusCC: snapshot.bonus.rewardCC,
      chainBonusXP: snapshot.bonus.rewardXP,
    };

    return acc;
  }, {});
}

function toInventoryAvailabilityMap(inventory: InventoryItemDomain[]): Record<string, number> {
  return inventory.reduce<Record<string, number>>((acc, item) => {
    acc[item.itemDefinitionId] = item.quantity;
    return acc;
  }, {});
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const PlayerStateService = {
  async getPlayerState(userId: string): Promise<PlayerStateDTO> {
    // 0. Ensure user is provisioned (game profile, progression, equipo inicial)
    // This handles broken sessions after DB resets/migrations.
    await ProvisioningService.ensureProvisioned(userId);

    // Parallel fetch — all reads, no writes, safe to parallelise
    const [profile, currencyBalance, equipment, inventory, activeRunDomain, contracts, nextContractRefreshCostCC, upgrades, achievements] = await Promise.all([
      UserRepository.getUserProfile(userId),
      EconomyRepository.getCurrentBalance(userId),
      InventoryRepository.getEquipmentByUser(userId),
      InventoryRepository.getInventoryByUser(userId),
      RunRepository.findActiveRun(userId),
      ContractService.ensureDailyContracts(userId),
      ContractService.getNextRefreshCostCC(userId),
      AccountUpgradeService.getUpgradesForPlayer(userId),
      AchievementService.getAchievementsForPlayer(userId),
    ]);

    if (!profile) {
      // Should never happen for authenticated users — provisioning should guarantee this.
      throw new Error(`[PlayerStateService] UserProfile not found for userId: ${userId}`);
    }

    const activeRun: RunStateDTO | null = activeRunDomain
      ? toRunStateDTO(activeRunDomain)
      : null;

    const equipmentSnapshot = toEquipmentSnapshot(equipment);
    const activeSynergies = featureFlags.d3BuildSynergies
      ? resolveActiveBuildSynergies(equipmentSnapshot).map(toBuildSynergyDTO)
      : [];
    const activeArchetype = featureFlags.d3BuildSynergies
      ? (() => {
          const archetype = resolveActiveBuildArchetype(equipmentSnapshot);
          return archetype ? toBuildSynergyDTO(archetype) : null;
        })()
      : null;

    const [weeklyGoals, analytics] = await Promise.all([
      featureFlags.d3WeeklyGoals ? WeeklyGoalsService.getWeeklyGoals(userId) : Promise.resolve(EMPTY_WEEKLY_GOALS),
      featureFlags.d3PlayerAnalytics
        ? PlayerAnalyticsService.getPlayerAnalytics(userId)
        : Promise.resolve(EMPTY_ANALYTICS),
    ]);

    const availableByItemDefId = toInventoryAvailabilityMap(inventory);
    const chainMetaByContractId = toContractChainMetaById(userId, contracts);

    return {
      userId,
      displayName: profile.displayName,
      level: profile.level,
      currentXp: profile.currentXp,
      xpToNextLevel: getXpThreshold(profile.level),
      currencyBalance,
      equipment: toEquipmentDTO(equipment),
      activeRun,
      contracts: contracts.map((contract) =>
        toUserContractDTO(contract, availableByItemDefId, chainMetaByContractId[contract.id]),
      ),
      nextContractRefreshCostCC,
      upgrades,
      achievements,
      activeSynergies,
      activeArchetype,
      weeklyGoals,
      analytics,
    };
  },

  async getRunState(userId: string): Promise<RunStateDTO> {
    const activeRunDomain = await RunRepository.findActiveRun(userId);
    
    if (!activeRunDomain) {
      return { status: 'idle' };
    }

    return toRunStateDTO(activeRunDomain);
  },
};
