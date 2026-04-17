import 'server-only';
import { db } from '../db/client';

export const UserRepository = {
  /**
   * Returns profile + progression domain data.
   * Never returns raw Prisma types.
   * Returns null if profile or progression doesn't exist (pre-provisioning state).
   */
  async getUserProfile(userId: string) {
    const [profile, progression] = await Promise.all([
      db.userProfile.findUnique({ where: { userId } }),
      db.userProgression.findUnique({ where: { userId } }),
    ]);

    if (!profile || !progression) {
      return null;
    }

    return {
      displayName: profile.displayName,
      level: progression.currentLevel,   // schema field is currentLevel
      currentXp: progression.currentXp,
    };
  },
};
