import { InventoryItemDTO } from '../../types/dto.types';
import { ItemTooltip } from './ItemTooltip';
import { EquipButton } from './EquipButton';
import { ITEM_CATALOG } from '../../config/game.config';
import type { EquipmentSlotKey } from '@/config/equipment-slots.config';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { SalvageButton } from './SalvageButton';
import { getRarityVisuals } from '@/lib/utils/rarity';
import { cn } from '@/lib/utils/cn';
import { ItemRarityBadge } from './ItemRarityBadge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { buildTacticalComparisonRows, summarizeTacticalComparison } from '@/lib/utils/loadout-visuals';

interface InventorySlotProps {
  item: InventoryItemDTO;
  isEquipped: boolean;
  isRunActive?: boolean;
  expectedSlot?: EquipmentSlotKey;
  equippedReferenceItem?: InventoryItemDTO | null;
}

function getComparisonToneClass(tone: 'positive' | 'negative' | 'neutral'): string {
  if (tone === 'positive') {
    return 'text-emerald-300';
  }

  if (tone === 'negative') {
    return 'text-rose-300';
  }

  return 'text-zinc-300';
}

export function InventorySlot({
  item,
  isEquipped,
  isRunActive = false,
  expectedSlot,
  equippedReferenceItem = null,
}: InventorySlotProps) {
  const catalogDef = ITEM_CATALOG.find((catItem) => catItem.id === item.itemDefinitionId);
  const equipSlot = catalogDef?.equipmentSlot as EquipmentSlotKey | undefined;
  const rarityVisuals = getRarityVisuals(item.rarity);
  const isIncompatible = Boolean(item.isEquipable && expectedSlot && equipSlot && equipSlot !== expectedSlot);
  const isActionDisabled = isRunActive || isIncompatible;

  const comparisonRows =
    item.isEquipable && !isEquipped && equippedReferenceItem && !isIncompatible
      ? buildTacticalComparisonRows(item.configOptions, equippedReferenceItem.configOptions)
      : [];

  const comparisonSummary = summarizeTacticalComparison(comparisonRows);

  const comparisonSummaryLabel =
    comparisonSummary === 'upgrade'
      ? 'Ventaja táctica potencial'
      : comparisonSummary === 'downgrade'
        ? 'Posible downgrade táctico'
        : 'Paridad táctica';

  const disableReason = isRunActive
    ? 'EQUIPO_BLOQUEADO: EXPEDICIÓN_ACTIVA'
    : isIncompatible
      ? 'PIEZA_INCOMPATIBLE: SLOT_DISTINTO'
      : undefined;

  return (
    <Card
      className={cn(
        'relative flex h-full flex-col justify-between overflow-visible border-l-4 bg-zinc-950/70 transition-colors duration-200 hover:border-primary/60',
        rarityVisuals.borderClass,
        rarityVisuals.bgClass,
        isRunActive && 'border-amber-400/40 bg-amber-500/6',
        isIncompatible && 'border-violet-500/40 bg-violet-500/8',
      )}
    >
      <Tooltip>
        <TooltipTrigger
          className="w-full text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={`Ver detalles de ${item.displayName}`}
          title={`Inspeccionar ${item.displayName}`}
        >
          <CardContent className="p-4 pt-4 flex flex-col items-center w-full">
            <div className="mb-3 flex w-full items-start justify-between gap-2">
              <ItemRarityBadge rarity={item.rarity} />
              <div className="flex flex-wrap items-center justify-end gap-1">
                {isEquipped && (
                  <Badge
                    variant="outline"
                    className="border-cyan-400/50 bg-cyan-500/10 px-1.5 py-0 text-[10px] uppercase tracking-widest text-cyan-300"
                  >
                    Equipado
                  </Badge>
                )}
                {isRunActive && (
                  <Badge
                    variant="outline"
                    className="border-amber-400/50 bg-amber-500/12 px-1.5 py-0 text-[10px] uppercase tracking-widest text-amber-200"
                  >
                    Bloqueado
                  </Badge>
                )}
                {isIncompatible && (
                  <Badge
                    variant="outline"
                    className="border-violet-400/45 bg-violet-500/12 px-1.5 py-0 text-[10px] uppercase tracking-widest text-violet-200"
                  >
                    Incompatible
                  </Badge>
                )}
              </div>
            </div>

            <div className="relative mb-3 flex size-12 items-center justify-center border border-primary/20 bg-background/60 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
              <span className="text-3xl text-primary drop-shadow-[0_0_5px_rgba(0,243,255,0.6)]" aria-hidden="true" data-icon={item.iconKey}>
                ⬡
              </span>
              {item.quantity > 1 && (
                <Badge
                  variant="outline"
                  className="absolute -bottom-3 -right-3 border-primary/50 bg-background px-1.5 py-0 text-[10px] font-mono tracking-wider text-primary"
                >
                  x{item.quantity}
                </Badge>
              )}
            </div>

            <div className="mt-1 w-full flex flex-col gap-1 text-center">
              <div className="w-full truncate text-xs font-sans font-bold uppercase tracking-wide text-foreground" title={item.displayName}>
                {item.displayName}
              </div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {item.isEquipable && item.equipmentSlot ? item.equipmentSlot.replaceAll('_', ' ') : 'Material'}
              </p>
              <p className={cn('text-[10px] font-mono uppercase tracking-[0.2em]', rarityVisuals.accentClass)}>
                Inspeccionar
              </p>
            </div>

            {comparisonRows.length > 0 && (
              <div className="mt-3 w-full border-t border-white/10 pt-2 text-left">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">Comparativa táctica</p>
                <ul className="mt-1 flex flex-col gap-1 text-[10px] font-mono uppercase tracking-wider">
                  {comparisonRows.slice(0, 3).map((row) => (
                    <li key={row.metricKey} className="flex items-center justify-between rounded-sm border border-white/8 bg-black/20 px-1.5 py-1">
                      <span className="text-zinc-300">{row.label}</span>
                      <span className={cn('tabular-nums', getComparisonToneClass(row.tone))}>{row.deltaLabel}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">{comparisonSummaryLabel}</p>
              </div>
            )}
            {item.isEquipable && equippedReferenceItem && comparisonRows.length === 0 && !isEquipped && !isIncompatible && (
              <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                Sin diferencia frente al equipo actual
              </p>
            )}
          </CardContent>
        </TooltipTrigger>

        <TooltipContent side="top" align="start" sideOffset={8} className="block w-[min(calc(100vw-2rem),26rem)] max-w-[26rem] border-zinc-800 bg-zinc-950 p-0 text-zinc-100">
          <ItemTooltip item={item} />
        </TooltipContent>
      </Tooltip>

      <CardFooter
        className="p-2 w-full bg-background/40 border-t border-white/5 flex justify-center"
        title={disableReason}
      >
        {item.isEquipable && equipSlot ? (
          <EquipButton
            itemId={item.itemDefinitionId}
            slot={equipSlot}
            isEquipped={isEquipped}
            isDisabled={isActionDisabled}
            isIncompatible={isIncompatible}
            disableReason={disableReason}
          />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground/50 tracking-widest my-1">[ MATERIAL ]</span>
            <SalvageButton
              itemDefinitionId={item.itemDefinitionId}
              quantityAvailable={item.quantity}
              itemDisplayName={item.displayName}
              isRunActive={isRunActive}
            />
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
