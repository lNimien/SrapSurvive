import { InventoryItemDTO } from '../../types/dto.types';
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
    <div className="item-tooltip absolute z-50 min-w-[260px] max-w-[320px] rounded border border-zinc-700 bg-zinc-950 p-3 text-zinc-100 shadow-2xl pointer-events-none opacity-0 transition-opacity group-hover:opacity-100 -top-2 left-full ml-2">
      <div className="mb-2 border-b border-zinc-700 pb-2">
        <p className="font-bold text-zinc-100 text-sm">{item.displayName}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <Badge variant="outline" className={cn('text-[10px] uppercase tracking-widest border', rarityVisuals.textClass)}>
            {getTierLabel(item.rarity)}
          </Badge>
          <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-zinc-600 text-zinc-300">
            {itemTypeLabel}
          </Badge>
          {item.isEquipable && (
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-cyan-500/50 text-cyan-300">
              {slotLabel}
            </Badge>
          )}
        </div>
      </div>

      <div className="mb-2 text-xs leading-relaxed text-zinc-300">
        {item.description || 'Sin descripción.'}
      </div>

      <div className="mb-2 rounded border border-cyan-500/20 bg-cyan-500/5 px-2 py-1.5 text-[11px] leading-relaxed text-cyan-100">
        {explanation}
      </div>

      <div className="grid grid-cols-2 gap-1 text-xs">
        <span className="text-zinc-400">Valor Base:</span>
        <span className="text-amber-400">{item.baseValue} CC</span>
        <span className="text-zinc-400">Cantidad:</span>
        <span className="text-zinc-100">x{item.quantity}</span>
      </div>

      {stats.length > 0 && (
        <div className="mt-2 border-t border-zinc-700 pt-2">
          <p className="text-[10px] uppercase tracking-widest text-cyan-300">Stats</p>
          <ul className="mt-1 space-y-1 text-[11px] text-zinc-200">
            {stats.map((stat) => (
              <li key={stat}>• {stat}</li>
            ))}
          </ul>
        </div>
      )}

      {perks.length > 0 && (
        <div className="mt-2 border-t border-zinc-700 pt-2">
          <p className="text-[10px] uppercase tracking-widest text-cyan-300">Perks</p>
          <ul className="mt-1 space-y-1 text-[11px] text-zinc-300">
            {perks.map((perk) => (
              <li key={perk}>• {perk}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
