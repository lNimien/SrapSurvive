import { EquipmentDTO, InventoryItemDTO } from '@/types/dto.types';
import { InventorySlot } from '@/components/game/InventorySlot';

const SLOT_LAYOUT = [
  { key: 'HEAD', label: 'Cabeza' },
  { key: 'BODY', label: 'Torso' },
  { key: 'HANDS', label: 'Manos' },
  { key: 'TOOL_PRIMARY', label: 'Herramienta Primaria' },
  { key: 'TOOL_SECONDARY', label: 'Herramienta Secundaria' },
  { key: 'BACKPACK', label: 'Mochila' },
] as const;

interface LoadoutSelectorProps {
  items: InventoryItemDTO[];
  equipment: EquipmentDTO;
  isRunActive: boolean;
}

export function LoadoutSelector({ items, equipment, isRunActive }: LoadoutSelectorProps) {
  return (
    <section className="space-y-4" aria-label="Selector táctico de loadout">
      {SLOT_LAYOUT.map((slot) => {
        const candidates = items.filter((item) => item.equipmentSlot === slot.key);
        const equippedDefId = equipment[slot.key]?.itemDefinitionId;

        return (
          <article key={slot.key} className="border border-primary/20 bg-primary/5 p-4 space-y-3">
            <header className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-mono uppercase tracking-widest text-primary/80">{slot.label}</h3>
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                {equippedDefId ? 'Equipado' : 'Sin equipar'}
              </span>
            </header>

            {candidates.length === 0 ? (
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                No hay piezas para este slot.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {candidates.map((item) => (
                  <InventorySlot
                    key={item.itemId}
                    item={item}
                    isEquipped={equippedDefId === item.itemDefinitionId}
                    isRunActive={isRunActive}
                  />
                ))}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
