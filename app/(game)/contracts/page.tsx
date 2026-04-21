import 'server-only';

import { redirect } from 'next/navigation';
import { auth } from '@/server/auth/auth';
import { PlayerStateService } from '@/server/services/player-state.service';
import { ContractsPanel } from '@/components/game/ContractsPanel';

export const metadata = {
  title: 'Contratos — Scrap & Survive',
  description: 'Gestiona contratos diarios y reclama recompensas tácticas.',
};

export default async function ContractsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const playerState = await PlayerStateService.getPlayerState(session.user.id);

  return (
    <main className="space-y-6 pt-4">
      <header>
        <h1 className="font-sans text-3xl font-bold text-primary uppercase tracking-[0.08em]">Contratos</h1>
        <p className="font-mono text-xs uppercase tracking-widest text-primary/70 mt-2">
          Entregas diarias para sostener el flujo de créditos y XP.
        </p>
      </header>
      <ContractsPanel
        contracts={playerState.contracts}
        nextRefreshCostCC={playerState.nextContractRefreshCostCC ?? 85}
      />
    </main>
  );
}
