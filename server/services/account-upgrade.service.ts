import 'server-only';

import { db } from '@/server/db/client';
import { EconomyRepository } from '@/server/repositories/economy.repository';
import { UPGRADE_DEFINITION_BY_ID, UPGRADE_DEFINITIONS } from '@/config/upgrades.config';
import {
  aggregateUpgradeEffects,
  applyAggregatedEffectsToDangerConfig,
  evaluateUpgradePurchaseGuard,
} from '@/server/domain/progression/account-upgrade.logic';
import { DomainError } from '@/server/domain/inventory/inventory.service';
import { DangerConfig } from '@/server/domain/run/run.calculator';
import { AccountUpgradeDTO, UpgradePurchaseResultDTO } from '@/types/dto.types';

const UPGRADE_REFERENCE_PREFIX = 'upgrade:';
const UPGRADE_REFERENCE_SUFFIX = ':purchase';

function getUpgradeReferenceId(upgradeId: string): string {
  return `${UPGRADE_REFERENCE_PREFIX}${upgradeId}${UPGRADE_REFERENCE_SUFFIX}`;
}

function parseUpgradeIdFromReference(referenceId: string): string | null {
  if (!referenceId.startsWith(UPGRADE_REFERENCE_PREFIX) || !referenceId.endsWith(UPGRADE_REFERENCE_SUFFIX)) {
    return null;
  }

  return referenceId.slice(UPGRADE_REFERENCE_PREFIX.length, referenceId.length - UPGRADE_REFERENCE_SUFFIX.length);
}

export const AccountUpgradeService = {
  async getPurchasedUpgradeIds(userId: string): Promise<Set<string>> {
    const purchaseEntries = await db.currencyLedger.findMany({
      where: {
        userId,
        entryType: 'PURCHASE',
        referenceId: { startsWith: UPGRADE_REFERENCE_PREFIX },
      },
      select: { referenceId: true },
    });

    const ids = purchaseEntries
      .map((entry) => (entry.referenceId ? parseUpgradeIdFromReference(entry.referenceId) : null))
      .filter((value): value is string => value !== null);

    return new Set(ids);
  },

  async getUpgradesForPlayer(userId: string): Promise<AccountUpgradeDTO[]> {
    const [currentBalance, purchasedSet] = await Promise.all([
      EconomyRepository.getCurrentBalance(userId),
      this.getPurchasedUpgradeIds(userId),
    ]);

    return UPGRADE_DEFINITIONS.map((definition) => {
      const purchased = purchasedSet.has(definition.id);
      const guard = evaluateUpgradePurchaseGuard({
        alreadyPurchased: purchased,
        currentBalance,
        costCC: definition.costCC,
      });

      return {
        id: definition.id,
        displayName: definition.displayName,
        description: definition.description,
        costCC: definition.costCC,
        effects: definition.effects,
        purchased,
        affordable: guard.canPurchase,
      };
    });
  },

  async applyUpgradesToDangerConfig(userId: string, baseConfig: DangerConfig): Promise<DangerConfig> {
    const purchasedSet = await this.getPurchasedUpgradeIds(userId);
    const appliedDefinitions = UPGRADE_DEFINITIONS.filter((definition) => purchasedSet.has(definition.id));
    const aggregatedEffects = aggregateUpgradeEffects(appliedDefinitions);

    return applyAggregatedEffectsToDangerConfig(baseConfig, aggregatedEffects);
  },

  async purchaseUpgrade(userId: string, upgradeId: string): Promise<UpgradePurchaseResultDTO> {
    const definition = UPGRADE_DEFINITION_BY_ID[upgradeId];

    if (!definition) {
      throw new DomainError('VALIDATION_ERROR', 'Mejora inválida.');
    }

    return db.$transaction(async (tx) => {
      const referenceId = getUpgradeReferenceId(definition.id);

      const [latestLedgerEntry, existingPurchase] = await Promise.all([
        tx.currencyLedger.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { balanceAfter: true },
        }),
        tx.currencyLedger.findFirst({
          where: {
            userId,
            referenceId,
          },
          select: { id: true },
        }),
      ]);

      const guard = evaluateUpgradePurchaseGuard({
        alreadyPurchased: Boolean(existingPurchase),
        currentBalance: latestLedgerEntry?.balanceAfter ?? 0,
        costCC: definition.costCC,
      });

      if (!guard.canPurchase) {
        if (guard.reason === 'ALREADY_PURCHASED') {
          throw new DomainError('VALIDATION_ERROR', 'La mejora ya fue comprada.');
        }

        throw new DomainError('INSUFFICIENT_BALANCE', 'No tienes suficientes créditos para esta mejora.');
      }

      const newBalance = (latestLedgerEntry?.balanceAfter ?? 0) - definition.costCC;

      await tx.currencyLedger.create({
        data: {
          userId,
          amount: -definition.costCC,
          balanceAfter: newBalance,
          entryType: 'PURCHASE',
          referenceId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'upgrade.purchase',
          payload: {
            upgradeId: definition.id,
            costCC: definition.costCC,
            referenceId,
          },
        },
      });

      return {
        upgradeId: definition.id,
        newBalance,
      };
    });
  },
};
