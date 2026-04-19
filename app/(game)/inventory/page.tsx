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
      <header className="mb-6 pb-4 flex flex-col md:flex-row md:justify-between md:items-end gap-4 relative z-10 px-2">
        <div className="relative">
          {/* Glitch Decorative Element */}
          <div className="absolute -left-2 top-0 w-1 h-full bg-primary" />
          <h1 className="font-sans text-3xl md:text-4xl font-bold text-primary neon-text-cyan uppercase tracking-[0.1em] pl-4">
            Almacén Base
          </h1>
          <p className="font-mono text-sm text-primary/70 mt-1 pl-4 uppercase tracking-widest">
            Gestión de Equipamiento // Almacenaje Seguro
          </p>
        </div>
      </header>

      <Separator className="bg-primary/20 mb-8" />

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6" aria-label="Resumen de almacenamiento">
        <div className="border border-primary/20 bg-primary/5 p-3">
          <p className="text-[10px] uppercase tracking-widest text-primary/70 font-mono">Stacks de materiales</p>
          <p className="text-2xl font-mono text-primary">{totalMaterialStacks}</p>
        </div>
        <div className="border border-primary/20 bg-primary/5 p-3">
          <p className="text-[10px] uppercase tracking-widest text-primary/70 font-mono">Piezas equipables</p>
          <p className="text-2xl font-mono text-primary">{totalEquipmentPieces}</p>
        </div>
        <div className="border border-primary/20 bg-primary/5 p-3">
          <p className="text-[10px] uppercase tracking-widest text-primary/70 font-mono">Slots equipados</p>
          <p className="text-2xl font-mono text-primary">{equippedSlots}/6</p>
        </div>
      </section>

      {isRunActive && (
        <div className="mb-6 p-4 bg-yellow-500/10 border-l-4 border-yellow-500 text-yellow-400 font-mono text-sm tracking-wide shadow-[0_0_15px_rgba(252,238,10,0.1)] cyberpunk-box">
          [!] ALERTA_SISTEMA: Expedición Activa. El equipo desplegado no puede ser alterado remotamente.
        </div>
      )}

      <section className="mb-8 p-4 border border-primary/25 bg-primary/5 cyberpunk-box" aria-label="Guía rápida de materia prima">
        <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-primary">Materia Prima: Uso Táctico</h2>
        <ul className="mt-3 space-y-2 text-xs font-mono text-primary/80 leading-relaxed">
          <li>• Se usa para <span className="text-primary">fabricación</span> de equipo avanzado en el taller.</li>
          <li>• También cuenta para <span className="text-primary">contratos</span> y puede venderse en el mercado.</li>
          <li>• Tu <span className="text-primary">nivel</span> otorga bonos de extracción calculados en servidor (CC y XP).</li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-bold font-sans text-primary mb-4 border-l-4 border-primary pl-3 uppercase tracking-widest bg-gradient-to-r from-primary/10 to-transparent py-1">Equipamiento Táctico</h2>
        <LoadoutSelector items={equipableItems} equipment={equipment} isRunActive={isRunActive} />
      </section>

      <section className="pb-12">
        <h2 className="text-xl font-bold font-sans text-green-400 mb-4 border-l-4 border-green-400 pl-3 uppercase tracking-widest bg-gradient-to-r from-green-400/10 to-transparent py-1">Materia Prima / Scrap</h2>
        <InventoryGrid items={materialItems} equipment={equipment} isRunActive={isRunActive} />
      </section>
    </main>
  );
}
