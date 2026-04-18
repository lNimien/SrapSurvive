'use client';

import { useTransition } from 'react';
import { equipItemAction, unequipItemAction } from '../../server/actions/inventory.actions';
import { EquipmentSlotKey } from '../../types/game.types';
import { useToast } from '@/hooks/use-toast';

interface EquipButtonProps {
  itemId: string;
  slot: EquipmentSlotKey;
  isEquipped: boolean;
  isDisabled?: boolean;
}

export function EquipButton({ itemId, slot, isEquipped, isDisabled = false }: EquipButtonProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  const visuallyDisabled = isPending || isDisabled;

  const handleAction = () => {
    if (visuallyDisabled) return;

    startTransition(async () => {
      const action = isEquipped ? unequipItemAction : equipItemAction;
      const input = isEquipped ? { slot } : { slot, itemDefinitionId: itemId };
      
      const result = await action(input as any);
      
      if (!result.success) {
        toast({
          title: "Fallo en Equipamiento",
          description: result.error.message,
          variant: "destructive"
        });
      }
    });
  };

  return (
    <button
      onClick={handleAction}
      disabled={visuallyDisabled}
      className={`equip-btn ${visuallyDisabled ? 'opacity-50 cursor-not-allowed' : ''} ${
        isEquipped ? 'bg-red-900 border-red-500 hover:bg-red-800' : 'bg-green-900 border-green-500 hover:bg-green-800'
      } text-white px-3 py-1 rounded text-xs border mono uppercase transition-colors`}
    >
      {isPending ? 'Procesando...' : isEquipped ? 'Desequipar' : 'Equipar'}
    </button>
  );
}
