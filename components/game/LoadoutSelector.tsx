import { EquipmentDTO, InventoryItemDTO } from '@/types/dto.types';
import { InventorySlot } from '@/components/game/InventorySlot';
import { EQUIPMENT_SLOT_LAYOUT } from '@/config/equipment-slots.config';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import {
  getTacticalSlotVisualMeta,
  resolveTacticalSlotVisualState,
} from '@/lib/utils/loadout-visuals';
import type { TacticalSlotVisualState } from '@/lib/utils/loadout-visuals';

interface LoadoutSelectorProps {
  items: InventoryItemDTO[];
  equipment: EquipmentDTO;
  isRunActive: boolean;
}

export function LoadoutSelector({ items, equipment, isRunActive }: LoadoutSelectorProps) {
  const tacticalStates: TacticalSlotVisualState[] = ['occupied', 'empty', 'blocked', 'incompatible'];

  return (
    <section className="flex flex-col gap-4" aria-label="Selector táctico de loadout">
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-primary/20 bg-black/25 p-3 sm:grid-cols-4" aria-label="Estados de slot">
        {tacticalStates.map((state) => {
          const meta = getTacticalSlotVisualMeta(state);
          return (
            <div key={state} className="rounded border border-white/10 bg-black/20 p-2">
              <Badge variant="outline" className={cn('text-[10px] uppercase tracking-[0.2em]', meta.badgeClass)}>
                {meta.label}
              </Badge>
              <p className="mt-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500">{meta.description}</p>
            </div>
          );
        })}
      </div>

      {EQUIPMENT_SLOT_LAYOUT.map((slot) => {
        const candidates = items.filter((item) => item.equipmentSlot === slot.key);
        const equippedItem = equipment[slot.key];
        const equippedDefId = equippedItem?.itemDefinitionId;
        const slotState = resolveTacticalSlotVisualState({
          isRunActive,
          hasEquippedItem: Boolean(equippedItem),
          candidateCount: candidates.length,
        });
        const slotVisualMeta = getTacticalSlotVisualMeta(slotState);

        return (
          <article
            key={slot.key}
            className={cn(
              'rounded-lg border p-4',
              'bg-black/20',
              slotVisualMeta.panelClass,
            )}
          >
            <header className="flex flex-col gap-2 border-b border-white/8 pb-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-1">
                <h3 className="text-xs font-mono uppercase tracking-widest text-primary/90">{slot.label}</h3>
                <p className="text-[11px] text-zinc-400">{slot.hint}</p>
                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Zona: {slot.shortLabel}</p>
              </div>
              <Badge variant="outline" className={cn('w-fit text-[10px] uppercase tracking-[0.2em]', slotVisualMeta.badgeClass)}>
                {slotVisualMeta.label}
              </Badge>
            </header>

            <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <aside className="rounded border border-white/8 bg-black/25 p-3">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">Pieza equipada</p>
                {equippedItem ? (
                  <>
                    <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-zinc-100">{equippedItem.displayName}</p>
                    <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                      {equippedItem.rarity} · {equippedItem.equipmentSlot?.replaceAll('_', ' ')}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-zinc-400">Sin pieza activa. Seleccioná una candidata para completar el slot.</p>
                )}
              </aside>

              <div>
                {candidates.length === 0 ? (
                  <div className="rounded border border-violet-500/20 bg-violet-500/8 p-3">
                    <p className="text-xs font-mono uppercase tracking-wider text-violet-200">
                      Sin piezas compatibles para este slot.
                    </p>
                    <p className="mt-1 text-[11px] text-violet-100/80">
                      Conseguí equipo de {slot.label.toLowerCase()} en expediciones para habilitar este módulo táctico.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {candidates.map((item) => (
                      <InventorySlot
                        key={item.itemId}
                        item={item}
                        isEquipped={equippedDefId === item.itemDefinitionId}
                        isRunActive={isRunActive}
                        expectedSlot={slot.key}
                        equippedReferenceItem={equippedItem}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
