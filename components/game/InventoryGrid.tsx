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
    <section className="inventory-grid" aria-label="Inventario">
      {items.length === 0 ? (
        <div className="p-8 text-center border border-gray-700 bg-gray-800 rounded">
          <p className="text-gray-400 font-mono text-sm">Tu inventario está vacío.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
