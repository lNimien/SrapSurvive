import { BuildSynergyDTO, EquipmentDTO, InventoryItemDTO } from '../../types/dto.types';
import { Card, CardContent } from '../ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { getPerkLines } from '@/lib/utils/item-perks';
import { cn } from '@/lib/utils/cn';
import { Badge } from '../ui/badge';

const SLOT_LAYOUT: Array<{ key: keyof EquipmentDTO; label: string; hint: string }> = [
  { key: 'HEAD', label: 'Casco', hint: 'Sensores y protección frontal' },
  { key: 'BODY', label: 'Armadura', hint: 'Protección principal del torso' },
  { key: 'HANDS', label: 'Guantes', hint: 'Control de precisión y extracción' },
  { key: 'TOOL_PRIMARY', label: 'Herramienta primaria', hint: 'Herramienta activa de run' },
  { key: 'TOOL_SECONDARY', label: 'Herramienta secundaria', hint: 'Soporte técnico de emergencia' },
  { key: 'BACKPACK', label: 'Mochila', hint: 'Capacidad y almacenamiento' },
];

function SlotChip({ label, item, hint }: { label: string; item: InventoryItemDTO | null; hint: string }) {
  const perkLines = getPerkLines(item?.configOptions);

  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          'w-full rounded-sm border px-3 py-2 text-left transition-colors',
          item
            ? 'border-primary/40 bg-primary/10 hover:bg-primary/15'
            : 'border-border bg-background/40 hover:bg-background/60',
        )}
        aria-label={item ? `${label}: ${item.displayName}` : `${label}: vacío`}
      >
        <p className="text-[10px] uppercase tracking-widest text-primary/70">{label}</p>
        <p className="text-xs font-semibold text-foreground truncate">{item ? item.displayName : 'Vacío'}</p>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-72">
        <p className="text-xs font-semibold">{item ? item.displayName : `Slot ${label}`}</p>
        <p className="text-[11px] text-muted-foreground">{item?.description ?? hint}</p>
        {item && (
          <>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-amber-300">{item.rarity}</p>
            <ul className="mt-2 space-y-1 text-[11px]">
              {perkLines.length > 0 ? (
                perkLines.map((perk) => <li key={perk}>• {perk}</li>)
              ) : (
                <li>• Sin perks adicionales</li>
              )}
            </ul>
          </>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

interface EquipmentDisplayProps {
  equipment: EquipmentDTO;
  activeSynergies?: BuildSynergyDTO[];
  activeArchetype?: BuildSynergyDTO | null;
}

export function EquipmentDisplay({ equipment, activeSynergies = [], activeArchetype = null }: EquipmentDisplayProps) {
  return (
    <Card className="glass-panel border-primary/20 cyberpunk-box overflow-hidden">
      <div className="bg-primary/5 py-2 px-4 border-b border-primary/10 flex justify-between items-center">
        <h3 className="font-sans font-black text-xs text-primary uppercase tracking-[0.2em] neon-text-cyan">
          Carga del chatarrero
        </h3>
      </div>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 gap-3" role="list" aria-label="Loadout vertical del personaje">
          {SLOT_LAYOUT.map(({ key, label, hint }) => (
            <div key={key} role="listitem">
              <SlotChip label={label} hint={hint} item={equipment[key]} />
            </div>
          ))}
        </div>

        {activeArchetype && (
          <div className="mt-4 rounded-sm border border-primary/30 bg-primary/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-primary/70">Arquetipo activo</p>
            <p className="text-xs font-semibold text-foreground">{activeArchetype.name}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{activeArchetype.description}</p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2" aria-label="Sinergias activas">
          {activeSynergies.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Sin sinergias activas.</p>
          ) : (
            activeSynergies.map((synergy) => (
              <Badge
                key={synergy.id}
                variant="outline"
                className={cn(
                  'text-[10px] uppercase tracking-wider border-primary/40 text-primary',
                  synergy.isArchetype && 'bg-primary/20 text-foreground',
                )}
                aria-label={`Sinergia activa: ${synergy.name}`}
              >
                {synergy.name}
              </Badge>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
