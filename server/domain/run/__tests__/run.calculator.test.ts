import 'server-only';

import { describe, expect, it } from 'vitest';

import { SHIPYARD_CEMETERY_CONFIG } from '@/config/game.config';
import {
  applyEquipmentToDangerConfig,
  applyCatastrophePenalty,
  RUN_MODE_REWARD_PROFILES,
  computeEquipmentOutcomeMultipliers,
  computeCurrencyReward,
  computeDangerLevel,
  computePendingLoot,
  computeXpReward,
  resolveActiveBuildArchetype,
  resolveActiveBuildSynergies,
  resolveRunMode,
} from '@/server/domain/run/run.calculator';
import { RunMode } from '@/types/game.types';

const emptyEquipmentSnapshot = {
  HEAD: null,
  BODY: null,
  HANDS: null,
  TOOL_PRIMARY: null,
  TOOL_SECONDARY: null,
  BACKPACK: null,
};

const gearedSnapshot = {
  HEAD: 'helmet_explorer_sensor',
  BODY: 'light_armor_suit',
  HANDS: 'industrial_work_gloves',
  TOOL_PRIMARY: 'tool_nanofiber_precision',
  TOOL_SECONDARY: null,
  BACKPACK: 'backpack_advanced_expedition',
};

describe('run.calculator', () => {
  it('computeDangerLevel returns exact values at t=0 and t=600', () => {
    expect(computeDangerLevel(0, SHIPYARD_CEMETERY_CONFIG)).toBe(0.04);
    expect(computeDangerLevel(600, SHIPYARD_CEMETERY_CONFIG)).toBe(1.48);
  });

  it('computePendingLoot returns deterministic SAFE quantities and empty at t=0', () => {
    const dangerAtTenMinutes = computeDangerLevel(600, SHIPYARD_CEMETERY_CONFIG);

    expect(
      computePendingLoot(0, emptyEquipmentSnapshot, 0.04, SHIPYARD_CEMETERY_CONFIG)
    ).toEqual([]);

    const lootAtTenMinutes = computePendingLoot(
      600,
      emptyEquipmentSnapshot,
      dangerAtTenMinutes,
      SHIPYARD_CEMETERY_CONFIG
    );

    expect(lootAtTenMinutes.length).toBeGreaterThan(0);
    expect(lootAtTenMinutes.every((entry) => entry.quantity > 0)).toBe(true);
  });

  it('applyCatastrophePenalty applies 20% floor and drops zero results', () => {
    const penalized = applyCatastrophePenalty([
      { itemId: 'scrap_metal', displayName: 'Scrap', iconKey: 'icon_scrap', rarity: 'COMMON', quantity: 100 },
      { itemId: 'energy_cell', displayName: 'Energy', iconKey: 'icon_energy', rarity: 'COMMON', quantity: 7 },
      { itemId: 'corrupted_crystal', displayName: 'Crystal', iconKey: 'icon_crystal', rarity: 'UNCOMMON', quantity: 1 },
    ]);

    expect(penalized).toEqual([
      { itemId: 'scrap_metal', displayName: 'Scrap', iconKey: 'icon_scrap', rarity: 'COMMON', quantity: 20 },
      { itemId: 'energy_cell', displayName: 'Energy', iconKey: 'icon_energy', rarity: 'COMMON', quantity: 1 },
    ]);
  });

  it('computeCurrencyReward returns deterministic values at t=0 and t=600', () => {
    const dangerAtTenMinutes = computeDangerLevel(600, SHIPYARD_CEMETERY_CONFIG);

    expect(computeCurrencyReward(0, 0.04, emptyEquipmentSnapshot, SHIPYARD_CEMETERY_CONFIG)).toBe(0);
    expect(computeCurrencyReward(600, dangerAtTenMinutes, emptyEquipmentSnapshot, SHIPYARD_CEMETERY_CONFIG)).toBeGreaterThan(0);
  });

  it('applies deterministic rarity and equipment multipliers to loot/currency', () => {
    const multipliers = computeEquipmentOutcomeMultipliers(gearedSnapshot);

    expect(multipliers.lootMultiplier).toBeGreaterThan(1.5);
    expect(multipliers.currencyMultiplier).toBeGreaterThan(1);
    expect(multipliers.xpMultiplier).toBeGreaterThan(1.02);

    const elapsedSeconds = 120;
    const dangerLevel = computeDangerLevel(elapsedSeconds, SHIPYARD_CEMETERY_CONFIG);

    const baseLoot = computePendingLoot(
      elapsedSeconds,
      emptyEquipmentSnapshot,
      dangerLevel,
      SHIPYARD_CEMETERY_CONFIG
    );

    const gearedLoot = computePendingLoot(
      elapsedSeconds,
      gearedSnapshot,
      dangerLevel,
      SHIPYARD_CEMETERY_CONFIG
    );

    const baseTotalLoot = baseLoot.reduce((sum, item) => sum + item.quantity, 0);
    const gearedTotalLoot = gearedLoot.reduce((sum, item) => sum + item.quantity, 0);
    expect(gearedTotalLoot).toBeGreaterThan(baseTotalLoot);

    const baseCredits = computeCurrencyReward(
      elapsedSeconds,
      dangerLevel,
      emptyEquipmentSnapshot,
      SHIPYARD_CEMETERY_CONFIG
    );

    const gearedCredits = computeCurrencyReward(
      elapsedSeconds,
      dangerLevel,
      gearedSnapshot,
      SHIPYARD_CEMETERY_CONFIG
    );

    expect(gearedCredits).toBeGreaterThan(baseCredits);
  });

  it('applies deterministic equipment+rarity xp scaling with explicit cap', () => {
    const elapsedSeconds = 180;
    const dangerLevel = computeDangerLevel(elapsedSeconds, SHIPYARD_CEMETERY_CONFIG);

    const baseXp = computeXpReward(
      elapsedSeconds,
      dangerLevel,
      emptyEquipmentSnapshot,
      SHIPYARD_CEMETERY_CONFIG
    );

    const gearedXp = computeXpReward(
      elapsedSeconds,
      dangerLevel,
      gearedSnapshot,
      SHIPYARD_CEMETERY_CONFIG
    );

    expect(baseXp).toBeGreaterThan(0);
    expect(gearedXp).toBeGreaterThan(baseXp);
  });

  it('applies deterministic SAFE vs HARD mode reward profile differences', () => {
    const elapsedSeconds = 300;
    const dangerLevel = computeDangerLevel(elapsedSeconds, SHIPYARD_CEMETERY_CONFIG);

    const safeLoot = computePendingLoot(
      elapsedSeconds,
      emptyEquipmentSnapshot,
      dangerLevel,
      SHIPYARD_CEMETERY_CONFIG,
      RunMode.SAFE,
    );
    const hardLoot = computePendingLoot(
      elapsedSeconds,
      emptyEquipmentSnapshot,
      dangerLevel,
      SHIPYARD_CEMETERY_CONFIG,
      RunMode.HARD,
    );

    const safeLootTotal = safeLoot.reduce((sum, item) => sum + item.quantity, 0);
    const hardLootTotal = hardLoot.reduce((sum, item) => sum + item.quantity, 0);
    expect(hardLootTotal).toBeGreaterThan(safeLootTotal);

    const safeCurrency = computeCurrencyReward(
      elapsedSeconds,
      dangerLevel,
      emptyEquipmentSnapshot,
      SHIPYARD_CEMETERY_CONFIG,
      RunMode.SAFE,
    );
    const hardCurrency = computeCurrencyReward(
      elapsedSeconds,
      dangerLevel,
      emptyEquipmentSnapshot,
      SHIPYARD_CEMETERY_CONFIG,
      RunMode.HARD,
    );
    expect(hardCurrency).toBeGreaterThan(safeCurrency);

    const safeXp = computeXpReward(
      elapsedSeconds,
      dangerLevel,
      emptyEquipmentSnapshot,
      SHIPYARD_CEMETERY_CONFIG,
      RunMode.SAFE,
    );
    const hardXp = computeXpReward(
      elapsedSeconds,
      dangerLevel,
      emptyEquipmentSnapshot,
      SHIPYARD_CEMETERY_CONFIG,
      RunMode.HARD,
    );
    expect(hardXp).toBeGreaterThan(safeXp);

    expect(RUN_MODE_REWARD_PROFILES.SAFE.currencyMultiplier).toBeLessThan(1);
    expect(RUN_MODE_REWARD_PROFILES.HARD.currencyMultiplier).toBeGreaterThan(1);
    expect(resolveRunMode('invalid')).toBe(RunMode.SAFE);
  });

  it('tunes danger config at snapshot time from equipment resistance + rarity', () => {
    const tuned = applyEquipmentToDangerConfig(SHIPYARD_CEMETERY_CONFIG, gearedSnapshot);

    expect(tuned.baseRate).toBeLessThan(SHIPYARD_CEMETERY_CONFIG.baseRate);
    expect(tuned.quadraticFactor).toBeLessThan(SHIPYARD_CEMETERY_CONFIG.quadraticFactor);
    expect(tuned.catastropheThreshold).toBeGreaterThan(SHIPYARD_CEMETERY_CONFIG.catastropheThreshold);
  });

  it('resolves build synergies deterministically and surfaces archetype when requirements are met', () => {
    const apexSnapshot = {
      HEAD: 'helmet_hazard_predictor',
      BODY: 'suit_reactive_bulkframe',
      HANDS: 'gloves_flux_stabilizer',
      TOOL_PRIMARY: 'tool_singularity_harvester',
      TOOL_SECONDARY: null,
      BACKPACK: 'backpack_event_horizon',
    };

    const firstPass = resolveActiveBuildSynergies(apexSnapshot).map((entry) => entry.id);
    const secondPass = resolveActiveBuildSynergies(apexSnapshot).map((entry) => entry.id);

    expect(firstPass).toEqual(secondPass);
    expect(firstPass).toContain('survey_chain');
    expect(firstPass).toContain('fortress_protocol');
    expect(firstPass).toContain('void_cartographer');

    const archetype = resolveActiveBuildArchetype(apexSnapshot);
    expect(archetype?.id).toBe('void_cartographer');

    const multipliers = computeEquipmentOutcomeMultipliers(apexSnapshot);
    expect(multipliers.lootMultiplier).toBeLessThanOrEqual(2.5);
    expect(multipliers.currencyMultiplier).toBeLessThanOrEqual(2.5);
    expect(multipliers.xpMultiplier).toBeLessThanOrEqual(2.2);
  });
});
