import 'server-only';
import { db } from '../db/client';
import { RunRepository } from '../repositories/run.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { DomainError } from '../domain/inventory/inventory.service';
import { SHIPYARD_CEMETERY_CONFIG } from '../../config/game.config';
import { RunStartedDTO, ExtractionResultDTO, PendingLootDTO } from '../../types/dto.types';
import { DangerConfig, EquipmentSnapshot } from '../domain/run/run.calculator';

export const RunResolutionService = {
  async startRun(userId: string, zoneId: string): Promise<RunStartedDTO> {
    // 1. Ensure no active run
    const activeRun = await RunRepository.findActiveRun(userId);
    if (activeRun) {
      throw new DomainError('RUN_ALREADY_ACTIVE', 'Ya tienes una expedición en curso.');
    }

    if (zoneId !== SHIPYARD_CEMETERY_CONFIG.internalKey) {
      throw new DomainError('VALIDATION_ERROR', 'Zona no disponible.');
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

    const dangerConfig: DangerConfig = {
      baseRate: SHIPYARD_CEMETERY_CONFIG.baseRate,
      quadraticFactor: SHIPYARD_CEMETERY_CONFIG.quadraticFactor,
      catastropheThreshold: SHIPYARD_CEMETERY_CONFIG.catastropheThreshold,
      dangerLootBonus: SHIPYARD_CEMETERY_CONFIG.dangerLootBonus,
      baseLootPerSecond: SHIPYARD_CEMETERY_CONFIG.baseLootPerSecond,
      baseCreditsPerMinute: SHIPYARD_CEMETERY_CONFIG.baseCreditsPerMinute,
      baseXpPerSecond: SHIPYARD_CEMETERY_CONFIG.baseXpPerSecond,
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
          dangerConfig: dangerConfig as any,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'run.start',
          payload: { runId: newRun.id, zoneId, equipmentSnapshot },
        },
      });

      return newRun.id;
    });

    return {
      runId,
      zoneId,
      startedAt: startedAt.toISOString(),
    };
  },

  async resolveExtraction(userId: string, runId: string): Promise<ExtractionResultDTO> {
    const activeRun = await RunRepository.findActiveRun(userId);
    
    // Safety checks as requested
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
    const config = dangerConfig as DangerConfig;
    
    // Extract logical variables out of the timestamp snapshot
    const elapsedSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    const dangerLevel = config.baseRate + (config.quadraticFactor * elapsedSeconds * elapsedSeconds);
    const isCatastrophe = dangerLevel >= config.catastropheThreshold;

    // Importing pure calculators internally scoped or implicitly attached within run.calculator.ts via PlayerState logic
    const { computePendingLoot, applyCatastrophePenalty, computeCurrencyReward, computeXpReward } = require('../domain/run/run.calculator');
    
    let pendingLoot = computePendingLoot(elapsedSeconds, equipmentSnapshot as EquipmentSnapshot, dangerLevel, config);
    let finalLoot = pendingLoot;
    let currencyEarned = computeCurrencyReward(elapsedSeconds, dangerLevel, equipmentSnapshot as EquipmentSnapshot, config);
    let xpEarned = computeXpReward(elapsedSeconds, dangerLevel, config);

    if (isCatastrophe) {
       finalLoot = applyCatastrophePenalty(pendingLoot);
       currencyEarned = 0;
       xpEarned = Math.floor(xpEarned * 0.25);
    }

    // Atomic transaction across domains
    const extractionResult = await db.$transaction(async (tx: any) => {
       // Upsert items into inventory
       for (const item of finalLoot) {
          const existingInv = await tx.inventoryItem.findFirst({
             where: { userId, itemDefinitionId: item.itemId }
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
                   itemDefinitionId: item.itemId,
                   quantity: item.quantity,
                   acquiredAt: new Date()
                }
             });
          }
       }

       // Economy ledger resolution
       const latestLedger = await tx.currencyLedger.findFirst({
          where: { userId }, orderBy: { createdAt: 'desc' }
       });
       const prevBalance = latestLedger?.balanceAfter || 0;

       if (currencyEarned > 0) {
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

       // Core User progression logic
       const progression = await tx.userProgression.findUnique({
          where: { userId }
       });
       
       if (progression) {
          let newXp = progression.currentXp + xpEarned;
          let newLevel = progression.currentLevel;
          const totalScrapRun = finalLoot.reduce((sum: number, item: any) => sum + item.quantity, 0);

          // Leveling loop based on scaling formula: level * 1000
          while (newXp >= newLevel * 1000) {
             newXp -= newLevel * 1000;
             newLevel += 1;
          }

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

       // Append directly to the historic log bypassing the `ActiveRunStatus` directly deleting later
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

       // 10. CLEANUP - Hard delete the physical pointer
       await tx.activeRun.delete({ where: { id: (activeRun as any).id } });

       await tx.auditLog.create({
          data: {
             userId,
             action: isCatastrophe ? 'run.catastrophe' : 'run.extraction',
             payload: { runId, elapsedSeconds, finalLoot, currencyEarned, xpEarned }
          }
       });

       return result;
    });

    return {
       runId: extractionResult.runId,
       status: extractionResult.status as "extracted" | "failed",
       durationSeconds: extractionResult.durationSeconds,
       dangerLevelAtClose: extractionResult.dangerLevelAtClose,
       catastropheOccurred: extractionResult.catastropheOccurred,
       loot: extractionResult.lootSnapshot as PendingLootDTO[],
       currencyEarned: extractionResult.currencyEarned,
       xpEarned: extractionResult.xpEarned
    };
  }
};
