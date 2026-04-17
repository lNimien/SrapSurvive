import 'server-only';
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '../db/client';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [Google],
  pages: {
    signIn: '/',        // Redirect to home for sign-in
    error: '/',
  },
  callbacks: {
    // Expose userId in the session so Server Components can access it directly
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  events: {
    /**
     * Fires once, right after a NEW user is created in DB.
     * We use this instead of the signIn callback to guarantee
     * this runs exactly once per user, not on every sign-in.
     *
     * Transaction guarantees atomicity: if any step fails,
     * the entire provisioning is rolled back and the user will
     * be prompted on next login (no partial state).
     */
    async createUser({ user }) {
      if (!user.id || !user.name) return;

      const displayName = user.name;
      const userId = user.id;

      await db.$transaction(async (tx) => {
        // 1. UserProfile — game display name (separate from auth User)
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

        // 4. Six empty EquipmentSlots (HEAD, BODY, HANDS, TOOL_PRIMARY, TOOL_SECONDARY, BACKPACK)
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
        // We use upsert in case the createMany above already set it (it didn't, but defensive)
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
      });
    },
  },
});
