import 'server-only';

import { describe, expect, it, vi } from 'vitest';

import { db } from '@/server/db/client';
import { RunResolutionService } from '@/server/services/run-resolution.service';
import { seedTestRun, seedTestUser } from '@/server/__tests__/helpers/db-test-utils';

describe('RunResolutionService.resolveExtraction (integration)', () => {
  it('resolves happy path: transfers loot, updates balanceAfter, deletes ActiveRun, creates ExtractionResult', async () => {
    const fixedNow = Date.UTC(2026, 0, 1, 10, 0, 0);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(fixedNow);

    const userId = 'user-happy';
    try {
      await seedTestUser(userId);

      const { runId } = await seedTestRun({
        userId,
        startedAt: new Date(fixedNow - 120_000),
      });

      const result = await RunResolutionService.resolveExtraction(userId, runId);

      expect(result.status).toBe('extracted');
      expect(result.currencyEarned).toBeGreaterThan(0);
      expect(result.loot.length).toBeGreaterThan(0);

      const inventoryRows = await db.inventoryItem.findMany({ where: { userId }, orderBy: { itemDefinitionId: 'asc' } });
      expect(inventoryRows.length).toBeGreaterThan(0);

      const latestLedger = await db.currencyLedger.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
      expect(latestLedger?.amount).toBe(94);
      expect(latestLedger?.balanceAfter).toBe(94);

      const activeRun = await db.activeRun.findUnique({ where: { userId } });
      expect(activeRun).toBeNull();

      const extractionResult = await db.extractionResult.findFirst({ where: { runId, userId } });
      expect(extractionResult).not.toBeNull();
      expect(extractionResult?.status).toBe('EXTRACTED');
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('resolves catastrophe path: danger > 0.90 yields credits 0 and loot at 20%', async () => {
    const fixedNow = Date.UTC(2026, 0, 1, 10, 30, 0);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(fixedNow);

    const userId = 'user-catastrophe';
    try {
      await seedTestUser(userId);

      const { runId } = await seedTestRun({
        userId,
        startedAt: new Date(fixedNow - 600_000),
      });

      const result = await RunResolutionService.resolveExtraction(userId, runId);

      expect(result.status).toBe('failed');
      expect(result.catastropheOccurred).toBe(true);
      expect(result.dangerLevelAtClose).toBeGreaterThan(0.9);
      expect(result.currencyEarned).toBe(0);
      expect(result.loot.length).toBeGreaterThan(0);

      const latestLedger = await db.currencyLedger.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
      expect(latestLedger?.entryType).toBe('CATASTROPHE_PENALTY');
      expect(latestLedger?.amount).toBe(0);
      expect(latestLedger?.balanceAfter).toBe(0);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('is idempotent for no active run: throws RUN_NOT_RUNNING', async () => {
    const userId = 'user-idempotence';
    await seedTestUser(userId);

    await expect(RunResolutionService.resolveExtraction(userId, 'missing-run-id')).rejects.toMatchObject({
      code: 'RUN_NOT_RUNNING',
    });
  });

  it('self-heals missing ItemDefinition rows before persisting extraction loot', async () => {
    const fixedNow = Date.UTC(2026, 0, 1, 11, 0, 0);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(fixedNow);

    const userId = 'user-atomicity';
    try {
      await seedTestUser(userId);

      const { runId } = await seedTestRun({
        userId,
        startedAt: new Date(fixedNow - 120_000),
      });

      await db.itemDefinition.delete({ where: { id: 'scrap_metal' } });

      const result = await RunResolutionService.resolveExtraction(userId, runId);
      expect(result.status).toBe('extracted');

      const [restoredDefinition, inventoryAfter, activeRunAfter, extractionAfter] = await Promise.all([
        db.itemDefinition.findUnique({ where: { internalKey: 'scrap_metal' } }),
        db.inventoryItem.count({ where: { userId } }),
        db.activeRun.findUnique({ where: { userId } }),
        db.extractionResult.findFirst({ where: { runId } }),
      ]);

      expect(restoredDefinition?.id).toBe('scrap_metal');
      expect(inventoryAfter).toBeGreaterThan(0);
      expect(activeRunAfter).toBeNull();
      expect(extractionAfter?.status).toBe('EXTRACTED');

      const scrapRow = await db.inventoryItem.findFirst({
        where: { userId, itemDefinitionId: restoredDefinition?.id },
      });
      expect(scrapRow?.quantity).toBeGreaterThan(0);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('rewards higher level players with conservative currency/xp bonus', async () => {
    const fixedNow = Date.UTC(2026, 0, 1, 12, 0, 0);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(fixedNow);

    const lowLevelUserId = 'user-level-bonus-low';
    const highLevelUserId = 'user-level-bonus-high';

    try {
      await seedTestUser(lowLevelUserId);
      await seedTestUser(highLevelUserId);

      await db.userProgression.update({
        where: { userId: highLevelUserId },
        data: {
          currentLevel: 8,
          currentXp: 300,
        },
      });

      const [{ runId: lowRunId }, { runId: highRunId }] = await Promise.all([
        seedTestRun({
          userId: lowLevelUserId,
          startedAt: new Date(fixedNow - 120_000),
        }),
        seedTestRun({
          userId: highLevelUserId,
          startedAt: new Date(fixedNow - 120_000),
        }),
      ]);

      const [lowResult, highResult] = await Promise.all([
        RunResolutionService.resolveExtraction(lowLevelUserId, lowRunId),
        RunResolutionService.resolveExtraction(highLevelUserId, highRunId),
      ]);

      expect(highResult.currencyEarned).toBeGreaterThan(lowResult.currencyEarned);
      expect(highResult.xpEarned).toBeGreaterThan(lowResult.xpEarned);
      expect(lowResult.currencyEarned).toBeGreaterThan(0);
      expect(lowResult.xpEarned).toBeGreaterThan(0);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('grants better extraction rewards for high-tier equipment setup', async () => {
    const fixedNow = Date.UTC(2026, 0, 1, 13, 0, 0);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(fixedNow);

    const baselineUserId = 'user-equipment-bonus-base';
    const gearedUserId = 'user-equipment-bonus-geared';

    try {
      await seedTestUser(baselineUserId);
      await seedTestUser(gearedUserId);

      const startedAt = new Date(fixedNow - 120_000);

      const [{ runId: baseRunId }, { runId: gearedRunId }] = await Promise.all([
        seedTestRun({
          userId: baselineUserId,
          startedAt,
        }),
        seedTestRun({
          userId: gearedUserId,
          startedAt,
          equipmentSnapshot: {
            HEAD: 'helmet_explorer_sensor',
            BODY: 'light_armor_suit',
            HANDS: 'industrial_work_gloves',
            TOOL_PRIMARY: 'tool_nanofiber_precision',
            TOOL_SECONDARY: null,
            BACKPACK: 'backpack_advanced_expedition',
          },
        }),
      ]);

      const [baseResult, gearedResult] = await Promise.all([
        RunResolutionService.resolveExtraction(baselineUserId, baseRunId),
        RunResolutionService.resolveExtraction(gearedUserId, gearedRunId),
      ]);

      const baseLootTotal = baseResult.loot.reduce((sum, item) => sum + item.quantity, 0);
      const gearedLootTotal = gearedResult.loot.reduce((sum, item) => sum + item.quantity, 0);

      expect(gearedLootTotal).toBeGreaterThan(baseLootTotal);
      expect(gearedResult.currencyEarned).toBeGreaterThan(baseResult.currencyEarned);
      expect(gearedResult.xpEarned).toBeGreaterThan(baseResult.xpEarned);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('applies build synergy and archetype bonuses in extraction settlement', async () => {
    const fixedNow = Date.UTC(2026, 0, 1, 13, 30, 0);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(fixedNow);

    const archetypeUserId = 'user-archetype-bonus';
    const controlUserId = 'user-archetype-control';

    try {
      await seedTestUser(archetypeUserId);
      await seedTestUser(controlUserId);

      const startedAt = new Date(fixedNow - 180_000);

      const [{ runId: archetypeRunId }, { runId: controlRunId }] = await Promise.all([
        seedTestRun({
          userId: archetypeUserId,
          startedAt,
          equipmentSnapshot: {
            HEAD: 'helmet_hazard_predictor',
            BODY: 'suit_reactive_bulkframe',
            HANDS: 'gloves_flux_stabilizer',
            TOOL_PRIMARY: 'tool_singularity_harvester',
            TOOL_SECONDARY: null,
            BACKPACK: 'backpack_event_horizon',
          },
        }),
        seedTestRun({
          userId: controlUserId,
          startedAt,
          equipmentSnapshot: {
            HEAD: 'helmet_hazard_predictor',
            BODY: 'light_armor_suit',
            HANDS: 'industrial_work_gloves',
            TOOL_PRIMARY: 'portable_thermal_cutter',
            TOOL_SECONDARY: null,
            BACKPACK: 'extended_cargo_backpack',
          },
        }),
      ]);

      const [archetypeResult, controlResult] = await Promise.all([
        RunResolutionService.resolveExtraction(archetypeUserId, archetypeRunId),
        RunResolutionService.resolveExtraction(controlUserId, controlRunId),
      ]);

      expect(archetypeResult.status).toBe('extracted');
      expect(controlResult.status).toBe('extracted');

      const archetypeLoot = archetypeResult.loot.reduce((sum, item) => sum + item.quantity, 0);
      const controlLoot = controlResult.loot.reduce((sum, item) => sum + item.quantity, 0);

      expect(archetypeLoot).toBeGreaterThan(controlLoot);
      expect(archetypeResult.currencyEarned).toBeGreaterThan(controlResult.currencyEarned);
      expect(archetypeResult.xpEarned).toBeGreaterThan(controlResult.xpEarned);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('extracts third-zone run and yields new high-tier materials', async () => {
    const fixedNow = Date.UTC(2026, 0, 1, 14, 0, 0);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(fixedNow);

    const userId = 'user-third-zone-extraction';
    try {
      await seedTestUser(userId);
      await db.userProgression.update({ where: { userId }, data: { currentLevel: 9 } });

      const started = await RunResolutionService.startRun(userId, 'abyssal_fracture');
      await db.activeRun.update({
        where: { id: started.runId },
        data: {
          startedAt: new Date(fixedNow - 90_000),
        },
      });

      const result = await RunResolutionService.resolveExtraction(userId, started.runId);
      expect(result.status).toBe('extracted');

      const newMaterialIds = new Set(['quantum_filament', 'void_alloy', 'entropy_shard']);
      const newMaterialLoot = result.loot.filter((entry) => newMaterialIds.has(entry.itemId));
      expect(newMaterialLoot.length).toBeGreaterThan(0);

      const inventoryRows = await db.inventoryItem.findMany({
        where: {
          userId,
          itemDefinitionId: { in: ['quantum_filament', 'void_alloy', 'entropy_shard'] },
        },
      });
      const totalNewMaterialQty = inventoryRows.reduce((sum, row) => sum + row.quantity, 0);
      expect(totalNewMaterialQty).toBeGreaterThan(0);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('SAFE catastrophe keeps equipped gear intact', async () => {
    const fixedNow = Date.UTC(2026, 0, 1, 15, 0, 0);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(fixedNow);
    const userId = 'user-safe-catastrophe-gear';

    try {
      await seedTestUser(userId);

      await db.inventoryItem.upsert({
        where: { userId_itemDefinitionId: { userId, itemDefinitionId: 'reinforced_helmet' } },
        update: { quantity: 1 },
        create: { userId, itemDefinitionId: 'reinforced_helmet', quantity: 1 },
      });

      await db.equipmentSlot_.update({
        where: { userId_slot: { userId, slot: 'HEAD' } },
        data: { itemDefinitionId: 'reinforced_helmet' },
      });

      const { runId } = await seedTestRun({
        userId,
        startedAt: new Date(fixedNow - 600_000),
        equipmentSnapshot: {
          HEAD: 'reinforced_helmet',
          BODY: null,
          HANDS: null,
          TOOL_PRIMARY: null,
          TOOL_SECONDARY: null,
          BACKPACK: null,
        },
        dangerConfig: {
          baseRate: 0.04,
          quadraticFactor: 0.000004,
          catastropheThreshold: 0.9,
          dangerLootBonus: 0.8,
          baseLootPerSecond: { scrap_metal: 0.5 },
          baseCreditsPerMinute: 45,
          baseXpPerSecond: 3.5,
          runMode: 'SAFE',
        },
      });

      const result = await RunResolutionService.resolveExtraction(userId, runId);
      expect(result.status).toBe('failed');

      const slotAfter = await db.equipmentSlot_.findUnique({ where: { userId_slot: { userId, slot: 'HEAD' } } });
      const itemAfter = await db.inventoryItem.findUnique({ where: { userId_itemDefinitionId: { userId, itemDefinitionId: 'reinforced_helmet' } } });

      expect(slotAfter?.itemDefinitionId).toBe('reinforced_helmet');
      expect(itemAfter?.quantity).toBe(1);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('HARD catastrophe removes equipped gear atomically (slot + inventory)', async () => {
    const fixedNow = Date.UTC(2026, 0, 1, 16, 0, 0);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(fixedNow);
    const userId = 'user-hard-catastrophe-gear';

    try {
      await seedTestUser(userId);

      await db.inventoryItem.upsert({
        where: { userId_itemDefinitionId: { userId, itemDefinitionId: 'reinforced_helmet' } },
        update: { quantity: 1 },
        create: { userId, itemDefinitionId: 'reinforced_helmet', quantity: 1 },
      });

      await db.equipmentSlot_.update({
        where: { userId_slot: { userId, slot: 'HEAD' } },
        data: { itemDefinitionId: 'reinforced_helmet' },
      });

      const { runId } = await seedTestRun({
        userId,
        startedAt: new Date(fixedNow - 600_000),
        equipmentSnapshot: {
          HEAD: 'reinforced_helmet',
          BODY: null,
          HANDS: null,
          TOOL_PRIMARY: null,
          TOOL_SECONDARY: null,
          BACKPACK: null,
        },
        dangerConfig: {
          baseRate: 0.04,
          quadraticFactor: 0.000004,
          catastropheThreshold: 0.9,
          dangerLootBonus: 0.8,
          baseLootPerSecond: { scrap_metal: 0.5 },
          baseCreditsPerMinute: 45,
          baseXpPerSecond: 3.5,
          runMode: 'HARD',
        },
      });

      const result = await RunResolutionService.resolveExtraction(userId, runId);
      expect(result.status).toBe('failed');

      const slotAfter = await db.equipmentSlot_.findUnique({ where: { userId_slot: { userId, slot: 'HEAD' } } });
      const itemAfter = await db.inventoryItem.findUnique({ where: { userId_itemDefinitionId: { userId, itemDefinitionId: 'reinforced_helmet' } } });

      expect(slotAfter?.itemDefinitionId).toBeNull();
      expect(itemAfter).toBeNull();
    } finally {
      nowSpy.mockRestore();
    }
  });
});
