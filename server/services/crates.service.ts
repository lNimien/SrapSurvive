import 'server-only';

import { db } from '@/server/db/client';
import { CRATE_DEFINITIONS, CrateDefinition, getCrateById, getRarityFromItemDefinitionId } from '@/config/crates.config';
import { ITEM_CATALOG } from '@/config/game.config';
import { CrateDTO, CrateOpenResultDTO, CrateRewardPreviewDTO } from '@/types/dto.types';
import { selectWeightedReward, toProbabilityPercent } from '@/server/domain/crates/crates.logic';
import { DomainError } from '@/server/domain/inventory/inventory.service';

type TxClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

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

function toCrateDTO(crate: CrateDefinition, playerLevel: number): CrateDTO {
  const minLevel = crate.minLevel ?? 1;

  return {
    id: crate.id,
    name: crate.name,
    description: crate.description,
    imagePath: crate.imagePath,
    priceCC: crate.priceCC,
    visualTier: crate.visualTier,
    available: crate.available,
    minLevel,
    unlocked: crate.available && playerLevel >= minLevel,
    rewards: toRewardPreview(crate),
  };
}

export const CratesService = {
  async getCratesCatalog(userId: string): Promise<CrateDTO[]> {
    const progression = await db.userProgression.findUnique({
      where: { userId },
      select: { currentLevel: true },
    });

    const playerLevel = progression?.currentLevel ?? 1;

    return CRATE_DEFINITIONS.map((crate) => toCrateDTO(crate, playerLevel));
  },

  async openCrate(userId: string, crateId: string): Promise<CrateOpenResultDTO> {
    const crate = getCrateById(crateId);
    if (!crate || !crate.available) {
      throw new DomainError('NOT_FOUND', 'La caja seleccionada no está disponible.');
    }

    return db.$transaction(async (tx) => {
      const [progression, latestLedger] = await Promise.all([
        tx.userProgression.findUnique({
          where: { userId },
          select: { currentLevel: true },
        }),
        tx.currencyLedger.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
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
      if (currentBalance < crate.priceCC) {
        throw new DomainError('INSUFFICIENT_FUNDS', 'Créditos insuficientes para abrir esta caja.');
      }

      const selected = selectWeightedReward(crate.rewards);
      const rewardCatalog = ITEM_CATALOG.find((item) => item.id === selected.reward.itemDefinitionId);
      if (!rewardCatalog) {
        throw new DomainError('NOT_FOUND', `Recompensa inválida en la configuración del crate: ${selected.reward.itemDefinitionId}`);
      }

      const definitionIds = await ensureItemDefinitionIds(tx, [selected.reward.itemDefinitionId]);
      const rewardDefinitionId = definitionIds.get(selected.reward.itemDefinitionId);

      if (!rewardDefinitionId) {
        throw new DomainError('NOT_FOUND', `No se pudo resolver la definición de ítem: ${selected.reward.itemDefinitionId}`);
      }

      await tx.currencyLedger.create({
        data: {
          userId,
          amount: -crate.priceCC,
          balanceAfter: currentBalance - crate.priceCC,
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
            spentCC: crate.priceCC,
            rewardItemDefinitionId: selected.reward.itemDefinitionId,
            rewardQuantity: selected.quantity,
          },
        },
      });

      return {
        crateId: crate.id,
        crateName: crate.name,
        spentCC: crate.priceCC,
        newBalance: currentBalance - crate.priceCC,
        reward: {
          itemDefinitionId: selected.reward.itemDefinitionId,
          displayName: rewardCatalog.displayName,
          rarity: getRarityFromItemDefinitionId(selected.reward.itemDefinitionId),
          iconKey: rewardCatalog.iconKey,
          quantity: selected.quantity,
        },
        openedAt: new Date().toISOString(),
      };
    });
  },
};

