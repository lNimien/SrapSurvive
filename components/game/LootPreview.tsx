import { PendingLootDTO } from '../../types/dto.types';

interface LootPreviewProps {
  loot?: PendingLootDTO[];
}

export function LootPreview({ loot }: LootPreviewProps) {
  if (!loot || loot.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 font-mono text-sm pt-4 animate-pulse">
        Recolectando materiales...
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-2 text-sm font-mono mt-2">
      {loot.map((item) => (
        <li 
          key={item.itemId} 
          className="flex justify-between items-center bg-gray-800/80 px-3 py-1.5 rounded border border-gray-700/50"
        >
          <span className={`rarity-text rarity-${item.rarity.toLowerCase()}`}>
             {item.displayName}
          </span>
          <span className="text-gray-300 font-bold">~{item.quantity}</span>
        </li>
      ))}
    </ul>
  );
}
