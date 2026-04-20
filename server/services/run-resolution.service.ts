import 'server-only';
import { db } from '../db/client';
import { RunRepository } from '../repositories/run.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { DomainError } from '../domain/inventory/inventory.service';
import { getZoneConfigById, ID_EXTRACTION_INSURANCE, isZoneUnlockedForLevel, ITEM_CATALOG } from '../../config/game.config';
import { RunStartedDTO, ExtractionResultDTO, PendingLootDTO } from '../../types/dto.types';
import {
  DangerConfig,
  EquipmentSnapshot,
  applyCatastrophePenalty,
  applyEquipmentToDangerConfig,
  applyInsurancePenalty,
  computeCurrencyReward,
  computePendingLoot,
  computeXpReward,
  resolveRunMode,
} from '../domain/run/run.calculator';
import { calculateLevelProgress } from '../domain/progression/progression.calculator';
import { computeLevelRewardBonus } from '../domain/progression/reward-bonus.logic';
import { AccountUpgradeService } from './account-upgrade.service';
import { RunMode } from '../../types/game.types';

type TxClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

async function ensureItemDefinitionIds(
  tx: TxClient,
  internalKeys: string[],
): Promise<Map<string, string>> {
  const uniqueKeys = [...new Set(internalKeys)];
  const map = new Map<string, string>();

  if (uniqueKeys.length === 0) {
    return map;
  }

  for (const internalKey of uniqueKeys) {
    const catalogItem = ITEM_CATALOG.find((item) => item.id === internalKey);
    if (!catalogItem) {
      console.warn('[run.resolveExtraction] Unknown catalog item in loot set', { internalKey });
      continue;
    }

    const definition = await tx.itemDefinition.upsert({
      where: { internalKey },
      update: {
        displayName: catalogItem.displayName,
        description: catalogItem.description,
        rarity: catalogItem.rarity as any,
        baseValue: catalogItem.baseValue,
        stackable: catalogItem.maxStack > 1,
        maxStack: catalogItem.maxStack,
        iconKey: catalogItem.iconKey,
        metadata: {
          itemType: catalogItem.itemType,
          equipmentSlot: catalogItem.equipmentSlot,
          configOptions: catalogItem.configOptions,
        },
      },
      create: {
        id: catalogItem.id,
        internalKey: catalogItem.id,
        displayName: catalogItem.displayName,
        description: catalogItem.description,
        rarity: catalogItem.rarity as any,
        baseValue: catalogItem.baseValue,
        stackable: catalogItem.maxStack > 1,
        maxStack: catalogItem.maxStack,
        iconKey: catalogItem.iconKey,
        metadata: {
          itemType: catalogItem.itemType,
          equipmentSlot: catalogItem.equipmentSlot,
          configOptions: catalogItem.configOptions,
        },
      },
      select: {
        id: true,
        internalKey: true,
      },
    });

    map.set(definition.internalKey, definition.id);
  }

  return map;
}

async function applyHardModeCatastropheGearLoss(
  tx: TxClient,
  userId: string,
  equipmentSnapshot: EquipmentSnapshot,
): Promise<void> {
  const slotKeys: Array<'HEAD' | 'BODY' | 'HANDS' | 'TOOL_PRIMARY' | 'TOOL_SECONDARY' | 'BACKPACK'> = [
    'HEAD',
    'BODY',
    'HANDS',
    'TOOL_PRIMARY',
    'TOOL_SECONDARY',
    'BACKPACK',
  ];

  const equipCounts = Object.values(equipmentSnapshot)
    .filter((itemDefId): itemDefId is string => Boolean(itemDefId))
    .reduce<Record<string, number>>((acc, itemDefId) => {
      acc[itemDefId] = (acc[itemDefId] ?? 0) + 1;
      return acc;
    }, {});

  for (const [itemDefinitionId, equippedCopies] of Object.entries(equipCounts)) {
    const inventoryRow = await tx.inventoryItem.findUnique({
      where: { userId_itemDefinitionId: { userId, itemDefinitionId } },
    });

    if (!inventoryRow) {
      continue;
    }

    if (inventoryRow.quantity <= equippedCopies) {
      await tx.inventoryItem.delete({ where: { id: inventoryRow.id } });
    } else {
      await tx.inventoryItem.update({
        where: { id: inventoryRow.id },
        data: { quantity: { decrement: equippedCopies } },
      });
    }
  }

  for (const slotKey of slotKeys) {
    const itemDefId = equipmentSnapshot[slotKey];
    if (!itemDefId) {
      continue;
    }

    await tx.equipmentSlot_.updateMany({
      where: { userId, slot: slotKey },
      data: { itemDefinitionId: null, equippedAt: null },
    });
  }
}

export const RunResolutionService = {
  async startRun(userId: string, zoneId: string, runMode: RunMode = RunMode.SAFE): Promise<RunStartedDTO> {
    // 1. Ensure no active run
    const activeRun = await RunRepository.findActiveRun(userId);
    if (activeRun) {
      throw new DomainError('RUN_ALREADY_ACTIVE', 'Ya tienes una expedición en curso.');
    }

    const selectedZoneConfig = getZoneConfigById(zoneId);
    if (!selectedZoneConfig) {
      throw new DomainError('VALIDATION_ERROR', 'Zona no disponible.');
    }

    const progression = await db.userProgression.findUnique({
      where: { userId },
      select: { currentLevel: true },
    });

    if (!progression) {
      throw new DomainError('NOT_FOUND', 'No se encontró progresión para iniciar la expedición.');
    }

    if (!isZoneUnlockedForLevel(selectedZoneConfig.internalKey, progression.currentLevel)) {
      throw new DomainError(
        'VALIDATION_ERROR',
        `Zona bloqueada. Requiere nivel ${selectedZoneConfig.minLevel}.`
      );
    }

    // 2. Fetch current equipment for snapshot
    const equipment = await InventoryRepository.getEquipmentByUser(userId);

    // 3. Map to simple snapshot object
    const equipmentSnapshot = {
      HEAD: equipment.HEAD?.itemDefinitionId || null,
      BODY: equipment.BODY?.itemDefinitionId || null,
      HANDS: equipment.HANDS?.itemDefinitionId || null,
      TOOL_PRIMARY: equipment.TOOL_PRIMARY?.itemDefinitionId || null,
      TOOL_SECONDARY: equipment.TOOL_SECONDARY?.itemDefinitionId || null,
      BACKPACK: equipment.BACKPACK?.itemDefinitionId || null,
    };

    const baseDangerConfig: DangerConfig = {
      baseRate: selectedZoneConfig.baseRate,
      quadraticFactor: selectedZoneConfig.quadraticFactor,
      catastropheThreshold: selectedZoneConfig.catastropheThreshold,
      dangerLootBonus: selectedZoneConfig.dangerLootBonus,
      baseLootPerSecond: selectedZoneConfig.baseLootPerSecond,
      baseCreditsPerMinute: selectedZoneConfig.baseCreditsPerMinute,
      baseXpPerSecond: selectedZoneConfig.baseXpPerSecond,
    };

    const upgradedDangerConfig = await AccountUpgradeService.applyUpgradesToDangerConfig(userId, baseDangerConfig);
    const dangerConfig = applyEquipmentToDangerConfig(upgradedDangerConfig, equipmentSnapshot);
    const normalizedRunMode = resolveRunMode(runMode);
    const runDangerConfigSnapshot = {
      ...dangerConfig,
      runMode: normalizedRunMode,
    };

    const startedAt = new Date(); // Server Authority

    // 4. Transactionally save everything
    const runId = await db.$transaction(async (tx: any) => {
      const newRun = await tx.activeRun.create({
        data: {
          userId,
          zoneId,
          status: 'RUNNING',
          startedAt,
          equipmentSnapshot,
           dangerConfig: runDangerConfigSnapshot as any,
        },
      });

        await tx.auditLog.create({
          data: {
            userId,
            action: 'run.start',
            payload: { runId: newRun.id, zoneId, runMode: normalizedRunMode, equipmentSnapshot },
          },
        });

      return newRun.id;
    });

    return {
      runId,
      zoneId,
      runMode: normalizedRunMode,
      startedAt: startedAt.toISOString(),
    };
  },

  async resolveExtraction(
    userId: string,
    runId: string
  ): Promise<ExtractionResultDTO> {
    const runById = await db.activeRun.findUnique({ where: { id: runId } });
    if (runById && runById.userId !== userId) {
      throw new DomainError('UNAUTHORIZED', 'La expedición no pertenece al usuario autenticado.');
    }

    const activeRun = await RunRepository.findActiveRun(userId);
    
    // Safety checks
    if (!activeRun) {
      const existingHistory = await db.extractionResult.findFirst({
        where: { runId: runId }
      });
      if (existingHistory) {
        throw new DomainError('RUN_ALREADY_RESOLVED', 'La expedición ya fue procesada.');
      }
      throw new DomainError('RUN_NOT_RUNNING', 'No tienes ninguna expedición en curso.');
    }
    
    if (activeRun.runId !== runId) {
       throw new DomainError('UNAUTHORIZED', 'El runId no coincide con tu expedición activa.');
    }

    const { dangerConfig, equipmentSnapshot, startedAt } = (activeRun as any);
    const config = dangerConfig as DangerConfig & { runMode?: RunMode };
    const runMode = resolveRunMode(config.runMode);
    
    const elapsedSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    const dangerLevel = config.baseRate + (config.quadraticFactor * elapsedSeconds * elapsedSeconds);
    const isCatastrophe = dangerLevel >= config.catastropheThreshold;

    let pendingLoot = computePendingLoot(
      elapsedSeconds,
      equipmentSnapshot as EquipmentSnapshot,
      dangerLevel,
      config,
      runMode,
    );
    
    // Add bonus loot from anomalies (forced items)
    const bonusLootIds = (activeRun as any).bonusLoot as string[] | null;
    if (bonusLootIds && bonusLootIds.length > 0) {
      for (const itemDefId of bonusLootIds) {
        const catalogItem = ITEM_CATALOG.find(i => i.id === itemDefId);
        if (catalogItem) {
          const existing = pendingLoot.find(l => l.itemId === itemDefId);
          if (existing) {
            existing.quantity += 1;
          } else {
            pendingLoot.push({
              itemId: catalogItem.id,
              displayName: catalogItem.displayName,
              iconKey: catalogItem.iconKey,
              quantity: 1,
              rarity: catalogItem.rarity as any
            });
          }
        }
      }
    }

    let finalLoot = pendingLoot;
    let currencyEarned = computeCurrencyReward(
      elapsedSeconds,
      dangerLevel,
      equipmentSnapshot as EquipmentSnapshot,
      config,
      runMode,
    );
    let xpEarned = computeXpReward(
      elapsedSeconds,
      dangerLevel,
      equipmentSnapshot as EquipmentSnapshot,
      config,
      runMode,
    );

    // Atomic transaction
    const extractionResult = await db.$transaction(async (tx: any) => {
        const definitionIdMap = await ensureItemDefinitionIds(tx, [
          ...finalLoot.map((item) => item.itemId),
          ID_EXTRACTION_INSURANCE,
        ]);
        const insuranceDefinitionId = definitionIdMap.get(ID_EXTRACTION_INSURANCE) ?? ID_EXTRACTION_INSURANCE;

        const progression = await tx.userProgression.findUnique({
          where: { userId }
        });

        const levelRewardBonus = computeLevelRewardBonus(progression?.currentLevel ?? 1);
        currencyEarned = Math.floor(currencyEarned * levelRewardBonus.currencyMultiplier);
        xpEarned = Math.floor(xpEarned * levelRewardBonus.xpMultiplier);
         
        if (isCatastrophe) {
           // Check for insurance
           const insurance = await tx.inventoryItem.findFirst({
              where: { userId, itemDefinitionId: insuranceDefinitionId, quantity: { gt: 0 } }
           });

           if (insurance) {
               finalLoot = applyInsurancePenalty(pendingLoot);
              
              // Consume 1 insurance
              if (insurance.quantity === 1) {
                 await tx.inventoryItem.delete({ where: { id: insurance.id } });
              } else {
                 await tx.inventoryItem.update({
                    where: { id: insurance.id },
                    data: { quantity: { decrement: 1 } }
                 });
              }
           } else {
              finalLoot = applyCatastrophePenalty(pendingLoot);
           }
           
           currencyEarned = 0;
           xpEarned = Math.floor(xpEarned * 0.25);

           if (runMode === RunMode.HARD) {
             await applyHardModeCatastropheGearLoss(tx, userId, equipmentSnapshot as EquipmentSnapshot);
           }
        }

        for (const item of finalLoot) {
          const definitionId = definitionIdMap.get(item.itemId);
          if (!definitionId) {
            continue;
          }

          const existingInv = await tx.inventoryItem.findFirst({
             where: { userId, itemDefinitionId: definitionId }
           });
           
           if (existingInv) {
             await tx.inventoryItem.update({
                where: { id: existingInv.id },
                data: { quantity: { increment: item.quantity }, acquiredAt: new Date() }
             });
          } else {
             await tx.inventoryItem.create({
                data: {
                   userId, 
                    itemDefinitionId: definitionId,
                    quantity: item.quantity,
                    acquiredAt: new Date()
                }
             });
          }
       }

        const latestLedger = await tx.currencyLedger.findFirst({
          where: { userId }, orderBy: { createdAt: 'desc' }
       });
       const prevBalance = latestLedger?.balanceAfter || 0;

       if (currencyEarned > 0 || isCatastrophe) {
          await tx.currencyLedger.create({
             data: {
                userId,
                amount: currencyEarned,
                balanceAfter: prevBalance + currencyEarned,
                entryType: isCatastrophe ? 'CATASTROPHE_PENALTY' : 'EXTRACTION_REWARD',
                referenceId: runId
             }
          });
       }

       if (progression) {
          const { newXp, newLevel } = calculateLevelProgress(
             progression.currentXp,
             progression.currentLevel,
             xpEarned
          );
          
          const totalScrapRun = finalLoot.reduce((sum: number, item: any) => sum + item.quantity, 0);

          await tx.userProgression.update({
             where: { userId },
             data: {
                currentXp: newXp,
                currentLevel: newLevel,
                totalScrapCollected: { increment: totalScrapRun },
                highestDangerSurvived: !isCatastrophe ? Math.max(Number(progression.highestDangerSurvived || 0), dangerLevel) : undefined,
                bestRunDurationSec: !isCatastrophe ? Math.max(Number(progression.bestRunDurationSec || 0), elapsedSeconds) : undefined,
             }
          });
       }

       const result = await tx.extractionResult.create({
          data: {
             runId: runId,
             userId,
             zoneId: activeRun.zoneId,
             status: isCatastrophe ? "FAILED" : "EXTRACTED",
             startedAt: activeRun.startedAt,
             resolvedAt: new Date(),
             durationSeconds: elapsedSeconds,
             dangerLevelAtClose: dangerLevel,
             catastropheOccurred: isCatastrophe,
             lootSnapshot: finalLoot,
             equipmentSnapshot: activeRun.equipmentSnapshot,
             currencyEarned,
             xpEarned
          }
       });

       await tx.activeRun.delete({ where: { id: (activeRun as any).id } });

        await tx.auditLog.create({
           data: {
              userId,
              action: isCatastrophe ? 'run.catastrophe' : 'run.extraction',
              payload: { runId, runMode, elapsedSeconds, finalLoot, currencyEarned, xpEarned }
           }
        });

       return result;
    });

    return {
       runId: extractionResult.runId,
       status: (extractionResult.status as string).toLowerCase() as any,
       durationSeconds: extractionResult.durationSeconds,
       dangerLevelAtClose: extractionResult.dangerLevelAtClose,
       catastropheOccurred: extractionResult.catastropheOccurred,
       loot: extractionResult.lootSnapshot as PendingLootDTO[],
       currencyEarned: extractionResult.currencyEarned,
       xpEarned: extractionResult.xpEarned
    };
  },

  async resolveAnomaly(userId: string, runId: string, anomalyId: string, decision: 'IGNORE' | 'INVESTIGATE'): Promise<{ message: string }> {
    const activeRun = await RunRepository.findActiveRun(userId);

    if (!activeRun || activeRun.id !== runId) {
      throw new DomainError('RUN_NOT_RUNNING', 'Expedición no encontrada o no válida.');
    }

    const currentAnomState = (activeRun.anomalyState || {}) as any;
    
    // Safety check: already resolved?
    if (currentAnomState[anomalyId]?.resolved) {
      throw new DomainError('VALIDATION_ERROR', 'Esta anomalía ya ha sido procesada.');
    }

    const updatedState = {
      ...currentAnomState,
      [anomalyId]: {
        resolved: true,
        decision,
        resolvedAt: new Date().toISOString()
      }
    };

    const updatedConfig = { ...(activeRun.dangerConfig as any) };
    const bonusLoot = (activeRun.bonusLoot || []) as string[];

    let message = "Anomalía ignorada satisfactoriamente.";

    if (decision === 'INVESTIGATE') {
      updatedConfig.baseRate += 0.20; // Massive danger spike
      bonusLoot.push('corrupted_crystal'); // Uncommon reward
      message = "Has obtenido un Cristal Corrupto, pero los escáneres están en rojo.";
    }

    await db.activeRun.update({
      where: { id: runId },
      data: {
        anomalyState: updatedState,
        dangerConfig: updatedConfig,
        bonusLoot: bonusLoot
      }
    });

    await db.auditLog.create({
      data: {
        userId,
        action: 'run.anomaly_resolved',
        payload: { runId, anomalyId, decision }
      }
    });

    return { message };
  }
};
