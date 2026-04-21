import { auth } from '../../../server/auth/auth';
import { redirect } from 'next/navigation';
import { InventoryGrid } from '../../../components/game/InventoryGrid';
import { LoadoutSelector } from '@/components/game/LoadoutSelector';
import { InventoryRepository } from '../../../server/repositories/inventory.repository';
import { Separator } from '../../../components/ui/separator';
import { PlayerStateService } from '@/server/services/player-state.service';

export const metadata = {
  title: 'Inventario — Scrap & Survive',
};

export default async function InventoryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const userId = session.user.id;

  const [items, equipment, playerState] = await Promise.all([
    InventoryRepository.getInventoryByUser(userId),
    InventoryRepository.getEquipmentByUser(userId),
    PlayerStateService.getPlayerState(userId),
  ]);

  const isRunActive = playerState?.activeRun?.status === 'running' || playerState?.activeRun?.status === 'catastrophe';

  const equipableItems = items.filter(i => i.isEquipable);
  const materialItems = items.filter(i => !i.isEquipable);
  const totalMaterialStacks = materialItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalEquipmentPieces = equipableItems.length;
  const equippedSlots = Object.values(equipment).filter((slotItem) => slotItem !== null).length;

  return (
    <main className="w-full h-full flex flex-col pt-4">
      <header className="relative z-10 mb-6 grid gap-4 rounded-lg border border-primary/20 bg-black/25 p-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className="relative pl-4">
          <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
          <h1 className="font-sans text-3xl font-bold uppercase tracking-[0.1em] text-primary md:text-4xl">Almacén Base</h1>
          <p className="mt-1 font-mono text-sm uppercase tracking-widest text-primary/70">
            Panel táctico de equipamiento y reservas
          </p>
        </div>

        <div className="rounded border border-primary/30 bg-primary/8 px-3 py-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/70">Estado operacional</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-zinc-100">
            {isRunActive ? 'Bloqueo táctico por expedición activa' : 'Configurable'}
          </p>
        </div>
      </header>

      <Separator className="bg-primary/20 mb-8" />

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6" aria-label="Resumen de almacenamiento">
        <div className="rounded-lg border border-primary/20 bg-primary/6 p-3">
          <p className="text-[10px] uppercase tracking-widest text-primary/70 font-mono">Stacks de materiales</p>
          <p className="text-2xl font-mono text-primary tabular-nums">{totalMaterialStacks}</p>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/6 p-3">
          <p className="text-[10px] uppercase tracking-widest text-primary/70 font-mono">Piezas equipables</p>
          <p className="text-2xl font-mono text-primary tabular-nums">{totalEquipmentPieces}</p>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/6 p-3">
          <p className="text-[10px] uppercase tracking-widest text-primary/70 font-mono">Slots equipados</p>
          <p className="text-2xl font-mono text-primary tabular-nums">{equippedSlots}/6</p>
        </div>
      </section>

      {isRunActive && (
        <div className="mb-6 rounded border border-yellow-500/45 bg-yellow-500/10 p-4 font-mono text-sm tracking-wide text-yellow-200 shadow-[0_0_15px_rgba(252,238,10,0.1)]">
          [!] ALERTA_SISTEMA: Expedición activa. El equipamiento desplegado no puede alterarse hasta finalizar la extracción.
        </div>
      )}

      <section className="mb-8 rounded-lg border border-primary/25 bg-primary/5 p-4" aria-label="Guía rápida de materia prima">
        <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-primary">Materia Prima: Uso Táctico</h2>
        <ul className="mt-3 space-y-2 text-xs font-mono text-primary/80 leading-relaxed">
          <li>• Se usa para <span className="text-primary">fabricación</span> de equipo avanzado en el taller.</li>
          <li>• También cuenta para <span className="text-primary">contratos</span> y puede venderse en el mercado.</li>
          <li>• Tu <span className="text-primary">nivel</span> otorga bonos de extracción calculados en servidor (CC y XP).</li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 border-l-4 border-primary bg-gradient-to-r from-primary/10 to-transparent py-1 pl-3 font-sans text-xl font-bold uppercase tracking-widest text-primary">
          Equipamiento Táctico
        </h2>
        <LoadoutSelector items={equipableItems} equipment={equipment} isRunActive={isRunActive} />
      </section>

      <section className="pb-12">
        <h2 className="mb-4 border-l-4 border-green-400 bg-gradient-to-r from-green-400/10 to-transparent py-1 pl-3 font-sans text-xl font-bold uppercase tracking-widest text-green-400">
          Materia Prima / Scrap
        </h2>
        <InventoryGrid items={materialItems} equipment={equipment} isRunActive={isRunActive} />
      </section>
    </main>
  );
}
