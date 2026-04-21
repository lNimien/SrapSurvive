import 'server-only';

import { Prisma } from '@prisma/client';
import { featureFlags } from '@/config/feature-flags.config';
import { db } from '@/server/db/client';
import { MutatorAdjustmentProfileDTO } from '@/types/dto.types';

const MUTATOR_APPLIED_ADJUSTMENT_AUDIT_ACTION = 'ops.mutator_balance_adjustment';
const DEFAULT_PROFILE_DELTA_CAP_PERCENT = 10;
const MUTATOR_POLICY_UPDATED_AUDIT_ACTION = 'ops.mutator_tuning_policy_updated';

function clampDelta(delta: number, maxAbs: number): number {
  const safeMax = Math.max(0, Math.floor(maxAbs));
  return Math.max(-safeMax, Math.min(safeMax, delta));
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

export interface MutatorAdjustmentCaps {
  maxAbsRewardDeltaPercent: number;
  maxAbsDangerDeltaPercent: number;
}

export const DEFAULT_MUTATOR_ADJUSTMENT_CAPS: MutatorAdjustmentCaps = {
  maxAbsRewardDeltaPercent: DEFAULT_PROFILE_DELTA_CAP_PERCENT,
  maxAbsDangerDeltaPercent: DEFAULT_PROFILE_DELTA_CAP_PERCENT,
};

export function sanitizeMutatorAdjustmentProfile(
  profile: MutatorAdjustmentProfileDTO,
  caps: MutatorAdjustmentCaps = DEFAULT_MUTATOR_ADJUSTMENT_CAPS,
): MutatorAdjustmentProfileDTO {
  return {
    rewardDeltaPercent: clampDelta(profile.rewardDeltaPercent, caps.maxAbsRewardDeltaPercent),
    dangerPressureDeltaPercent: clampDelta(profile.dangerPressureDeltaPercent, caps.maxAbsDangerDeltaPercent),
  };
}

export const NEUTRAL_MUTATOR_PROFILE: MutatorAdjustmentProfileDTO = {
  rewardDeltaPercent: 0,
  dangerPressureDeltaPercent: 0,
};

export interface ApplyMutatorAdjustmentInput {
  mutatorId: string;
  runMode: 'SAFE' | 'HARD';
  actionType: 'buff_difficulty' | 'nerf_rewards' | 'hold';
  suggestedDeltaPercent: number;
  beforeProfile: MutatorAdjustmentProfileDTO;
  afterProfile: MutatorAdjustmentProfileDTO;
  appliedByUserId: string;
  sourceGeneratedAt?: string;
}

export interface MutatorAdjustmentHistoryEntry {
  createdAt: string;
  appliedByUserId: string;
  mutatorId: string;
  runMode: 'SAFE' | 'HARD';
  actionType: 'buff_difficulty' | 'nerf_rewards' | 'hold';
  suggestedDeltaPercent: number;
  beforeProfile: MutatorAdjustmentProfileDTO;
  afterProfile: MutatorAdjustmentProfileDTO;
}

export type MutatorTuningStorageSource = 'table_primary' | 'audit_fallback';

interface MutatorOverrideTableAccessor {
  findUnique: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
}

interface MutatorHistoryTableAccessor {
  create: (args: unknown) => Promise<unknown>;
  findMany: (args: unknown) => Promise<unknown>;
}

interface MutatorPolicyTableAccessor {
  findUnique: (args: unknown) => Promise<unknown>;
  upsert: (args: unknown) => Promise<unknown>;
}

function getMutatorOverrideAccessor(source: unknown): MutatorOverrideTableAccessor | null {
  if (!isObjectRecord(source)) {
    return null;
  }

  const accessor = source.mutatorTuningOverride;
  if (!isObjectRecord(accessor)) {
    return null;
  }

  if (typeof accessor.findUnique !== 'function' || typeof accessor.create !== 'function' || typeof accessor.update !== 'function') {
    return null;
  }

  return accessor as unknown as MutatorOverrideTableAccessor;
}

function getMutatorHistoryAccessor(source: unknown): MutatorHistoryTableAccessor | null {
  if (!isObjectRecord(source)) {
    return null;
  }

  const accessor = source.mutatorTuningHistory;
  if (!isObjectRecord(accessor)) {
    return null;
  }

  if (typeof accessor.findMany !== 'function' || typeof accessor.create !== 'function') {
    return null;
  }

  return accessor as unknown as MutatorHistoryTableAccessor;
}

function getMutatorPolicyAccessor(source: unknown): MutatorPolicyTableAccessor | null {
  if (!isObjectRecord(source)) {
    return null;
  }

  const accessor = source.mutatorTuningPolicy;
  if (!isObjectRecord(accessor)) {
    return null;
  }

  if (typeof accessor.findUnique !== 'function' || typeof accessor.upsert !== 'function') {
    return null;
  }

  return accessor as unknown as MutatorPolicyTableAccessor;
}

function toRunMode(value: unknown): 'SAFE' | 'HARD' | null {
  return value === 'HARD' ? 'HARD' : value === 'SAFE' ? 'SAFE' : null;
}

function toActionType(value: unknown): 'buff_difficulty' | 'nerf_rewards' | 'hold' | null {
  if (value === 'buff_difficulty' || value === 'nerf_rewards' || value === 'hold') {
    return value;
  }

  return null;
}

export function resolveMutatorTuningReadSource(
  useDbPrimary: boolean,
  hasTableAccessors: boolean,
): MutatorTuningStorageSource {
  if (useDbPrimary && hasTableAccessors) {
    return 'table_primary';
  }

  return 'audit_fallback';
}

export const MutatorTuningService = {
  getReadSource(): MutatorTuningStorageSource {
    return resolveMutatorTuningReadSource(
      featureFlags.mutatorTuningDbPrimary,
      getMutatorOverrideAccessor(db) !== null && getMutatorHistoryAccessor(db) !== null,
    );
  },

  async getActiveProfile(
    mutatorId: string,
    runMode: 'SAFE' | 'HARD',
  ): Promise<MutatorAdjustmentProfileDTO> {
    const caps = await this.getPolicyCaps(mutatorId, runMode);
    const readSource = this.getReadSource();

    if (readSource === 'table_primary') {
      try {
        const overrideAccessor = getMutatorOverrideAccessor(db);
        if (!overrideAccessor) {
          throw new Error('mutatorTuningOverride accessor unavailable');
        }

        const activeRow = await overrideAccessor.findUnique({
          where: {
            mutatorId_runMode: {
              mutatorId,
              runMode,
            },
          },
          select: {
            rewardDeltaPercent: true,
            dangerPressureDeltaPercent: true,
          },
        });

        const active = isObjectRecord(activeRow)
          ? {
              rewardDeltaPercent:
                typeof activeRow.rewardDeltaPercent === 'number' ? activeRow.rewardDeltaPercent : 0,
              dangerPressureDeltaPercent:
                typeof activeRow.dangerPressureDeltaPercent === 'number' ? activeRow.dangerPressureDeltaPercent : 0,
            }
          : null;

        if (active) {
          return sanitizeMutatorAdjustmentProfile({
            rewardDeltaPercent: active.rewardDeltaPercent,
            dangerPressureDeltaPercent: active.dangerPressureDeltaPercent,
          }, caps);
        }
      } catch {
        // If table read fails, fallback to audit to avoid hard downtime.
      }
    }

    {
      const overrideAccessor = getMutatorOverrideAccessor(db);
      if (featureFlags.mutatorTuningDbPrimary && overrideAccessor) {
        // noop placeholder for readability; actual read handled above.
      }
    }

    const rows = await db.auditLog.findMany({
      where: {
        action: MUTATOR_APPLIED_ADJUSTMENT_AUDIT_ACTION,
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
      select: { payload: true },
    });

    for (const row of rows) {
      if (!isObjectRecord(row.payload)) {
        continue;
      }

      const payloadMutatorId = typeof row.payload.mutatorId === 'string' ? row.payload.mutatorId : null;
      const payloadRunMode = toRunMode(row.payload.runMode);

      if (!payloadMutatorId || !payloadRunMode || payloadMutatorId !== mutatorId || payloadRunMode !== runMode) {
        continue;
      }

      const afterProfile = isObjectRecord(row.payload.afterProfile) ? row.payload.afterProfile : null;
      if (!afterProfile) {
        continue;
      }

      const rewardDeltaPercent = typeof afterProfile.rewardDeltaPercent === 'number' ? afterProfile.rewardDeltaPercent : 0;
      const dangerPressureDeltaPercent =
        typeof afterProfile.dangerPressureDeltaPercent === 'number' ? afterProfile.dangerPressureDeltaPercent : 0;

      return sanitizeMutatorAdjustmentProfile({
        rewardDeltaPercent,
        dangerPressureDeltaPercent,
      }, caps);
    }

    return NEUTRAL_MUTATOR_PROFILE;
  },

  async getPolicyCaps(mutatorId: string, runMode: 'SAFE' | 'HARD'): Promise<MutatorAdjustmentCaps> {
    try {
      const policyAccessor = getMutatorPolicyAccessor(db);
      if (!policyAccessor) {
        throw new Error('mutatorTuningPolicy accessor unavailable');
      }

      const row = await policyAccessor.findUnique({
        where: {
          mutatorId_runMode: {
            mutatorId,
            runMode,
          },
        },
        select: {
          maxAbsRewardDeltaPercent: true,
          maxAbsDangerDeltaPercent: true,
        },
      });

      if (!isObjectRecord(row)) {
        return DEFAULT_MUTATOR_ADJUSTMENT_CAPS;
      }

      return {
        maxAbsRewardDeltaPercent:
          typeof row.maxAbsRewardDeltaPercent === 'number'
            ? Math.max(1, Math.floor(row.maxAbsRewardDeltaPercent))
            : DEFAULT_MUTATOR_ADJUSTMENT_CAPS.maxAbsRewardDeltaPercent,
        maxAbsDangerDeltaPercent:
          typeof row.maxAbsDangerDeltaPercent === 'number'
            ? Math.max(1, Math.floor(row.maxAbsDangerDeltaPercent))
            : DEFAULT_MUTATOR_ADJUSTMENT_CAPS.maxAbsDangerDeltaPercent,
      };
    } catch {
      return DEFAULT_MUTATOR_ADJUSTMENT_CAPS;
    }
  },

  async upsertPolicyCaps(
    mutatorId: string,
    runMode: 'SAFE' | 'HARD',
    caps: MutatorAdjustmentCaps,
    updatedByUserId: string,
  ): Promise<MutatorAdjustmentCaps> {
    const normalizedCaps: MutatorAdjustmentCaps = {
      maxAbsRewardDeltaPercent: Math.max(1, Math.min(50, Math.floor(caps.maxAbsRewardDeltaPercent))),
      maxAbsDangerDeltaPercent: Math.max(1, Math.min(50, Math.floor(caps.maxAbsDangerDeltaPercent))),
    };

    await db.$transaction(async (tx) => {
      const policyAccessor = getMutatorPolicyAccessor(tx);
      if (!policyAccessor) {
        throw new Error('mutatorTuningPolicy accessor unavailable');
      }

      await policyAccessor.upsert({
        where: {
          mutatorId_runMode: {
            mutatorId,
            runMode,
          },
        },
        update: {
          maxAbsRewardDeltaPercent: normalizedCaps.maxAbsRewardDeltaPercent,
          maxAbsDangerDeltaPercent: normalizedCaps.maxAbsDangerDeltaPercent,
          updatedByUserId,
        },
        create: {
          mutatorId,
          runMode,
          maxAbsRewardDeltaPercent: normalizedCaps.maxAbsRewardDeltaPercent,
          maxAbsDangerDeltaPercent: normalizedCaps.maxAbsDangerDeltaPercent,
          updatedByUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: updatedByUserId,
          action: MUTATOR_POLICY_UPDATED_AUDIT_ACTION,
          payload: {
            mutatorId,
            runMode,
            maxAbsRewardDeltaPercent: normalizedCaps.maxAbsRewardDeltaPercent,
            maxAbsDangerDeltaPercent: normalizedCaps.maxAbsDangerDeltaPercent,
          },
        },
      });
    });

    return normalizedCaps;
  },

  async applyAdjustment(input: ApplyMutatorAdjustmentInput): Promise<void> {
    const caps = await this.getPolicyCaps(input.mutatorId, input.runMode);
    const sanitizedAfter = sanitizeMutatorAdjustmentProfile(input.afterProfile, caps);
    const sanitizedBefore = sanitizeMutatorAdjustmentProfile(input.beforeProfile, caps);

    await db.$transaction(async (tx) => {
      const auditPayload: Prisma.InputJsonObject = {
        mutatorId: input.mutatorId,
        runMode: input.runMode,
        actionType: input.actionType,
        suggestedDeltaPercent: input.suggestedDeltaPercent,
        beforeProfile: {
          rewardDeltaPercent: sanitizedBefore.rewardDeltaPercent,
          dangerPressureDeltaPercent: sanitizedBefore.dangerPressureDeltaPercent,
        },
        afterProfile: {
          rewardDeltaPercent: sanitizedAfter.rewardDeltaPercent,
          dangerPressureDeltaPercent: sanitizedAfter.dangerPressureDeltaPercent,
        },
        sourceGeneratedAt: input.sourceGeneratedAt ?? null,
      };

      await tx.auditLog.create({
        data: {
          userId: input.appliedByUserId,
          action: MUTATOR_APPLIED_ADJUSTMENT_AUDIT_ACTION,
          payload: auditPayload,
        },
      });

      try {
        const overrideAccessor = getMutatorOverrideAccessor(tx);
        const historyAccessor = getMutatorHistoryAccessor(tx);

        if (!overrideAccessor || !historyAccessor) {
          throw new Error('mutator tuning accessors unavailable on tx');
        }

        const existingRow = await overrideAccessor.findUnique({
          where: {
            mutatorId_runMode: {
              mutatorId: input.mutatorId,
              runMode: input.runMode,
            },
          },
          select: { id: true, version: true },
        });

        const existing = isObjectRecord(existingRow)
          ? {
              id: typeof existingRow.id === 'string' ? existingRow.id : '',
              version: typeof existingRow.version === 'number' ? existingRow.version : 0,
            }
          : null;

        if (existing && existing.id.length > 0) {
          await overrideAccessor.update({
            where: { id: existing.id },
            data: {
              rewardDeltaPercent: sanitizedAfter.rewardDeltaPercent,
              dangerPressureDeltaPercent: sanitizedAfter.dangerPressureDeltaPercent,
              version: existing.version + 1,
              updatedByUserId: input.appliedByUserId,
            },
          });
        } else {
          await overrideAccessor.create({
            data: {
              mutatorId: input.mutatorId,
              runMode: input.runMode,
              rewardDeltaPercent: sanitizedAfter.rewardDeltaPercent,
              dangerPressureDeltaPercent: sanitizedAfter.dangerPressureDeltaPercent,
              version: 1,
              updatedByUserId: input.appliedByUserId,
            },
          });
        }

        await historyAccessor.create({
          data: {
            mutatorId: input.mutatorId,
            runMode: input.runMode,
            actionType: input.actionType,
            suggestedDeltaPercent: input.suggestedDeltaPercent,
            beforeRewardDeltaPercent: sanitizedBefore.rewardDeltaPercent,
            beforeDangerDeltaPercent: sanitizedBefore.dangerPressureDeltaPercent,
            afterRewardDeltaPercent: sanitizedAfter.rewardDeltaPercent,
            afterDangerDeltaPercent: sanitizedAfter.dangerPressureDeltaPercent,
            appliedByUserId: input.appliedByUserId,
            sourceGeneratedAt: input.sourceGeneratedAt ? new Date(input.sourceGeneratedAt) : null,
          },
        });
      } catch {
        // Table not ready yet in some environments; audit fallback already written.
      }
    });
  },

  async listAdjustmentHistoryWithSource(since: Date): Promise<{
    source: MutatorTuningStorageSource;
    entries: MutatorAdjustmentHistoryEntry[];
  }> {
    const readSource = this.getReadSource();

    if (readSource === 'table_primary') {
      try {
        const historyAccessor = getMutatorHistoryAccessor(db);
        if (!historyAccessor) {
          throw new Error('mutatorTuningHistory accessor unavailable');
        }

        const rowsRaw = await historyAccessor.findMany({
          where: {
            createdAt: {
              gte: since,
            },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            createdAt: true,
            appliedByUserId: true,
            mutatorId: true,
            runMode: true,
            actionType: true,
            suggestedDeltaPercent: true,
            beforeRewardDeltaPercent: true,
            beforeDangerDeltaPercent: true,
            afterRewardDeltaPercent: true,
            afterDangerDeltaPercent: true,
          },
        });

        if (!Array.isArray(rowsRaw)) {
          throw new Error('invalid mutator tuning history result');
        }

        const entries = rowsRaw
          .map((row) => {
            if (!isObjectRecord(row)) {
              return null;
            }

            const createdAt = row.createdAt instanceof Date ? row.createdAt.toISOString() : null;
            const runMode = toRunMode(row.runMode);
            const actionType = toActionType(row.actionType);
            if (!createdAt || !runMode || !actionType || typeof row.mutatorId !== 'string') {
              return null;
            }

            return {
              createdAt,
              appliedByUserId: typeof row.appliedByUserId === 'string' ? row.appliedByUserId : 'unknown',
              mutatorId: row.mutatorId,
              runMode,
              actionType,
              suggestedDeltaPercent: typeof row.suggestedDeltaPercent === 'number' ? row.suggestedDeltaPercent : 0,
              beforeProfile: {
                rewardDeltaPercent: typeof row.beforeRewardDeltaPercent === 'number' ? row.beforeRewardDeltaPercent : 0,
                dangerPressureDeltaPercent: typeof row.beforeDangerDeltaPercent === 'number' ? row.beforeDangerDeltaPercent : 0,
              },
              afterProfile: {
                rewardDeltaPercent: typeof row.afterRewardDeltaPercent === 'number' ? row.afterRewardDeltaPercent : 0,
                dangerPressureDeltaPercent: typeof row.afterDangerDeltaPercent === 'number' ? row.afterDangerDeltaPercent : 0,
              },
            };
          })
          .filter((entry): entry is MutatorAdjustmentHistoryEntry => entry !== null);

        return { source: 'table_primary', entries };
      } catch {
        // fall through to audit fallback
      }
    }

    {
      const historyAccessor = getMutatorHistoryAccessor(db);
      if (featureFlags.mutatorTuningDbPrimary && historyAccessor) {
        // noop placeholder for readability; actual read handled above.
      }
    }

    const rows = await db.auditLog.findMany({
      where: {
        action: MUTATOR_APPLIED_ADJUSTMENT_AUDIT_ACTION,
        createdAt: {
          gte: since,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        userId: true,
        payload: true,
      },
    });

    const entries = rows
      .map((row) => {
        if (!isObjectRecord(row.payload)) {
          return null;
        }

        const mutatorId = typeof row.payload.mutatorId === 'string' ? row.payload.mutatorId : null;
        const runMode = toRunMode(row.payload.runMode);
        const actionType = toActionType(row.payload.actionType);
        const beforeProfileRaw = isObjectRecord(row.payload.beforeProfile) ? row.payload.beforeProfile : null;
        const afterProfileRaw = isObjectRecord(row.payload.afterProfile) ? row.payload.afterProfile : null;
        if (!mutatorId || !runMode || !actionType || !beforeProfileRaw || !afterProfileRaw) {
          return null;
        }

        return {
          createdAt: row.createdAt.toISOString(),
          appliedByUserId: row.userId ?? 'unknown',
          mutatorId,
          runMode,
          actionType,
          suggestedDeltaPercent: typeof row.payload.suggestedDeltaPercent === 'number' ? row.payload.suggestedDeltaPercent : 0,
          beforeProfile: sanitizeMutatorAdjustmentProfile({
            rewardDeltaPercent: typeof beforeProfileRaw.rewardDeltaPercent === 'number' ? beforeProfileRaw.rewardDeltaPercent : 0,
            dangerPressureDeltaPercent:
              typeof beforeProfileRaw.dangerPressureDeltaPercent === 'number' ? beforeProfileRaw.dangerPressureDeltaPercent : 0,
          }),
          afterProfile: sanitizeMutatorAdjustmentProfile({
            rewardDeltaPercent: typeof afterProfileRaw.rewardDeltaPercent === 'number' ? afterProfileRaw.rewardDeltaPercent : 0,
            dangerPressureDeltaPercent:
              typeof afterProfileRaw.dangerPressureDeltaPercent === 'number' ? afterProfileRaw.dangerPressureDeltaPercent : 0,
          }),
        };
      })
      .filter((entry): entry is MutatorAdjustmentHistoryEntry => entry !== null);

    return {
      source: 'audit_fallback',
      entries,
    };
  },

  async listAdjustmentHistory(since: Date): Promise<MutatorAdjustmentHistoryEntry[]> {
    const result = await this.listAdjustmentHistoryWithSource(since);
    return result.entries;
  },
};
