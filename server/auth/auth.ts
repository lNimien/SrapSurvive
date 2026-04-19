import 'server-only';
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '../db/client';
import { ProvisioningService } from '../services/provisioning.service';

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
     */
    async createUser({ user }) {
      if (!user.id) return;
      await ProvisioningService.ensureProvisioned(user.id, user.name);
    },
  },
});
