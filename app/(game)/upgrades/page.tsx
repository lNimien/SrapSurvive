import 'server-only';

import { redirect } from 'next/navigation';
import { auth } from '@/server/auth/auth';
import { UpgradesPanel } from '@/components/game/UpgradesPanel';
import { UpgradeTreeService } from '@/server/services/upgrade-tree.service';

export const metadata = {
  title: 'Mejoras - Scrap & Survive',
  description: 'Arbol de progresion tactica por ramas: Nave, Taller y Mercado Negro.',
};

export default async function UpgradesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const tree = await UpgradeTreeService.getUpgradeTreeForPlayer(session.user.id);

  return (
    <main className="space-y-6 pt-4">
      <header>
        <h1 className="font-sans text-3xl font-bold text-primary uppercase tracking-[0.08em]">Mejoras</h1>
        <p className="font-mono text-xs uppercase tracking-widest text-primary/70 mt-2">
          Red de investigacion persistente aplicada en servidor para cada expedicion.
        </p>
      </header>
      <UpgradesPanel tree={tree} />
    </main>
  );
}

