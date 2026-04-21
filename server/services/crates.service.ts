import 'server-only';

import { db } from '@/server/db/client';
import { CRATE_DEFINITIONS, CrateDefinition, getCrateById, getRarityFromItemDefinitionId } from '@/config/crates.config';
import { ITEM_CATALOG } from '@/config/game.config';
import { CrateDTO, CrateOpenResultDTO, CrateRewardPreviewDTO } from '@/types/dto.types';
import {
  computeDynamicCratePrice,
  computePityState,
  isEpicOrHigherRarity,
  selectWeightedReward,
  toProbabilityPercent,
} from '@/server/domain/crates/crates.logic';
import { DomainError } from '@/server/domain/inventory/inventory.service';

type TxClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

const CRATE_OPEN_AUDIT_ACTION = 'crate.open';
const CRATE_DYNAMIC_PRICING_POLICY = {
  incrementPerOpenPercent: 12,
  maxMultiplierPercent: 220,
} as const;

const CRATE_PITY_THRESHOLD_BY_TIER: Record<CrateDefinition['visualTier'], number> = {
  SCAVENGER: 12,
  TACTICAL: 10,
  RELIC: 8,
};

interface ParsedCrateOpenAudit {
  crateId: string;
  rewardRarity: string | null;
}

function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

function getPityThreshold(crate: CrateDefinition): number {
  return CRATE_PITY_THRESHOLD_BY_TIER[crate.visualTier] ?? 10;
}

function parseCrateOpenAuditPayload(payload: unknown): ParsedCrateOpenAudit | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const casted = payload as Record<string, unknown>;
  const crateId = typeof casted.crateId === 'string' ? casted.crateId : null;
  if (!crateId) {
    return null;
  }

  return {
    crateId,
    rewardRarity: typeof casted.rewardRarity === 'string' ? casted.rewardRarity : null,
  };
}

function computeOpensWithoutEpicFromHistory(rows: { payload: unknown }[], crateId: string): number {
  let opensWithoutEpic = 0;

  for (const row of rows) {
    const parsed = parseCrateOpenAuditPayload(row.payload);
    if (!parsed || parsed.crateId !== crateId) {
      continue;
    }

    if (parsed.rewardRarity === 'EPIC' || parsed.rewardRarity === 'LEGENDARY' || parsed.rewardRarity === 'CORRUPTED') {
      break;
    }

    opensWithoutEpic += 1;
  }

  return opensWithoutEpic;
}

async function ensureItemDefinitionIds(tx: TxClient, internalKeys: string[]): Promise<Map<string, string>> {
  const uniqueKeys = [...new Set(internalKeys)];
  const map = new Map<string, string>();

  for (const internalKey of uniqueKeys) {
    const catalogItem = ITEM_CATALOG.find((item) => item.id === internalKey);
    if (!catalogItem) {
      continue;
    }

    const definition = await tx.itemDefinition.upsert({
      where: { internalKey },
      update: {
        displayName: catalogItem.displayName,
        description: catalogItem.description,
        rarity: catalogItem.rarity as never,
        baseValue: catalogItem.baseValue,
        stackable: catalogItem.maxStack > 1,
        maxStack: catalogItem.maxStack,
        iconKey: catalogItem.iconKey,
        metadata: catalogItem.configOptions ?? {},
      },
      create: {
        id: catalogItem.id,
        internalKey: catalogItem.id,
        displayName: catalogItem.displayName,
        description: catalogItem.description,
        rarity: catalogItem.rarity as never,
        baseValue: catalogItem.baseValue,
        stackable: catalogItem.maxStack > 1,
        maxStack: catalogItem.maxStack,
        iconKey: catalogItem.iconKey,
        metadata: catalogItem.configOptions ?? {},
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

function toRewardPreview(crate: CrateDefinition): CrateRewardPreviewDTO[] {
  const totalWeight = crate.rewards.reduce((sum, reward) => sum + reward.weight, 0);

  return crate.rewards
    .map((reward) => {
      const item = ITEM_CATALOG.find((candidate) => candidate.id === reward.itemDefinitionId);
      if (!item) return null;

      return {
        itemDefinitionId: reward.itemDefinitionId,
        displayName: item.displayName,
        rarity: getRarityFromItemDefinitionId(reward.itemDefinitionId),
        iconKey: item.iconKey,
        probabilityPercent: toProbabilityPercent(reward.weight, totalWeight),
        quantityMin: reward.quantityMin,
        quantityMax: reward.quantityMax,
      };
    })
    .filter((reward): reward is CrateRewardPreviewDTO => reward !== null)
    .sort((left, right) => right.probabilityPercent - left.probabilityPercent);
}

function toCrateDTO(
  crate: CrateDefinition,
  playerLevel: number,
  dailyOpenCount: number,
  opensWithoutEpic: number,
): CrateDTO {
  const minLevel = crate.minLevel ?? 1;
  const pityThreshold = getPityThreshold(crate);
  const pityState = computePityState(pityThreshold, opensWithoutEpic);
  const currentPriceCC = computeDynamicCratePrice(crate.priceCC, dailyOpenCount, CRATE_DYNAMIC_PRICING_POLICY);
  const nextPriceCC = computeDynamicCratePrice(crate.priceCC, dailyOpenCount + 1, CRATE_DYNAMIC_PRICING_POLICY);

  return {
    id: crate.id,
    name: crate.name,
    description: crate.description,
    imagePath: crate.imagePath,
    priceCC: crate.priceCC,
    currentPriceCC,
    nextPriceCC,
    dailyOpenCount,
    visualTier: crate.visualTier,
    available: crate.available,
    minLevel,
    unlocked: crate.available && playerLevel >= minLevel,
    pityThreshold,
    pityToEpic: pityState.pityToEpic,
    rewards: toRewardPreview(crate),
  };
}

export const CratesService = {
  async getCratesCatalog(userId: string): Promise<CrateDTO[]> {
    const now = new Date();
    const dayStart = startOfUtcDay(now);

    const [progression, dailyOpenCount, recentOpenRows] = await Promise.all([
      db.userProgression.findUnique({
        where: { userId },
        select: { currentLevel: true },
      }),
      db.auditLog.count({
        where: {
          userId,
          action: CRATE_OPEN_AUDIT_ACTION,
          createdAt: { gte: dayStart },
        },
      }),
      db.auditLog.findMany({
        where: {
          userId,
          action: CRATE_OPEN_AUDIT_ACTION,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: { payload: true },
      }),
    ]);

    const playerLevel = progression?.currentLevel ?? 1;

    return CRATE_DEFINITIONS.map((crate) => toCrateDTO(
      crate,
      playerLevel,
      dailyOpenCount,
      computeOpensWithoutEpicFromHistory(recentOpenRows, crate.id),
    ));
  },

  async openCrate(userId: string, crateId: string): Promise<CrateOpenResultDTO> {
    const crate = getCrateById(crateId);
    if (!crate || !crate.available) {
      throw new DomainError('NOT_FOUND', 'La caja seleccionada no está disponible.');
    }

    return db.$transaction(async (tx) => {
      const now = new Date();
      const dayStart = startOfUtcDay(now);

      const [progression, latestLedger, dailyOpenCount, recentOpenRows] = await Promise.all([
        tx.userProgression.findUnique({
          where: { userId },
          select: { currentLevel: true },
        }),
        tx.currencyLedger.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        }),
        tx.auditLog.count({
          where: {
            userId,
            action: CRATE_OPEN_AUDIT_ACTION,
            createdAt: { gte: dayStart },
          },
        }),
        tx.auditLog.findMany({
          where: {
            userId,
            action: CRATE_OPEN_AUDIT_ACTION,
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
          select: { payload: true },
        }),
      ]);

      const playerLevel = progression?.currentLevel ?? 1;
      const minLevel = crate.minLevel ?? 1;

      if (playerLevel < minLevel) {
        throw new DomainError(
          'VALIDATION_ERROR',
          `Caja bloqueada. Nivel requerido: ${minLevel}. Nivel actual: ${playerLevel}.`,
        );
      }

      const currentBalance = latestLedger?.balanceAfter ?? 0;
      const currentPriceCC = computeDynamicCratePrice(crate.priceCC, dailyOpenCount, CRATE_DYNAMIC_PRICING_POLICY);
      const nextPriceCC = computeDynamicCratePrice(crate.priceCC, dailyOpenCount + 1, CRATE_DYNAMIC_PRICING_POLICY);
      if (currentBalance < currentPriceCC) {
        throw new DomainError('INSUFFICIENT_FUNDS', 'Créditos insuficientes para abrir esta caja.');
      }

      const pityThreshold = getPityThreshold(crate);
      const opensWithoutEpic = computeOpensWithoutEpicFromHistory(recentOpenRows, crate.id);
      const pityState = computePityState(pityThreshold, opensWithoutEpic);

      const epicOrHigherRewards = crate.rewards.filter((reward) => {
        const rarity = getRarityFromItemDefinitionId(reward.itemDefinitionId);
        return isEpicOrHigherRarity(rarity);
      });

      const rewardPool = pityState.shouldForceEpic && epicOrHigherRewards.length > 0
        ? epicOrHigherRewards
        : crate.rewards;

      const selected = selectWeightedReward(rewardPool);
      const rewardCatalog = ITEM_CATALOG.find((item) => item.id === selected.reward.itemDefinitionId);
      if (!rewardCatalog) {
        throw new DomainError('NOT_FOUND', `Recompensa inválida en la configuración del crate: ${selected.reward.itemDefinitionId}`);
      }

      const rewardRarity = getRarityFromItemDefinitionId(selected.reward.itemDefinitionId);
      const pityTriggered = pityState.shouldForceEpic && epicOrHigherRewards.length > 0;
      const opensWithoutEpicAfter = isEpicOrHigherRarity(rewardRarity) ? 0 : opensWithoutEpic + 1;
      const pityAfter = computePityState(pityThreshold, opensWithoutEpicAfter);

      const definitionIds = await ensureItemDefinitionIds(tx, [selected.reward.itemDefinitionId]);
      const rewardDefinitionId = definitionIds.get(selected.reward.itemDefinitionId);

      if (!rewardDefinitionId) {
        throw new DomainError('NOT_FOUND', `No se pudo resolver la definición de ítem: ${selected.reward.itemDefinitionId}`);
      }

      await tx.currencyLedger.create({
        data: {
          userId,
          amount: -currentPriceCC,
          balanceAfter: currentBalance - currentPriceCC,
          entryType: 'PURCHASE',
          referenceId: `crate_open_${crate.id}`,
        },
      });

      const existing = await tx.inventoryItem.findUnique({
        where: {
          userId_itemDefinitionId: {
            userId,
            itemDefinitionId: rewardDefinitionId,
          },
        },
      });

      if (existing) {
        await tx.inventoryItem.update({
          where: { id: existing.id },
          data: { quantity: { increment: selected.quantity }, acquiredAt: new Date() },
        });
      } else {
        await tx.inventoryItem.create({
          data: {
            userId,
            itemDefinitionId: rewardDefinitionId,
            quantity: selected.quantity,
            acquiredAt: new Date(),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'crate.open',
          payload: {
            crateId: crate.id,
            crateName: crate.name,
            basePriceCC: crate.priceCC,
            spentCC: currentPriceCC,
            nextPriceCC,
            dailyOpenCount: dailyOpenCount + 1,
            pityThreshold,
            pityToEpic: pityAfter.pityToEpic,
            pityTriggered,
            rewardItemDefinitionId: selected.reward.itemDefinitionId,
            rewardRarity,
            rewardQuantity: selected.quantity,
          },
        },
      });

      return {
        crateId: crate.id,
        crateName: crate.name,
        basePriceCC: crate.priceCC,
        spentCC: currentPriceCC,
        nextPriceCC,
        dailyOpenCount: dailyOpenCount + 1,
        newBalance: currentBalance - currentPriceCC,
        pityThreshold,
        pityToEpic: pityAfter.pityToEpic,
        pityTriggered,
        reward: {
          itemDefinitionId: selected.reward.itemDefinitionId,
          displayName: rewardCatalog.displayName,
          rarity: rewardRarity,
          iconKey: rewardCatalog.iconKey,
          quantity: selected.quantity,
        },
        openedAt: now.toISOString(),
      };
    });
  },
};
