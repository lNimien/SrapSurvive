import 'server-only';

import { describe, expect, it } from 'vitest';

import { ABYSSAL_FRACTURE_CONFIG, ORBITAL_DERELICT_CONFIG } from '@/config/game.config';
import { seedTestUser } from '@/server/__tests__/helpers/db-test-utils';
import { db } from '@/server/db/client';
import { applyEquipmentToDangerConfig } from '@/server/domain/run/run.calculator';
import { RunResolutionService } from '@/server/services/run-resolution.service';
import { RunMode } from '@/types/game.types';

describe('RunResolutionService.startRun (integration)', () => {
  it('creates ActiveRun with selected second zone', async () => {
    const userId = 'user-start-run-zone';
    await seedTestUser(userId);
    await db.userProgression.update({ where: { userId }, data: { currentLevel: ORBITAL_DERELICT_CONFIG.minLevel } });

    const started = await RunResolutionService.startRun(userId, ORBITAL_DERELICT_CONFIG.internalKey);

    expect(started.zoneId).toBe(ORBITAL_DERELICT_CONFIG.internalKey);

    const activeRun = await db.activeRun.findUnique({ where: { userId } });
    expect(activeRun?.zoneId).toBe(ORBITAL_DERELICT_CONFIG.internalKey);
  });

  it('snapshots dangerConfig from chosen zone', async () => {
    const userId = 'user-start-run-snapshot';
    await seedTestUser(userId);
    await db.userProgression.update({ where: { userId }, data: { currentLevel: ORBITAL_DERELICT_CONFIG.minLevel } });

    await RunResolutionService.startRun(userId, ORBITAL_DERELICT_CONFIG.internalKey);

    const activeRun = await db.activeRun.findUnique({ where: { userId } });
    const dangerConfig = activeRun?.dangerConfig as {
      baseRate: number;
      quadraticFactor: number;
      catastropheThreshold: number;
      dangerLootBonus: number;
      baseCreditsPerMinute: number;
      baseXpPerSecond: number;
      baseLootPerSecond: Record<string, number>;
    };

    expect(dangerConfig.baseRate).toBe(ORBITAL_DERELICT_CONFIG.baseRate);
    expect(dangerConfig.quadraticFactor).toBe(ORBITAL_DERELICT_CONFIG.quadraticFactor);
    expect(dangerConfig.catastropheThreshold).toBe(ORBITAL_DERELICT_CONFIG.catastropheThreshold);
    expect(dangerConfig.dangerLootBonus).toBe(ORBITAL_DERELICT_CONFIG.dangerLootBonus);
    expect(dangerConfig.baseCreditsPerMinute).toBe(ORBITAL_DERELICT_CONFIG.baseCreditsPerMinute);
    expect(dangerConfig.baseXpPerSecond).toBe(ORBITAL_DERELICT_CONFIG.baseXpPerSecond);
    expect(dangerConfig.baseLootPerSecond).toEqual(ORBITAL_DERELICT_CONFIG.baseLootPerSecond);
  });

  it('applies equipped rarity/danger modifiers into dangerConfig snapshot', async () => {
    const userId = 'user-start-run-equipment-snapshot';
    await seedTestUser(userId);
    await db.userProgression.update({ where: { userId }, data: { currentLevel: ORBITAL_DERELICT_CONFIG.minLevel } });

    await db.equipmentSlot_.update({
      where: { userId_slot: { userId, slot: 'HEAD' } },
      data: { itemDefinitionId: 'helmet_explorer_sensor' },
    });
    await db.equipmentSlot_.update({
      where: { userId_slot: { userId, slot: 'BODY' } },
      data: { itemDefinitionId: 'light_armor_suit' },
    });
    await db.equipmentSlot_.update({
      where: { userId_slot: { userId, slot: 'TOOL_PRIMARY' } },
      data: { itemDefinitionId: 'tool_nanofiber_precision' },
    });
    await db.equipmentSlot_.update({
      where: { userId_slot: { userId, slot: 'BACKPACK' } },
      data: { itemDefinitionId: 'backpack_advanced_expedition' },
    });

    await RunResolutionService.startRun(userId, ORBITAL_DERELICT_CONFIG.internalKey);

    const activeRun = await db.activeRun.findUnique({ where: { userId } });
    const dangerConfig = activeRun?.dangerConfig as {
      baseRate: number;
      quadraticFactor: number;
      catastropheThreshold: number;
      dangerLootBonus: number;
      baseCreditsPerMinute: number;
      baseXpPerSecond: number;
      baseLootPerSecond: Record<string, number>;
    };

    const expected = applyEquipmentToDangerConfig(ORBITAL_DERELICT_CONFIG, {
      HEAD: 'helmet_explorer_sensor',
      BODY: 'light_armor_suit',
      HANDS: null,
      TOOL_PRIMARY: 'tool_nanofiber_precision',
      TOOL_SECONDARY: null,
      BACKPACK: 'backpack_advanced_expedition',
    });

    expect(dangerConfig.baseRate).toBeCloseTo(expected.baseRate, 8);
    expect(dangerConfig.quadraticFactor).toBeCloseTo(expected.quadraticFactor, 10);
    expect(dangerConfig.catastropheThreshold).toBeCloseTo(expected.catastropheThreshold, 8);
  });

  it('rejects invalid zoneId', async () => {
    const userId = 'user-start-run-invalid-zone';
    await seedTestUser(userId);

    await expect(RunResolutionService.startRun(userId, 'invalid_zone')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('rejects startRun when player level is below zone minimum', async () => {
    const userId = 'user-start-run-level-locked';
    await seedTestUser(userId);
    await db.userProgression.update({
      where: { userId },
      data: { currentLevel: ABYSSAL_FRACTURE_CONFIG.minLevel - 1 },
    });

    await expect(
      RunResolutionService.startRun(userId, ABYSSAL_FRACTURE_CONFIG.internalKey)
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('allows startRun at required level and snapshots third zone config', async () => {
    const userId = 'user-start-run-third-zone';
    await seedTestUser(userId);
    await db.userProgression.update({ where: { userId }, data: { currentLevel: ABYSSAL_FRACTURE_CONFIG.minLevel } });

    const started = await RunResolutionService.startRun(userId, ABYSSAL_FRACTURE_CONFIG.internalKey);

    expect(started.zoneId).toBe(ABYSSAL_FRACTURE_CONFIG.internalKey);

    const activeRun = await db.activeRun.findUnique({ where: { userId } });
    const dangerConfig = activeRun?.dangerConfig as {
      baseRate: number;
      quadraticFactor: number;
      catastropheThreshold: number;
      dangerLootBonus: number;
      baseCreditsPerMinute: number;
      baseXpPerSecond: number;
      baseLootPerSecond: Record<string, number>;
    };

    expect(activeRun?.zoneId).toBe(ABYSSAL_FRACTURE_CONFIG.internalKey);
    expect(dangerConfig.baseRate).toBe(ABYSSAL_FRACTURE_CONFIG.baseRate);
    expect(dangerConfig.quadraticFactor).toBe(ABYSSAL_FRACTURE_CONFIG.quadraticFactor);
    expect(dangerConfig.catastropheThreshold).toBe(ABYSSAL_FRACTURE_CONFIG.catastropheThreshold);
    expect(dangerConfig.dangerLootBonus).toBe(ABYSSAL_FRACTURE_CONFIG.dangerLootBonus);
    expect(dangerConfig.baseCreditsPerMinute).toBe(ABYSSAL_FRACTURE_CONFIG.baseCreditsPerMinute);
    expect(dangerConfig.baseXpPerSecond).toBe(ABYSSAL_FRACTURE_CONFIG.baseXpPerSecond);
    expect(dangerConfig.baseLootPerSecond).toEqual(ABYSSAL_FRACTURE_CONFIG.baseLootPerSecond);
  });

  it('snapshots run mode in danger config (SAFE default / HARD explicit)', async () => {
    const safeUserId = 'user-start-run-safe-mode';
    const hardUserId = 'user-start-run-hard-mode';

    await seedTestUser(safeUserId);
    await seedTestUser(hardUserId);

    await db.userProgression.update({ where: { userId: safeUserId }, data: { currentLevel: ORBITAL_DERELICT_CONFIG.minLevel } });
    await db.userProgression.update({ where: { userId: hardUserId }, data: { currentLevel: ORBITAL_DERELICT_CONFIG.minLevel } });

    await RunResolutionService.startRun(safeUserId, ORBITAL_DERELICT_CONFIG.internalKey);
    await RunResolutionService.startRun(hardUserId, ORBITAL_DERELICT_CONFIG.internalKey, RunMode.HARD);

    const safeRun = await db.activeRun.findUnique({ where: { userId: safeUserId } });
    const hardRun = await db.activeRun.findUnique({ where: { userId: hardUserId } });

    const safeConfig = safeRun?.dangerConfig as { runMode?: string };
    const hardConfig = hardRun?.dangerConfig as { runMode?: string };

    expect(safeConfig.runMode).toBe('SAFE');
    expect(hardConfig.runMode).toBe('HARD');
  });
});
