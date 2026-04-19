import 'server-only';

import { db } from '@/server/db/client';
import { SHIPYARD_CEMETERY_CONFIG, ITEM_CATALOG } from '@/config/game.config';

const EQUIPMENT_SLOTS = ['HEAD', 'BODY', 'HANDS', 'TOOL_PRIMARY', 'TOOL_SECONDARY', 'BACKPACK'] as const;

export async function resetTestDb(): Promise<void> {
  await db.auditLog.deleteMany();
  await db.userContract.deleteMany();
  await db.extractionResult.deleteMany();
  await db.weeklyDirectiveProgress.deleteMany();
  await db.activeRun.deleteMany();
  await db.currencyLedger.deleteMany();
  await db.equipmentSlot_.deleteMany();
  await db.inventoryItem.deleteMany();
  await db.userProgression.deleteMany();
  await db.userProfile.deleteMany();
  await db.session.deleteMany();
  await db.account.deleteMany();
  await db.verificationToken.deleteMany();
  await db.user.deleteMany();

  await Promise.all(
    ITEM_CATALOG.map((item) =>
      db.itemDefinition.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          internalKey: item.id,
          displayName: item.displayName,
          description: item.description,
          rarity: item.rarity,
          baseValue: item.baseValue,
          stackable: item.maxStack > 1,
          maxStack: item.maxStack,
          iconKey: item.iconKey,
          metadata: item.configOptions ?? {},
        },
        update: {
          internalKey: item.id,
          displayName: item.displayName,
          description: item.description,
          rarity: item.rarity,
          baseValue: item.baseValue,
          stackable: item.maxStack > 1,
          maxStack: item.maxStack,
          iconKey: item.iconKey,
          metadata: item.configOptions ?? {},
        },
      })
    )
  );
}

export async function seedTestUser(userId: string): Promise<void> {
  await db.user.create({
    data: {
      id: userId,
      email: `${userId}@test.local`,
      name: userId,
    },
  });

  await db.userProfile.create({
    data: {
      userId,
      displayName: userId,
    },
  });

  await db.userProgression.create({
    data: {
      userId,
      currentLevel: 1,
      currentXp: 0,
      totalScrapCollected: 0,
    },
  });

  await db.currencyLedger.create({
    data: {
      userId,
      amount: 0,
      balanceAfter: 0,
      entryType: 'INITIAL',
    },
  });

  await db.equipmentSlot_.createMany({
    data: EQUIPMENT_SLOTS.map((slot) => ({
      userId,
      slot,
      itemDefinitionId: null,
    })),
  });
}

export async function seedTestRun(params: {
  userId: string;
  runId?: string;
  startedAt?: Date;
  zoneId?: string;
  equipmentSnapshot?: Record<string, string | null>;
  dangerConfig?: Record<string, unknown>;
}): Promise<{ runId: string }> {
  const run = await db.activeRun.create({
    data: {
      id: params.runId,
      userId: params.userId,
      status: 'RUNNING',
      zoneId: params.zoneId ?? SHIPYARD_CEMETERY_CONFIG.internalKey,
      startedAt: params.startedAt ?? new Date(Date.now() - 120_000),
      equipmentSnapshot:
        params.equipmentSnapshot ?? {
          HEAD: null,
          BODY: null,
          HANDS: null,
          TOOL_PRIMARY: null,
          TOOL_SECONDARY: null,
          BACKPACK: null,
        },
      dangerConfig:
        params.dangerConfig ?? {
          baseRate: SHIPYARD_CEMETERY_CONFIG.baseRate,
          quadraticFactor: SHIPYARD_CEMETERY_CONFIG.quadraticFactor,
          catastropheThreshold: SHIPYARD_CEMETERY_CONFIG.catastropheThreshold,
          dangerLootBonus: SHIPYARD_CEMETERY_CONFIG.dangerLootBonus,
          baseLootPerSecond: SHIPYARD_CEMETERY_CONFIG.baseLootPerSecond,
          baseCreditsPerMinute: SHIPYARD_CEMETERY_CONFIG.baseCreditsPerMinute,
          baseXpPerSecond: SHIPYARD_CEMETERY_CONFIG.baseXpPerSecond,
          runMode: 'SAFE',
        },
    },
  });

  return { runId: run.id };
}
