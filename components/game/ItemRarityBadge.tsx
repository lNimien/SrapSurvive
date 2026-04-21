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
  const tierLabel = getTierLabel(rarity);

  return (
    <Badge
      variant="outline"
      aria-label={`Rareza ${tierLabel}`}
      className={cn(
        'text-[10px] uppercase tracking-[0.2em] font-mono px-2 py-0.5 border',
        rarityVisuals.badgeClass,
        className,
      )}
    >
      {tierLabel}
    </Badge>
  );
}
