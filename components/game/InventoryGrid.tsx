import { InventoryItemDTO, EquipmentDTO } from '../../types/dto.types';
import { InventorySlot } from './InventorySlot';

interface InventoryGridProps {
  items: InventoryItemDTO[];
  equipment: EquipmentDTO;
  isRunActive?: boolean;
}

export function InventoryGrid({ items, equipment, isRunActive = false }: InventoryGridProps) {
  // Extract all equipped item definition IDs
  const equippedItemIds = new Set(
    Object.values(equipment)
      .filter((eq) => eq !== null)
      .map((eq) => eq.itemDefinitionId)
  );

  return (
    <section className="inventory-grid flex flex-col gap-3" aria-label="Inventario de materiales">
      {items.length === 0 ? (
        <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/70 p-8 text-center">
          <p className="font-mono text-sm uppercase tracking-wider text-zinc-300">Inventario sin materiales.</p>
          <p className="mt-2 text-xs text-zinc-500">Extraé runs para obtener chatarra y recursos de fabricación.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {items.map((item) => {
            const isEquipped = equippedItemIds.has(item.itemDefinitionId);
            return (
              <InventorySlot
                key={item.itemId}
                item={item}
                isEquipped={isEquipped}
                isRunActive={isRunActive}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
