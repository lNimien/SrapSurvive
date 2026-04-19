import 'server-only';
import { db } from '../db/client';

export interface ExtractionHistoryDomain {
  runId: string;
  zoneId: string;
  status: 'EXTRACTED' | 'FAILED';
  catastropheOccurred: boolean;
  currencyEarned: number;
  xpEarned: number;
  resolvedAt: Date;
  lootSnapshot: unknown;
}

export interface RunStartAuditDomain {
  runId: string;
  runMode: 'SAFE' | 'HARD';
}

export const RunRepository = {
  async findActiveRun(userId: string) {
    const run = await db.activeRun.findUnique({
      where: { userId },
    });
    
    if (!run) return null;

    return {
      id: run.id,
      runId: run.id,
      status: run.status as "RUNNING",
      startedAt: run.startedAt,
      zoneId: run.zoneId,
      dangerConfig: run.dangerConfig as unknown,
      equipmentSnapshot: run.equipmentSnapshot as unknown,
      anomalyState: run.anomalyState as unknown,
      bonusLoot: run.bonusLoot as unknown,
    };
  },

  async listExtractionHistory(userId: string): Promise<ExtractionHistoryDomain[]> {
    const rows = await db.extractionResult.findMany({
      where: { userId },
      select: {
        runId: true,
        zoneId: true,
        status: true,
        catastropheOccurred: true,
        currencyEarned: true,
        xpEarned: true,
        resolvedAt: true,
        lootSnapshot: true,
      },
      orderBy: { resolvedAt: 'desc' },
    });

    return rows.map((row) => ({
      runId: row.runId,
      zoneId: row.zoneId,
      status: row.status as ExtractionHistoryDomain['status'],
      catastropheOccurred: row.catastropheOccurred,
      currencyEarned: row.currencyEarned,
      xpEarned: row.xpEarned,
      resolvedAt: row.resolvedAt,
      lootSnapshot: row.lootSnapshot,
    }));
  },

  async listExtractionHistoryWithinWindow(
    userId: string,
    startedAt: Date,
    endedAt: Date,
  ): Promise<ExtractionHistoryDomain[]> {
    const rows = await db.extractionResult.findMany({
      where: {
        userId,
        resolvedAt: {
          gte: startedAt,
          lt: endedAt,
        },
      },
      select: {
        runId: true,
        zoneId: true,
        status: true,
        catastropheOccurred: true,
        currencyEarned: true,
        xpEarned: true,
        resolvedAt: true,
        lootSnapshot: true,
      },
      orderBy: { resolvedAt: 'desc' },
    });

    return rows.map((row) => ({
      runId: row.runId,
      zoneId: row.zoneId,
      status: row.status as ExtractionHistoryDomain['status'],
      catastropheOccurred: row.catastropheOccurred,
      currencyEarned: row.currencyEarned,
      xpEarned: row.xpEarned,
      resolvedAt: row.resolvedAt,
      lootSnapshot: row.lootSnapshot,
    }));
  },

  async listRunStartAudits(userId: string): Promise<RunStartAuditDomain[]> {
    const rows = await db.auditLog.findMany({
      where: {
        userId,
        action: 'run.start',
      },
      select: {
        payload: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped: RunStartAuditDomain[] = [];
    for (const row of rows) {
      const payload = row.payload as Record<string, unknown>;
      const runId = typeof payload.runId === 'string' ? payload.runId : null;
      const runMode = payload.runMode === 'HARD' ? 'HARD' : payload.runMode === 'SAFE' ? 'SAFE' : null;
      if (runId && runMode) {
        mapped.push({ runId, runMode });
      }
    }

    return mapped;
  },
};
