import 'server-only';
import { db } from '../db/client';
import { PlayerStateDTO, InventoryItemDTO, EquipmentDTO, RunStateDTO } from '../../types/dto.types';
import { UserRepository } from '../repositories/user.repository';
import { EconomyRepository } from '../repositories/economy.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { RunRepository } from '../repositories/run.repository';
import { InventoryItemDomain, EquipmentDomain } from '../repositories/inventory.repository';
import { SHIPYARD_CEMETERY_CONFIG, ITEM_CATALOG } from '../../config/game.config';
import { calculateLevelProgress, getXpThreshold } from '../domain/progression/progression.calculator';
import { ContractService } from './contract.service';
import { UserContractDTO } from '../../types/dto.types';

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

import { computeDangerLevel, computePendingLoot, getTriggeredAnomaly, EquipmentSnapshot, AnomalyStateRecord } from '../domain/run/run.calculator';

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
  };

  const elapsedSeconds = (Date.now() - run.startedAt.getTime()) / 1000;
  
  const equipmentSnapshot = run.equipmentSnapshot as EquipmentSnapshot;
  const dangerLevel = computeDangerLevel(elapsedSeconds, dangerConfig);
  const pendingLoot = computePendingLoot(elapsedSeconds, equipmentSnapshot, dangerLevel, dangerConfig);

  const status: RunStateDTO['status'] =
    dangerLevel >= dangerConfig.catastropheThreshold ? 'catastrophe' : 'running';

  const anomalyState = run.anomalyState as Record<string, AnomalyStateRecord> | null;
  const anomalyDef = getTriggeredAnomaly(run.id, elapsedSeconds, anomalyState);

  return {
    status,
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
}): UserContractDTO {
  const itemDef = ITEM_CATALOG.find(i => i.id === contract.requiredItemDefId);
  return {
    id: contract.id,
    requiredItemDefId: contract.requiredItemDefId,
    requiredItemName: itemDef?.displayName || 'Desconocido',
    requiredItemIcon: itemDef?.iconKey || 'icon_unknown',
    requiredQuantity: contract.requiredQuantity,
    currentQuantity: contract.currentQuantity,
    rewardCC: contract.rewardCC,
    rewardXP: contract.rewardXP,
    status: contract.status,
    expiresAt: contract.expiresAt.toISOString(),
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const PlayerStateService = {
  async getPlayerState(userId: string): Promise<PlayerStateDTO> {
    // Parallel fetch — all reads, no writes, safe to parallelise
    const [profile, currencyBalance, equipment, activeRunDomain, contracts] = await Promise.all([
      UserRepository.getUserProfile(userId),
      EconomyRepository.getCurrentBalance(userId),
      InventoryRepository.getEquipmentByUser(userId),
      RunRepository.findActiveRun(userId),
      ContractService.ensureDailyContracts(userId),
    ]);

    if (!profile) {
      // Should never happen for authenticated users — provisioning should guarantee this.
      throw new Error(`[PlayerStateService] UserProfile not found for userId: ${userId}`);
    }

    const activeRun: RunStateDTO | null = activeRunDomain
      ? toRunStateDTO(activeRunDomain)
      : null;

    return {
      userId,
      displayName: profile.displayName,
      level: profile.level,
      currentXp: profile.currentXp,
      xpToNextLevel: getXpThreshold(profile.level),
      currencyBalance,
      equipment: toEquipmentDTO(equipment),
      activeRun,
      contracts: contracts.map(toUserContractDTO),
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
