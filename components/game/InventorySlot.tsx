import { InventoryItemDTO } from '../../types/dto.types';
import { ItemTooltip } from './ItemTooltip';
import { EquipButton } from './EquipButton';
import { ITEM_CATALOG } from '../../config/game.config';
import { EquipmentSlotKey } from '../../types/game.types';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { SalvageButton } from './SalvageButton';
import { getRarityVisuals } from '@/lib/utils/rarity';

interface InventorySlotProps {
  item: InventoryItemDTO;
  isEquipped: boolean;
  isRunActive?: boolean;
}

export function InventorySlot({ item, isEquipped, isRunActive = false }: InventorySlotProps) {
  // Encontrar el slot válido del catálogo
  const catalogDef = ITEM_CATALOG.find((catItem) => catItem.id === item.itemDefinitionId);
  const equipSlot = catalogDef?.equipmentSlot as EquipmentSlotKey | undefined;
  const rarityVisuals = getRarityVisuals(item.rarity);

  return (
    <Card className={`group relative flex flex-col items-center justify-between overflow-visible glass-panel border-l-4 ${rarityVisuals.borderClass} ${rarityVisuals.bgClass} transition-all hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(0,243,255,0.2)] cyberpunk-box`}>
      
      <CardContent className="p-4 pt-4 flex flex-col items-center w-full">
        {/* Icono + Cantidad */}
        <div className="relative mb-3 flex items-center justify-center w-12 h-12 bg-background/60 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)] border border-primary/20">
          <span className="text-3xl text-primary drop-shadow-[0_0_5px_rgba(0,243,255,0.6)]" aria-hidden="true" data-icon={item.iconKey}>
            ⬡
          </span>
          {item.quantity > 1 && (
            <Badge variant="outline" className="absolute -bottom-3 -right-3 bg-background border-primary/50 text-primary px-1.5 py-0 text-[10px] font-mono tracking-wider">
              x{item.quantity}
            </Badge>
          )}
        </div>

        <div className="text-center w-full mt-1">
          <div className="text-xs font-sans font-bold uppercase truncate-text w-full text-foreground tracking-wide">
            {item.displayName}
          </div>
        </div>

        {/* Tooltip on hover */}
        <ItemTooltip item={item} />
      </CardContent>

      <CardFooter 
        className="p-2 w-full bg-background/40 border-t border-white/5 flex justify-center" 
        title={isRunActive ? "EQUIPO_BLOQUEADO: EXPEDICIÓN_ACTIVA" : undefined}
      >
        {item.isEquipable && equipSlot ? (
          <EquipButton 
            itemId={item.itemDefinitionId} 
            slot={equipSlot} 
            isEquipped={isEquipped} 
            isDisabled={isRunActive}
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
