import 'server-only';

import { redirect } from 'next/navigation';
import { auth } from '@/server/auth/auth';
import { PlayerStateService } from '@/server/services/player-state.service';
import { AchievementsPanel } from '@/components/game/AchievementsPanel';

export const metadata = {
  title: 'Logros — Scrap & Survive',
  description: 'Revisa y reclama hitos de progresión de cuenta.',
};

export default async function AchievementsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const playerState = await PlayerStateService.getPlayerState(session.user.id);

  return (
    <main className="space-y-6 pt-4">
      <header>
        <h1 className="font-sans text-3xl font-bold text-primary uppercase tracking-[0.08em]">Logros</h1>
        <p className="font-mono text-xs uppercase tracking-widest text-primary/70 mt-2">
          Avance histórico del chatarrero y recompensas reclamables.
        </p>
      </header>
      <AchievementsPanel achievements={playerState.achievements} />
    </main>
  );
}
