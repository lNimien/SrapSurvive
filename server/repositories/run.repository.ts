import 'server-only';
import { db } from '../db/client';

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
      dangerConfig: run.dangerConfig as any,
      equipmentSnapshot: run.equipmentSnapshot as any,
    };
  }
};
