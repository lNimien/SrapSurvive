import 'server-only';

import { auth } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { getCratesCatalogAction } from '@/server/actions/crates.actions';
import { PlayerStateService } from '@/server/services/player-state.service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Boxes } from 'lucide-react';
import { CratesShowcase } from '@/components/game/crates/CratesShowcase';

export const metadata = {
  title: 'Crates | Scrap & Survive',
  description: 'Abre cajas de botín y consigue recompensas escalables para el loop de extracción.',
};

export default async function CratesPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect('/');
  }

  const [catalogResult, playerState] = await Promise.all([
    getCratesCatalogAction(),
    PlayerStateService.getPlayerState(userId),
  ]);

  if (!catalogResult.success) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>Error de sincronización de crates</AlertTitle>
          <AlertDescription>{catalogResult.error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <main className="space-y-8">
      <header className="border-b border-primary/20 pb-5">
        <div className="flex items-center gap-3 text-primary mb-2">
          <Boxes className="w-8 h-8 drop-shadow-[0_0_8px_rgba(0,243,255,0.5)]" />
          <h1 className="text-4xl font-sans font-black tracking-tighter uppercase italic">Crates</h1>
        </div>
        <p className="text-muted-foreground font-mono text-sm max-w-3xl leading-relaxed">
          Cajas operativas con tabla de recompensas data-driven. Cada apertura consume CC, aplica pesos de probabilidad en servidor
          y acredita el drop directamente a inventario de forma transaccional.
        </p>
      </header>

      <section className="border border-primary/20 bg-primary/5 rounded-md p-4">
        <p className="text-[10px] uppercase tracking-widest text-primary/60 font-mono">Créditos disponibles</p>
        <p className="text-2xl font-mono text-yellow-300 mt-1">{playerState.currencyBalance} CC</p>
      </section>

      <CratesShowcase crates={catalogResult.data} currencyBalance={playerState.currencyBalance} />
    </main>
  );
}

