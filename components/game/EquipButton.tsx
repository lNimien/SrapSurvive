'use client';

import { useTransition } from 'react';
import { equipItemAction, unequipItemAction } from '../../server/actions/inventory.actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import type { EquipmentSlotKey } from '@/config/equipment-slots.config';

interface EquipButtonProps {
  itemId: string;
  slot: EquipmentSlotKey;
  isEquipped: boolean;
  isDisabled?: boolean;
  isIncompatible?: boolean;
  disableReason?: string;
}

export function EquipButton({
  itemId,
  slot,
  isEquipped,
  isDisabled = false,
  isIncompatible = false,
  disableReason,
}: EquipButtonProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const visuallyDisabled = isPending || isDisabled;

  const handleAction = () => {
    if (visuallyDisabled) return;

    startTransition(async () => {
      const result = isEquipped
        ? await unequipItemAction({ slot })
        : await equipItemAction({ slot, itemDefinitionId: itemId });

      if (!result.success) {
        toast({
          title: 'Fallo en equipamiento',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: isEquipped ? 'Pieza retirada' : 'Pieza equipada',
        description: isEquipped
          ? 'El slot táctico quedó disponible para una nueva configuración.'
          : 'Configuración de loadout actualizada y sincronizada en servidor.',
        variant: 'success',
      });
    });
  };

  const buttonLabel = isPending ? 'Procesando...' : isIncompatible ? 'Incompatible' : isEquipped ? 'Quitar' : 'Equipar';

  return (
    <Button
      type="button"
      onClick={handleAction}
      disabled={visuallyDisabled}
      variant={isEquipped ? 'destructive' : 'outline'}
      size="sm"
      title={disableReason}
      aria-label={`${buttonLabel} slot ${slot.replaceAll('_', ' ')}`}
      className="w-full border-primary/30 bg-background/70 font-mono text-[10px] uppercase tracking-[0.18em] hover:bg-primary/10 disabled:border-muted-foreground/30"
    >
      {buttonLabel}
    </Button>
  );
}
