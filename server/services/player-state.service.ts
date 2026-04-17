import 'server-only';
import { db } from '../db/client';
import { PlayerStateDTO, InventoryItemDTO, EquipmentDTO, RunStateDTO } from '../../types/dto.types';
import { UserRepository } from '../repositories/user.repository';
import { EconomyRepository } from '../repositories/economy.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { RunRepository } from '../repositories/run.repository';
import { InventoryItemDomain, EquipmentDomain } from '../repositories/inventory.repository';
import { SHIPYARD_CEMETERY_CONFIG } from '../../config/game.config';

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

import { computeDangerLevel, computePendingLoot } from '../domain/run/run.calculator';

function toRunStateDTO(
  run: NonNullable<Awaited<ReturnType<typeof RunRepository.findActiveRun>>>
): RunStateDTO {
  const dangerConfig = run.dangerConfig as {
    baseRate: number;
    quadraticFactor: number;
    catastropheThreshold: number;
    dangerLootBonus: number;
    baseLootPerSecond: any;
    baseCreditsPerMinute: number;
    baseXpPerSecond: number;
  };

  const elapsedSeconds = (Date.now() - run.startedAt.getTime()) / 1000;
  
  const dangerLevel = computeDangerLevel(elapsedSeconds, dangerConfig);
  const pendingLoot = computePendingLoot(elapsedSeconds, (run as any).equipmentSnapshot, dangerLevel, dangerConfig);

  const status: RunStateDTO['status'] =
    dangerLevel >= dangerConfig.catastropheThreshold ? 'catastrophe' : 'running';

  return {
    status,
    runId: run.runId,
    zoneId: run.zoneId,
    startedAt: run.startedAt.toISOString(),
    dangerLevel: Math.min(dangerLevel, 1.5), // cap visual at 150%
    catastropheThreshold: dangerConfig.catastropheThreshold,
    elapsedSeconds: Math.floor(elapsedSeconds),
    pendingLoot,
  };
}

// ─── XP calculation (MVP: fixed XP per level) ─────────────────────────────────
// 1000 * level XP needed per level — simple ladder for MVP, easy to adjust
function xpToNextLevel(level: number): number {
  return level * 1000;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const PlayerStateService = {
  async getPlayerState(userId: string): Promise<PlayerStateDTO> {
    // Parallel fetch — all reads, no writes, safe to parallelise
    const [profile, currencyBalance, equipment, activeRunDomain] = await Promise.all([
      UserRepository.getUserProfile(userId),
      EconomyRepository.getCurrentBalance(userId),
      InventoryRepository.getEquipmentByUser(userId),
      RunRepository.findActiveRun(userId),
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
      xpToNextLevel: xpToNextLevel(profile.level),
      currencyBalance,
      equipment: toEquipmentDTO(equipment),
      activeRun,
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
