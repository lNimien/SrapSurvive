import { auth } from '../../../server/auth/auth';
import { redirect } from 'next/navigation';
import { InventoryRepository } from '../../../server/repositories/inventory.repository';
import { EconomyRepository } from '../../../server/repositories/economy.repository';
import { MarketItemCard } from '../../../components/game/MarketItemCard';
import { VendorItemCard } from '../../../components/game/VendorItemCard';
import { PlayerStateService } from '../../../server/services/player-state.service';
import { Separator } from '../../../components/ui/separator';
import { ITEM_CATALOG } from '../../../config/game.config';
import { VENDOR_CATALOG } from '../../../config/vendor.config';
import Link from 'next/link';
import { computeSellUnitPrice } from '../../../server/domain/economy/market.calculator';

export const metadata = {
  title: 'Mercado — Scrap & Survive',
};

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function MarketPage({ searchParams }: PageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const userId = session.user.id;
  const { tab = 'vender' } = await searchParams;

  const [items, balance, playerState] = await Promise.all([
    InventoryRepository.getInventoryByUser(userId),
    EconomyRepository.getCurrentBalance(userId),
    PlayerStateService.getPlayerState(userId),
  ]);

  const isRunActive = playerState?.activeRun?.status === 'running' || playerState?.activeRun?.status === 'catastrophe';
  
  // Sell tab data with dedicated sell formula (preview must match final ledger amount)
  const sellableItems = items
    .filter(i => !i.isEquipable && i.baseValue > 0)
    .map(item => ({
      ...item,
      currentPrice: computeSellUnitPrice(item.baseValue)
    }));

  // Buy tab data
  const vendorItems = VENDOR_CATALOG.map(v => {
    const definition = ITEM_CATALOG.find(i => i.id === v.itemDefinitionId);
    return definition ? { definition, price: v.priceCC } : null;
  }).filter(Boolean);

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
            Comercio de Scrap // Tasa de Reventa Controlada
          </p>
        </div>
        <div className="text-left md:text-right glass-panel px-6 py-3 ml-2 md:ml-0 inline-block">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">Balance Actual_</p>
          <p className="text-2xl font-bold font-mono text-yellow-500 drop-shadow-[0_0_8px_rgba(252,238,10,0.6)]">
            {balance} <span className="text-sm">CC</span>
          </p>
        </div>
      </header>

      {/* Manual Tabs System */}
      <div className="flex items-center gap-1 mb-6 px-2">
        <Link 
          href="?tab=vender" 
          className={`px-6 py-2 font-sans font-bold text-sm uppercase tracking-widest border-b-2 transition-all ${tab === 'vender' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-primary/40 hover:text-primary/70'}`}
        >
          [ Vender ]
        </Link>
        <Link 
          href="?tab=comprar" 
          className={`px-6 py-2 font-sans font-bold text-sm uppercase tracking-widest border-b-2 transition-all ${tab === 'comprar' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-primary/40 hover:text-primary/70'}`}
        >
          [ Comprar ]
        </Link>
      </div>

      <Separator className="bg-primary/20 mb-8" />

      {isRunActive && (
        <div className="mb-6 mx-2 p-4 bg-yellow-500/10 border-l-4 border-yellow-500 text-yellow-400 font-mono text-sm tracking-wide shadow-[0_0_15px_rgba(252,238,10,0.1)] cyberpunk-box">
          [!] ALERTA_SISTEMA: Expedición Activa en Puente. Transacciones ralentizadas pero operativas.
        </div>
      )}

      {tab === 'vender' ? (
        sellableItems.length === 0 ? (
          <div className="mx-2 p-12 text-center glass-panel cyberpunk-box flex flex-col items-center justify-center gap-4">
            <span className="text-4xl text-primary/30">Ø</span>
            <p className="text-primary/50 font-mono text-sm tracking-widest uppercase">Inventario de scrap vacío. Regresa con botín.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12 px-2">
            {sellableItems.map(item => (
              <MarketItemCard key={item.itemId} item={item} isRunActive={isRunActive} />
            ))}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12 px-2">
          {vendorItems.map((v: any) => (
            <VendorItemCard 
              key={v.definition.id} 
              item={v.definition} 
              priceCC={v.price} 
              currentBalance={balance}
              isRunActive={isRunActive}
            />
          ))}
        </div>
      )}
    </main>
  );
}
