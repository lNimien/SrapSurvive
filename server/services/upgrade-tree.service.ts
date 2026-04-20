import 'server-only';

import { db } from '@/server/db/client';
import {
  UPGRADE_BRANCH_META,
  UPGRADE_NODE_BY_ID,
  UPGRADE_TREE_BRANCHES,
  UPGRADE_TREE_DEFINITIONS,
} from '@/config/upgrades-tree.config';
import {
  applyUpgradeProfileToDangerConfig,
  buildUpgradeRuntimeProfile,
  computeResearchProgressPercent,
  computeResearchRefund,
  getNodeLevelDefinition,
  UpgradeRuntimeProfile,
} from '@/server/domain/progression/upgrade-tree.logic';
import {
  CancelUpgradeResearchResultDTO,
  StartUpgradeResearchResultDTO,
  UpgradeBranchDTO,
  UpgradeBranchSummaryDTO,
  UpgradeNodeDTO,
  UpgradeNodeEffectPreviewDTO,
  UpgradeNodeStateDTO,
  UpgradeResearchActiveDTO,
  UpgradeTreeDTO,
} from '@/types/dto.types';
import { DomainError } from '@/server/domain/inventory/inventory.service';
import { DangerConfig } from '@/server/domain/run/run.calculator';

const UPGRADE_REFERENCE_PREFIX = 'upgrade-tree:';

function toLevelsMap(rows: ReadonlyArray<{ nodeId: string; level: number }>): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.nodeId] = row.level;
    return acc;
  }, {});
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes === 0 ? `${hours}h` : `${hours}h ${remMinutes}m`;
}

function getEffectPreview(nodeId: string, level: number): UpgradeNodeEffectPreviewDTO[] {
  const node = UPGRADE_NODE_BY_ID[nodeId];
  const levelDef = node ? getNodeLevelDefinition(node, level) : null;
  if (!node || !levelDef) {
    return [];
  }

  const effects = levelDef.effects;
  const previews: UpgradeNodeEffectPreviewDTO[] = [];

  if (effects.baseRateMultiplier !== undefined) {
    previews.push({ label: 'Amenaza base', value: `x${effects.baseRateMultiplier.toFixed(2)}` });
  }

  if (effects.quadraticFactorMultiplier !== undefined) {
    previews.push({ label: 'Escalada cuadrática', value: `x${effects.quadraticFactorMultiplier.toFixed(2)}` });
  }

  if (effects.catastropheThresholdBonus !== undefined) {
    previews.push({ label: 'Umbral catástrofe', value: `+${(effects.catastropheThresholdBonus * 100).toFixed(1)}%` });
  }

  if (effects.dangerLootBonusMultiplier !== undefined) {
    previews.push({ label: 'Bonus botín por peligro', value: `x${effects.dangerLootBonusMultiplier.toFixed(2)}` });
  }

  if (effects.extractionRewardMultiplier !== undefined) {
    previews.push({ label: 'Créditos por extracción', value: `x${effects.extractionRewardMultiplier.toFixed(2)}` });
  }

  if (effects.extractionXpMultiplier !== undefined) {
    previews.push({ label: 'XP por extracción', value: `x${effects.extractionXpMultiplier.toFixed(2)}` });
  }

  if (effects.craftingCostMultiplier !== undefined) {
    previews.push({ label: 'Coste de crafting', value: `x${effects.craftingCostMultiplier.toFixed(2)}` });
  }

  if (effects.workshopTierBoost !== undefined) {
    previews.push({ label: 'Autorización de tier', value: `+${effects.workshopTierBoost}` });
  }

  if (effects.marketBuyPriceMultiplier !== undefined) {
    previews.push({ label: 'Precio de compra', value: `x${effects.marketBuyPriceMultiplier.toFixed(2)}` });
  }

  if (effects.marketSellPriceMultiplier !== undefined) {
    previews.push({ label: 'Precio de venta', value: `x${effects.marketSellPriceMultiplier.toFixed(2)}` });
  }

  if (effects.blackMarketAccessTier !== undefined) {
    previews.push({ label: 'Acceso clandestino', value: `Tier ${effects.blackMarketAccessTier}` });
  }

  return previews;
}

function resolveNodeState(params: {
  currentLevel: number;
  maxLevel: number;
  requirementsMet: boolean;
  activeResearchNodeId: string | null;
  nodeId: string;
}): UpgradeNodeStateDTO {
  if (params.currentLevel >= params.maxLevel) {
    return 'maxed';
  }

  if (params.activeResearchNodeId === params.nodeId) {
    return 'in_progress';
  }

  if (!params.requirementsMet) {
    return 'locked';
  }

  return params.currentLevel > 0 ? 'unlocked' : 'available';
}

function getCompletedLevelCount(levelsByNodeId: Readonly<Record<string, number>>): number {
  return Object.values(levelsByNodeId).reduce((sum, level) => sum + Math.max(0, level), 0);
}

function getTotalLevelCount(): number {
  return UPGRADE_TREE_DEFINITIONS.reduce((sum, node) => sum + node.levels.length, 0);
}

async function ensureResearchCompletions(userId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const now = new Date();
    const completedRows = await tx.upgradeResearchQueue.findMany({
      where: {
        userId,
        status: 'IN_PROGRESS',
        completesAt: {
          lte: now,
        },
      },
      orderBy: {
        completesAt: 'asc',
      },
    });

    for (const row of completedRows) {
      await tx.upgradeNodeProgress.upsert({
        where: {
          userId_nodeId: {
            userId,
            nodeId: row.nodeId,
          },
        },
        update: {
          level: {
            increment: 1,
          },
        },
        create: {
          userId,
          nodeId: row.nodeId,
          level: 1,
        },
      });

      await tx.upgradeResearchQueue.update({
        where: { id: row.id },
        data: {
          status: 'COMPLETED',
          completedAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'upgrade.research_completed',
          payload: {
            queueId: row.id,
            nodeId: row.nodeId,
            targetLevel: row.targetLevel,
            completedAt: now.toISOString(),
          },
        },
      });
    }
  });
}

async function getCurrentBalance(userId: string): Promise<number> {
  const latest = await db.currencyLedger.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { balanceAfter: true },
  });

  return latest?.balanceAfter ?? 0;
}

function getBranchSummaries(levelsByNodeId: Readonly<Record<string, number>>): UpgradeBranchSummaryDTO[] {
  return UPGRADE_TREE_BRANCHES.map((branch) => {
    const nodes = UPGRADE_TREE_DEFINITIONS.filter((node) => node.branch === branch);
    const totalLevels = nodes.reduce((sum, node) => sum + node.levels.length, 0);
    const unlockedLevels = nodes.reduce((sum, node) => sum + (levelsByNodeId[node.id] ?? 0), 0);

    return {
      branch: branch as UpgradeBranchDTO,
      label: UPGRADE_BRANCH_META[branch].label,
      description: UPGRADE_BRANCH_META[branch].description,
      unlockedLevels,
      totalLevels,
      completionRatio: totalLevels === 0 ? 0 : unlockedLevels / totalLevels,
    };
  });
}

function buildActiveResearchDTO(input: {
  id: string;
  nodeId: string;
  targetLevel: number;
  startedAt: Date;
  completesAt: Date;
  costCC: number;
}): UpgradeResearchActiveDTO {
  const now = new Date();
  const node = UPGRADE_NODE_BY_ID[input.nodeId];
  const progressPercent = computeResearchProgressPercent(input.startedAt, input.completesAt, now);

  return {
    queueId: input.id,
    nodeId: input.nodeId,
    nodeName: node?.displayName ?? input.nodeId,
    branch: (node?.branch ?? 'BRIDGE') as UpgradeBranchDTO,
    targetLevel: input.targetLevel,
    startedAt: input.startedAt.toISOString(),
    completesAt: input.completesAt.toISOString(),
    progressPercent,
    remainingSeconds: Math.max(0, Math.floor((input.completesAt.getTime() - now.getTime()) / 1000)),
    costCC: input.costCC,
    refundableCC: computeResearchRefund(input.costCC),
  };
}

function buildNodeDTOs(params: {
  levelsByNodeId: Readonly<Record<string, number>>;
  activeResearchNodeId: string | null;
  currentBalance: number;
}): UpgradeNodeDTO[] {
  return UPGRADE_TREE_DEFINITIONS.map((node) => {
    const currentLevel = params.levelsByNodeId[node.id] ?? 0;
    const maxLevel = node.levels.length;
    const nextLevel = currentLevel + 1;
    const nextLevelDef = getNodeLevelDefinition(node, nextLevel);
    const requirementsMet = node.parents.every((parentId) => {
      if (!UPGRADE_NODE_BY_ID[parentId]) {
        return false;
      }

      return (params.levelsByNodeId[parentId] ?? 0) >= 1;
    });

    const affordable = nextLevelDef ? params.currentBalance >= nextLevelDef.costCC : false;
    const state = resolveNodeState({
      nodeId: node.id,
      currentLevel,
      maxLevel,
      requirementsMet,
      activeResearchNodeId: params.activeResearchNodeId,
    });

    return {
      id: node.id,
      branch: node.branch as UpgradeBranchDTO,
      tier: node.tier,
      lane: node.lane,
      parents: [...node.parents],
      displayName: node.displayName,
      description: node.description,
      icon: node.icon,
      rarity: node.rarity,
      category: node.category,
      currentLevel,
      maxLevel,
      nextLevel: nextLevelDef ? nextLevel : null,
      nextCostCC: nextLevelDef?.costCC ?? null,
      nextUnlockDurationSec: nextLevelDef?.unlockDurationSec ?? null,
      state,
      affordable,
      requirementsMet,
      effectsPreview: nextLevelDef ? getEffectPreview(node.id, nextLevel) : [],
    };
  });
}

export const UpgradeTreeService = {
  async getUpgradeTreeForPlayer(userId: string): Promise<UpgradeTreeDTO> {
    await ensureResearchCompletions(userId);

    const [progressRows, activeResearch, currentBalance] = await Promise.all([
      db.upgradeNodeProgress.findMany({
        where: { userId },
        select: { nodeId: true, level: true },
      }),
      db.upgradeResearchQueue.findFirst({
        where: {
          userId,
          status: 'IN_PROGRESS',
        },
        orderBy: {
          startedAt: 'asc',
        },
        select: {
          id: true,
          nodeId: true,
          targetLevel: true,
          startedAt: true,
          completesAt: true,
          costCC: true,
        },
      }),
      getCurrentBalance(userId),
    ]);

    const levelsByNodeId = toLevelsMap(progressRows);
    const nodes = buildNodeDTOs({
      levelsByNodeId,
      currentBalance,
      activeResearchNodeId: activeResearch?.nodeId ?? null,
    });

    const availableCount = nodes.filter((node) => node.state === 'available' && node.affordable).length;

    return {
      currencyBalance: currentBalance,
      nodes,
      branches: getBranchSummaries(levelsByNodeId),
      activeResearch: activeResearch ? buildActiveResearchDTO(activeResearch) : null,
      availableCount,
      completedLevelCount: getCompletedLevelCount(levelsByNodeId),
      totalLevelCount: getTotalLevelCount(),
    };
  },

  async startResearch(userId: string, nodeId: string): Promise<StartUpgradeResearchResultDTO> {
    await ensureResearchCompletions(userId);

    const node = UPGRADE_NODE_BY_ID[nodeId];
    if (!node) {
      throw new DomainError('VALIDATION_ERROR', 'Nodo de mejora inválido.');
    }

    return db.$transaction(async (tx) => {
      const activeResearch = await tx.upgradeResearchQueue.findFirst({
        where: { userId, status: 'IN_PROGRESS' },
        select: { id: true },
      });

      if (activeResearch) {
        throw new DomainError('VALIDATION_ERROR', 'Ya tienes una investigación en progreso.');
      }

      const progressRows = await tx.upgradeNodeProgress.findMany({
        where: { userId },
        select: { nodeId: true, level: true },
      });
      const levelsByNodeId = toLevelsMap(progressRows);
      const currentLevel = levelsByNodeId[nodeId] ?? 0;
      const nextLevel = currentLevel + 1;

      if (currentLevel >= node.levels.length) {
        throw new DomainError('VALIDATION_ERROR', 'Esta mejora ya está al máximo.');
      }

      const requirementsMet = node.parents.every((parentId) => {
        if (!UPGRADE_NODE_BY_ID[parentId]) {
          return false;
        }

        return (levelsByNodeId[parentId] ?? 0) >= 1;
      });

      if (!requirementsMet) {
        throw new DomainError('VALIDATION_ERROR', 'Debes completar los prerrequisitos para investigar este nodo.');
      }

      const levelDef = getNodeLevelDefinition(node, nextLevel);
      if (!levelDef) {
        throw new DomainError('VALIDATION_ERROR', 'No se encontró configuración para el siguiente nivel.');
      }

      const latestLedger = await tx.currencyLedger.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { balanceAfter: true },
      });
      const currentBalance = latestLedger?.balanceAfter ?? 0;

      if (currentBalance < levelDef.costCC) {
        throw new DomainError('INSUFFICIENT_BALANCE', 'No tienes créditos suficientes para iniciar esta investigación.');
      }

      const newBalance = currentBalance - levelDef.costCC;
      const startedAt = new Date();
      const completesAt = new Date(startedAt.getTime() + levelDef.unlockDurationSec * 1000);
      const referenceId = `${UPGRADE_REFERENCE_PREFIX}${node.id}:lv${nextLevel}:start`;

      await tx.currencyLedger.create({
        data: {
          userId,
          amount: -levelDef.costCC,
          balanceAfter: newBalance,
          entryType: 'PURCHASE',
          referenceId,
        },
      });

      const queue = await tx.upgradeResearchQueue.create({
        data: {
          userId,
          nodeId,
          targetLevel: nextLevel,
          costCC: levelDef.costCC,
          startedAt,
          completesAt,
          status: 'IN_PROGRESS',
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'upgrade.research_started',
          payload: {
            queueId: queue.id,
            nodeId,
            targetLevel: nextLevel,
            costCC: levelDef.costCC,
            duration: formatDuration(levelDef.unlockDurationSec),
            completesAt: completesAt.toISOString(),
          },
        },
      });

      return {
        queueId: queue.id,
        nodeId,
        targetLevel: nextLevel,
        completesAt: completesAt.toISOString(),
        newBalance,
      };
    });
  },

  async cancelActiveResearch(userId: string): Promise<CancelUpgradeResearchResultDTO> {
    await ensureResearchCompletions(userId);

    return db.$transaction(async (tx) => {
      const activeResearch = await tx.upgradeResearchQueue.findFirst({
        where: {
          userId,
          status: 'IN_PROGRESS',
        },
      });

      if (!activeResearch) {
        throw new DomainError('NOT_FOUND', 'No hay investigación activa para cancelar.');
      }

      const latestLedger = await tx.currencyLedger.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { balanceAfter: true },
      });
      const currentBalance = latestLedger?.balanceAfter ?? 0;
      const refund = computeResearchRefund(activeResearch.costCC);
      const newBalance = currentBalance + refund;
      const cancelledAt = new Date();

      await tx.upgradeResearchQueue.update({
        where: { id: activeResearch.id },
        data: {
          status: 'CANCELLED',
          cancelledAt,
          cancelledBy: 'player',
          refundCC: refund,
        },
      });

      await tx.currencyLedger.create({
        data: {
          userId,
          amount: refund,
          balanceAfter: newBalance,
          entryType: 'SALE',
          referenceId: `${UPGRADE_REFERENCE_PREFIX}${activeResearch.nodeId}:lv${activeResearch.targetLevel}:cancel`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'upgrade.research_cancelled',
          payload: {
            queueId: activeResearch.id,
            nodeId: activeResearch.nodeId,
            targetLevel: activeResearch.targetLevel,
            refundCC: refund,
          },
        },
      });

      return {
        queueId: activeResearch.id,
        nodeId: activeResearch.nodeId,
        refundedCC: refund,
        newBalance,
      };
    });
  },

  async getRuntimeProfile(userId: string): Promise<UpgradeRuntimeProfile> {
    await ensureResearchCompletions(userId);

    const progressRows = await db.upgradeNodeProgress.findMany({
      where: { userId },
      select: {
        nodeId: true,
        level: true,
      },
    });

    return buildUpgradeRuntimeProfile(UPGRADE_TREE_DEFINITIONS, toLevelsMap(progressRows));
  },

  async applyUpgradeProfileToDangerConfig(userId: string, baseConfig: DangerConfig): Promise<DangerConfig> {
    const profile = await this.getRuntimeProfile(userId);
    return applyUpgradeProfileToDangerConfig(baseConfig, profile);
  },
};

