import 'server-only';
import { db } from '../db/client';

export const EconomyRepository = {
  async getCurrentBalance(userId: string): Promise<number> {
    const latestEntry = await db.currencyLedger.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });

    return latestEntry?.balanceAfter ?? 0;
  }
};
