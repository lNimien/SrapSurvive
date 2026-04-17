import { InventoryItemDTO } from '../../types/dto.types';

interface ItemTooltipProps {
  item: InventoryItemDTO;
}

export function ItemTooltip({ item }: ItemTooltipProps) {
  return (
    <div className="item-tooltip absolute z-50 bg-gray-900 border border-gray-700 text-gray-200 p-3 rounded shadow-xl min-w-[200px] pointer-events-none opacity-0 transition-opacity group-hover:opacity-100 -top-2 left-full ml-2">
      <div className="font-bold border-b border-gray-700 pb-1 mb-2">
        {item.displayName}
      </div>
      <div className="text-xs text-gray-400 mb-2">
        {item.description || 'Sin descripción.'}
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs">
        <span className="text-gray-500">Rareza:</span>
        <span className={`rarity-text rarity-${item.rarity.toLowerCase()}`}>
          {item.rarity}
        </span>
        <span className="text-gray-500">Valor Base:</span>
        <span className="text-amber-400">{item.baseValue} CC</span>
      </div>
    </div>
  );
}
