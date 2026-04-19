import 'server-only';

import { db } from '@/server/db/client';

export interface LedgerEntryAggregateRow {
  entryType: string;
  transactionCount: number;
  amountSum: number;
}

export interface ExtractionStatusAggregateRow {
  status: string;
  count: number;
}

export interface AuditLogWindowRow {
  createdAt: Date;
  payload: unknown;
}

export const EconomyObservabilityRepository = {
  async getLedgerEntryAggregates(since: Date): Promise<LedgerEntryAggregateRow[]> {
    const groupedRows = await db.currencyLedger.groupBy({
      by: ['entryType'],
      where: {
        createdAt: {
          gte: since,
        },
      },
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
      },
    });

    return groupedRows.map((row) => ({
      entryType: row.entryType,
      transactionCount: row._count._all,
      amountSum: row._sum.amount ?? 0,
    }));
  },

  async getExtractionStatusAggregates(since: Date): Promise<ExtractionStatusAggregateRow[]> {
    const groupedRows = await db.extractionResult.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: since,
        },
      },
      _count: {
        _all: true,
      },
    });

    return groupedRows.map((row) => ({
      status: row.status,
      count: row._count._all,
    }));
  },

  async getLedgerActiveUsers(since: Date): Promise<string[]> {
    const users = await db.currencyLedger.findMany({
      where: {
        createdAt: {
          gte: since,
        },
      },
      distinct: ['userId'],
      select: {
        userId: true,
      },
    });

    return users.map((user) => user.userId);
  },

  async getExtractionActiveUsers(since: Date): Promise<string[]> {
    const users = await db.extractionResult.findMany({
      where: {
        createdAt: {
          gte: since,
        },
      },
      distinct: ['userId'],
      select: {
        userId: true,
      },
    });

    return users.map((user) => user.userId);
  },

  async getAuditLogsByActionSince(action: string, since: Date): Promise<AuditLogWindowRow[]> {
    return db.auditLog.findMany({
      where: {
        action,
        createdAt: {
          gte: since,
        },
      },
      select: {
        createdAt: true,
        payload: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  },
};
