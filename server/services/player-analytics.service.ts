import 'server-only';

import { PlayerAnalyticsDTO } from '@/types/dto.types';
import { ExtractionHistoryDomain, RunRepository, RunStartAuditDomain } from '@/server/repositories/run.repository';

export interface AnalyticsAggregate {
  totalExtractions: number;
  successRate: number;
  averageCcPerExtraction: number;
  averageXpPerExtraction: number;
  runMix: {
    safe: number;
    hard: number;
  };
  bestZoneByEarnings: {
    zoneId: string;
    totalCredits: number;
  } | null;
}

function resolveRunMix(
  extractionHistory: ExtractionHistoryDomain[],
  runStartAudits: RunStartAuditDomain[],
): { safe: number; hard: number } {
  const byRunId = new Map<string, 'SAFE' | 'HARD'>();
  for (const audit of runStartAudits) {
    byRunId.set(audit.runId, audit.runMode);
  }

  let safe = 0;
  let hard = 0;

  for (const extraction of extractionHistory) {
    const mode = byRunId.get(extraction.runId);
    if (mode === 'HARD') {
      hard += 1;
    } else {
      safe += 1;
    }
  }

  return { safe, hard };
}

export function aggregatePlayerAnalytics(
  extractionHistory: ExtractionHistoryDomain[],
  runStartAudits: RunStartAuditDomain[],
): AnalyticsAggregate {
  const totalExtractions = extractionHistory.length;

  if (totalExtractions === 0) {
    return {
      totalExtractions: 0,
      successRate: 0,
      averageCcPerExtraction: 0,
      averageXpPerExtraction: 0,
      runMix: { safe: 0, hard: 0 },
      bestZoneByEarnings: null,
    };
  }

  let successCount = 0;
  let totalCc = 0;
  let totalXp = 0;
  const creditsByZone: Record<string, number> = {};

  for (const extraction of extractionHistory) {
    if (extraction.status === 'EXTRACTED') {
      successCount += 1;
    }

    totalCc += extraction.currencyEarned;
    totalXp += extraction.xpEarned;
    creditsByZone[extraction.zoneId] = (creditsByZone[extraction.zoneId] ?? 0) + extraction.currencyEarned;
  }

  let bestZoneByEarnings: { zoneId: string; totalCredits: number } | null = null;

  for (const [zoneId, totalCredits] of Object.entries(creditsByZone)) {
    if (!bestZoneByEarnings || totalCredits > bestZoneByEarnings.totalCredits) {
      bestZoneByEarnings = { zoneId, totalCredits };
    }
  }

  return {
    totalExtractions,
    successRate: Number((successCount / totalExtractions).toFixed(4)),
    averageCcPerExtraction: Math.floor(totalCc / totalExtractions),
    averageXpPerExtraction: Math.floor(totalXp / totalExtractions),
    runMix: resolveRunMix(extractionHistory, runStartAudits),
    bestZoneByEarnings,
  };
}

export const PlayerAnalyticsService = {
  async getPlayerAnalytics(userId: string): Promise<PlayerAnalyticsDTO> {
    const [extractions, runStartAudits] = await Promise.all([
      RunRepository.listExtractionHistory(userId),
      RunRepository.listRunStartAudits(userId),
    ]);

    return aggregatePlayerAnalytics(extractions, runStartAudits);
  },
};
