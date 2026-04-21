import { InventoryItemDTO } from '@/types/dto.types';
import { Badge } from '@/components/ui/badge';
import { getPerkLines } from '@/lib/utils/item-perks';
import { cn } from '@/lib/utils/cn';
import { getRarityVisuals, getTierLabel } from '@/lib/utils/rarity';
import { deriveItemInsight, deriveItemStats } from '@/lib/utils/item-insight';

interface ItemTooltipProps {
  item: InventoryItemDTO;
}

export function ItemTooltip({ item }: ItemTooltipProps) {
  const perks = getPerkLines(item.configOptions);
  const stats = deriveItemStats(item.configOptions);
  const explanation = deriveItemInsight(item);
  const rarityVisuals = getRarityVisuals(item.rarity);
  const itemTypeLabel = item.isEquipable ? 'Equipo' : 'Material';
  const slotLabel = item.equipmentSlot ? item.equipmentSlot.replaceAll('_', ' ') : 'N/A';

  return (
    <article className="max-h-[min(70vh,28rem)] overflow-y-auto p-4 pr-3 sm:p-5" role="document">
      <header className="space-y-3 border-b border-zinc-800/90 pb-3">
        <div className="space-y-1">
          <p className="break-words font-sans text-base font-bold uppercase tracking-wide text-zinc-100">{item.displayName}</p>
          <p className="break-words text-xs leading-relaxed text-zinc-400">{item.description || 'Sin descripción.'}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn('text-[10px] uppercase tracking-[0.2em] border px-2 py-0.5', rarityVisuals.badgeClass)}
          >
            {getTierLabel(item.rarity)}
          </Badge>
          <Badge variant="outline" className="border-zinc-700 bg-zinc-900/90 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-zinc-300">
            {itemTypeLabel}
          </Badge>
          {item.isEquipable && (
            <Badge variant="outline" className="border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-cyan-200">
              {slotLabel}
            </Badge>
          )}
        </div>
      </header>

      <div className="mt-3 rounded-sm border border-cyan-500/20 bg-cyan-500/8 px-2.5 py-2 text-[11px] leading-relaxed text-cyan-100">
        {explanation}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-sm border border-zinc-800 bg-zinc-900/70 px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Valor Base</p>
          <p className="mt-1 font-mono text-amber-300 tabular-nums">{item.baseValue} CC</p>
        </div>
        <div className="rounded-sm border border-zinc-800 bg-zinc-900/70 px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Stack</p>
          <p className="mt-1 font-mono text-zinc-100 tabular-nums">x{item.quantity}</p>
        </div>
      </div>

      {stats.length > 0 && (
        <section className="mt-3 border-t border-zinc-800/90 pt-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">Stats</p>
          <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-zinc-200">
            {stats.map((stat) => (
              <li key={stat}>• {stat}</li>
            ))}
          </ul>
        </section>
      )}

      {perks.length > 0 && (
        <section className="mt-3 border-t border-zinc-800/90 pt-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-violet-300">Perks</p>
          <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-zinc-300">
            {perks.map((perk) => (
              <li key={perk}>• {perk}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
