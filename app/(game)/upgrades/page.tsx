import 'server-only';

import { redirect } from 'next/navigation';
import { auth } from '@/server/auth/auth';
import { PlayerStateService } from '@/server/services/player-state.service';
import { UpgradesPanel } from '@/components/game/UpgradesPanel';

export const metadata = {
  title: 'Mejoras — Scrap & Survive',
  description: 'Compra mejoras persistentes de cuenta para futuras runs.',
};

export default async function UpgradesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const playerState = await PlayerStateService.getPlayerState(session.user.id);

  return (
    <main className="space-y-6 pt-4">
      <header>
        <h1 className="font-sans text-3xl font-bold text-primary uppercase tracking-[0.08em]">Mejoras</h1>
        <p className="font-mono text-xs uppercase tracking-widest text-primary/70 mt-2">
          Potencia permanente aplicada en servidor para cada expedición.
        </p>
      </header>
      <UpgradesPanel upgrades={playerState.upgrades} />
    </main>
  );
}
