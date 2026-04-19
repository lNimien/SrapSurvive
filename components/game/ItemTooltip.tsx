import { InventoryItemDTO } from '../../types/dto.types';
import { getPerkLines } from '@/lib/utils/item-perks';

interface ItemTooltipProps {
  item: InventoryItemDTO;
}

export function ItemTooltip({ item }: ItemTooltipProps) {
  const perks = getPerkLines(item.configOptions);

  return (
    <div className="item-tooltip absolute z-50 min-w-[220px] rounded border border-zinc-700 bg-zinc-950 p-3 text-zinc-100 shadow-2xl pointer-events-none opacity-0 transition-opacity group-hover:opacity-100 -top-2 left-full ml-2">
      <div className="mb-2 border-b border-zinc-700 pb-1 font-bold text-zinc-100">
        {item.displayName}
      </div>
      <div className="mb-2 text-xs leading-relaxed text-zinc-300">
        {item.description || 'Sin descripción.'}
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs">
        <span className="text-zinc-400">Rareza:</span>
        <span className={`rarity-text rarity-${item.rarity.toLowerCase()}`}>
          {item.rarity}
        </span>
        <span className="text-zinc-400">Valor Base:</span>
        <span className="text-amber-400">{item.baseValue} CC</span>
      </div>

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
