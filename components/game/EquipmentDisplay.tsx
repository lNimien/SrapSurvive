import { EquipmentDTO, InventoryItemDTO } from '../../types/dto.types';
import { Card, CardContent } from '../ui/card';

// TOOL_SECONDARY is in the DB but NOT rendered in UI per spec (content-seed.md §7)
const VISIBLE_SLOTS: Array<{ key: keyof EquipmentDTO; label: string }> = [
  { key: 'HEAD', label: 'HEAD_UNIT' },
  { key: 'BODY', label: 'BODY_ARMOR' },
  { key: 'HANDS', label: 'SYNC_GLOVES' },
  { key: 'TOOL_PRIMARY', label: 'MAIN_TOOL' },
  { key: 'BACKPACK', label: 'STORAGE_CORE' },
];

const RARITY_GLOW_CLASS: Record<InventoryItemDTO['rarity'], string> = {
  COMMON: 'border-white/10 shadow-none',
  UNCOMMON: 'border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]',
  RARE: 'border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]',
  EPIC: 'border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.1)]',
  LEGENDARY: 'border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.1)]',
  CORRUPTED: 'border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
};

interface SlotDisplayProps {
  label: string;
  item: InventoryItemDTO | null;
}

function SlotDisplay({ label, item }: SlotDisplayProps) {
  const isEmpty = item === null;
  const rarityGlow = item ? RARITY_GLOW_CLASS[item.rarity] : 'border-white/5 opacity-50';

  return (
    <div
      className={`relative flex items-center gap-3 p-2 bg-background/40 border ${rarityGlow} transition-all group overflow-hidden`}
      aria-label={isEmpty ? `Slot de ${label} vacío` : `${label}: ${item.displayName}`}
      title={item ? `${item.displayName} — ${item.rarity}` : `${label} (vacío)`}
    >
      {/* Decorative side accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${item ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
      
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest leading-none mb-1">
          {label}
        </span>

        {item ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-primary drop-shadow-[0_0_3px_rgba(0,243,255,0.4)]" aria-hidden="true" data-icon={item.iconKey}>
              ⬡
            </span>
            <span className="text-xs font-sans font-bold text-foreground truncate tracking-wide">
              {item.displayName}
            </span>
          </div>
        ) : (
          <span className="text-[10px] font-mono text-muted-foreground/40 italic">-- OFFLINE --</span>
        )}
      </div>

      {item && (
        <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary/20 rounded-full animate-pulse" />
      )}
    </div>
  );
}

interface EquipmentDisplayProps {
  equipment: EquipmentDTO;
}

export function EquipmentDisplay({ equipment }: EquipmentDisplayProps) {
  return (
    <Card className="glass-panel border-primary/20 cyberpunk-box overflow-hidden">
      <div className="bg-primary/5 py-2 px-4 border-b border-primary/10 flex justify-between items-center">
        <h3 className="font-sans font-black text-xs text-primary uppercase tracking-[0.2em] neon-text-cyan flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-primary rounded-full inline-block" />
          Equipment_Loadout
        </h3>
        <span className="text-[9px] font-mono text-primary/40 uppercase">Safe_Mode_On</span>
      </div>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 gap-2">
          {VISIBLE_SLOTS.map(({ key, label }) => (
            <SlotDisplay key={key} label={label} item={equipment[key]} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
