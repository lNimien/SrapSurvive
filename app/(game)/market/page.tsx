import { auth } from '../../../server/auth/auth';
import { redirect } from 'next/navigation';
import { InventoryRepository } from '../../../server/repositories/inventory.repository';
import { EconomyRepository } from '../../../server/repositories/economy.repository';
import { MarketItemCard } from '../../../components/game/MarketItemCard';
import { PlayerStateService } from '../../../server/services/player-state.service';
import { Separator } from '../../../components/ui/separator';

export const metadata = {
  title: 'Mercado — Scrap & Survive',
};

export default async function MarketPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const userId = session.user.id;

  const [items, balance, playerState] = await Promise.all([
    InventoryRepository.getInventoryByUser(userId),
    EconomyRepository.getCurrentBalance(userId),
    PlayerStateService.getPlayerState(userId),
  ]);

  const isRunActive = playerState?.activeRun?.status === 'running' || playerState?.activeRun?.status === 'catastrophe';
  const sellableItems = items.filter(i => !i.isEquipable && i.baseValue > 0);

  return (
    <main className="w-full h-full flex flex-col pt-4">
      <header className="mb-6 pb-4 flex flex-col md:flex-row md:justify-between md:items-end gap-4 relative z-10 px-2">
        <div className="relative">
           {/* Glitch Decorative Element */}
          <div className="absolute -left-2 top-0 w-1 h-full bg-primary" />
          <h1 className="font-sans text-3xl md:text-4xl font-bold text-primary neon-text-cyan uppercase tracking-[0.1em] pl-4">
            Mercado Negro
          </h1>
          <p className="font-mono text-sm text-primary/70 mt-1 pl-4 uppercase tracking-widest">
            Comercio de Scrap // Tasa de Intercambio: Fija
          </p>
        </div>
        <div className="text-left md:text-right glass-panel px-6 py-3 ml-2 md:ml-0 inline-block">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">Balance Actual_</p>
          <p className="text-2xl font-bold font-mono text-yellow-500 drop-shadow-[0_0_8px_rgba(252,238,10,0.6)]">
            {balance} <span className="text-sm">CC</span>
          </p>
        </div>
      </header>

      <Separator className="bg-primary/20 mb-8" />

      {isRunActive && (
        <div className="mb-6 p-4 bg-yellow-500/10 border-l-4 border-yellow-500 text-yellow-400 font-mono text-sm tracking-wide shadow-[0_0_15px_rgba(252,238,10,0.1)] cyberpunk-box">
          [!] ALERTA_SISTEMA: Expedición Activa en Puente. Transacciones ralentizadas pero operativas.
        </div>
      )}

      {sellableItems.length === 0 ? (
        <div className="p-12 text-center glass-panel cyberpunk-box flex flex-col items-center justify-center gap-4">
          <span className="text-4xl text-primary/30">Ø</span>
          <p className="text-primary/50 font-mono text-sm tracking-widest uppercase">Inventario de scrap vacío. Regresa con botín.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
          {sellableItems.map(item => (
            <MarketItemCard key={item.itemId} item={item} isRunActive={isRunActive} />
          ))}
        </div>
      )}
    </main>
  );
}
