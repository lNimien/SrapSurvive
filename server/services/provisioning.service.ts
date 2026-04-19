import 'server-only';
import { db } from '../db/client';

export const ProvisioningService = {
  /**
   * Ensures that a user has all necessary game-related records.
   * This is used to "lazy-provision" users who might have an auth session
   * but no game data (e.g. after a DB reset or migration).
   */
  async ensureProvisioned(userId: string, name?: string | null) {
    // Check if progression exists (it's the core game record)
    const progression = await db.userProgression.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (progression) {
      return; // Already provisioned
    }

    // Provision new user data in a transaction
    let displayName = name;

    if (!displayName) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      displayName = user?.name || 'Chatarrero';
    }

    await db.$transaction(async (tx) => {
      // 1. UserProfile — game display name
      await tx.userProfile.create({
        data: {
          userId,
          displayName,
        },
      });

      // 2. UserProgression — starts at level 1, 0 XP
      await tx.userProgression.create({
        data: {
          userId,
          currentXp: 0,
          currentLevel: 1,
          totalScrapCollected: 0,
        },
      });

      // 3. CurrencyLedger — initial entry at 0 CC
      await tx.currencyLedger.create({
        data: {
          userId,
          amount: 0,
          balanceAfter: 0,
          entryType: 'INITIAL',
        },
      });

      // 4. Six empty EquipmentSlots
      const SLOTS = [
        'HEAD',
        'BODY',
        'HANDS',
        'TOOL_PRIMARY',
        'TOOL_SECONDARY',
        'BACKPACK',
      ] as const;

      await tx.equipmentSlot_.createMany({
        data: SLOTS.map((slot) => ({
          userId,
          slot,
          itemDefinitionId: null,
        })),
      });

      // 5. Initial InventoryItem for basic_work_helmet
      await tx.inventoryItem.create({
        data: {
          userId,
          itemDefinitionId: 'basic_work_helmet',
          quantity: 1,
        },
      });

      // 6. Equip the helmet in HEAD slot
      await tx.equipmentSlot_.update({
        where: {
          userId_slot: {
            userId,
            slot: 'HEAD',
          },
        },
        data: {
          itemDefinitionId: 'basic_work_helmet',
          equippedAt: new Date(),
        },
      });

      // 7. Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'user.provisioned',
          payload: {
            reason: 'lazy_initialization',
            initialItem: 'basic_work_helmet'
          },
        },
      });
    });
  },
};
