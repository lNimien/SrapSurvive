import 'server-only';

import { EconomyRepository } from '@/server/repositories/economy.repository';
import { UserRepository } from '@/server/repositories/user.repository';

export interface SidebarContextDTO {
  level: number;
  credits: number;
}

export const SidebarContextService = {
  async getSidebarContext(userId: string): Promise<SidebarContextDTO> {
    const [profile, credits] = await Promise.all([
      UserRepository.getUserProfile(userId),
      EconomyRepository.getCurrentBalance(userId),
    ]);

    return {
      level: profile?.level ?? 1,
      credits,
    };
  },
};
