'use client';

import { useTransition } from 'react';

import { salvageItemAction } from '@/server/actions/inventory.actions';
import { useToast } from '@/hooks/use-toast';

interface SalvageButtonProps {
  itemDefinitionId: string;
  quantityAvailable: number;
  itemDisplayName: string;
  isRunActive: boolean;
}

export function SalvageButton({
  itemDefinitionId,
  quantityAvailable,
  itemDisplayName,
  isRunActive,
}: SalvageButtonProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const isDisabled = isPending || isRunActive || quantityAvailable <= 0;

  const handleSalvage = () => {
    if (isDisabled) {
      return;
    }

    startTransition(async () => {
      const result = await salvageItemAction({
        itemDefinitionId,
        quantity: 1,
      });

      if (!result.success) {
        toast({
          title: 'Error de reciclaje',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Material reciclado',
        description: `+${result.data.creditsEarned} CC por 1 ${itemDisplayName}.`,
      });
    });
  };

  return (
    <button
      type="button"
      onClick={handleSalvage}
      disabled={isDisabled}
      aria-label={`Reciclar 1 unidad de ${itemDisplayName}`}
      title={isRunActive ? 'Reciclaje bloqueado durante expedición activa' : 'Reciclar 1 unidad'}
      className="rounded border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-amber-300 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? 'Reciclando...' : 'Reciclar +CC'}
    </button>
  );
}
