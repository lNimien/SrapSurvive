import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { getRarityVisuals, getTierLabel } from '@/lib/utils/rarity';
import { ItemRarityDTO } from '@/types/dto.types';

interface ItemRarityBadgeProps {
  rarity: ItemRarityDTO;
  className?: string;
}

export function ItemRarityBadge({ rarity, className }: ItemRarityBadgeProps) {
  const rarityVisuals = getRarityVisuals(rarity);

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] uppercase tracking-widest font-mono px-1.5 py-0 border',
        rarityVisuals.textClass,
        className,
      )}
    >
      {getTierLabel(rarity)}
    </Badge>
  );
}
