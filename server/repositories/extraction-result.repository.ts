import 'server-only';
import { db } from '../db/client';
import { PaginatedResult, RunHistoryCardDTO, PendingLootDTO } from '../../types/dto.types';

export const ExtractionResultRepository = {
  async getRunHistory(userId: string, page: number = 1, pageSize: number = 20): Promise<PaginatedResult<RunHistoryCardDTO>> {
    const skip = (page - 1) * pageSize;

    const [total, rows] = await Promise.all([
      db.extractionResult.count({ where: { userId } }),
      db.extractionResult.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    const data: RunHistoryCardDTO[] = rows.map((row: any) => {
      // Prisma JSON mapping safely cast
      const lootSnapshot = row.lootSnapshot as unknown as PendingLootDTO[];
      const uniqueLootCount = Array.isArray(lootSnapshot) ? lootSnapshot.length : 0;

      return {
        id: row.id,
        runId: row.runId,
        status: row.status as "EXTRACTED" | "FAILED",
        durationSeconds: row.durationSeconds,
        currencyEarned: row.currencyEarned,
        xpEarned: row.xpEarned,
        catastropheOccurred: row.catastropheOccurred,
        createdAt: row.createdAt.toISOString(),
        uniqueLootCount,
      };
    });

    return {
      data,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },
};
