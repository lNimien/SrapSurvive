'use client';

import { useState, useTransition, useMemo, useCallback } from 'react';
import { ItemDefinition } from '../../types/game.types';
import { buyItemAction } from '../../server/actions/economy.actions';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { getRarityVisuals } from '@/lib/utils/rarity';
import { ItemRarityBadge } from './ItemRarityBadge';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils/cn';

interface VendorItemCardProps {
  item: ItemDefinition;
  priceCC: number;
  currentBalance: number;
  isRunActive: boolean;
}

export function VendorItemCard({ item, priceCC, currentBalance, isRunActive }: VendorItemCardProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const canAfford = currentBalance >= priceCC;
  const visuallyDisabled = isPending || isRunActive;

  const handleBuy = useCallback(() => {
    if (visuallyDisabled || !canAfford) return;

    startTransition(async () => {
      const result = await buyItemAction({ itemDefinitionId: item.id });

      if (result.success) {
        toast({
          title: "Compra Exitosa",
          description: `Has adquirido ${item.displayName}.`,
        });
      } else {
        toast({
          title: "Error en la compra",
          description: result.error.message,
          variant: "destructive",
        });
      }
    });
  }, [visuallyDisabled, canAfford, item.id, item.displayName, toast]);

  const rarityVisuals = useMemo(() => getRarityVisuals(item.rarity), [item.rarity]);

  return (
    <Card className={cn('glass-panel border-l-4 cyberpunk-box transition-all hover:border-primary/50 hover:shadow-[0_0_20px_rgba(0,243,255,0.1)] flex flex-col justify-between h-full', rarityVisuals.borderClass, rarityVisuals.bgClass)}>
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-background/50 border border-border flex items-center justify-center shadow-[inset_0_0_10px_rgba(0,243,255,0.1)]">
            <span className="text-2xl text-primary drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]" aria-hidden="true" data-icon={item.iconKey}>⬡</span>
          </div>
          <div>
            <h3 className="font-sans font-bold text-lg text-primary tracking-wide uppercase leading-tight">{item.displayName}</h3>
            <div className="mt-1 flex items-center gap-1.5">
              <ItemRarityBadge rarity={item.rarity} className="py-0" />
              <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter border-zinc-600">
                {item.itemType}
              </Badge>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-yellow-500 font-mono font-bold block bg-yellow-500/10 px-2 py-0.5 border border-yellow-500/20">{priceCC} CC</span>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-grow">
        <p className="text-xs text-primary/70 font-mono leading-relaxed mt-2 italic">
          "{item.description}"
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-2">
        <Button
          onClick={handleBuy}
          disabled={visuallyDisabled || !canAfford}
          variant="default"
          className={`w-full font-sans font-bold tracking-widest uppercase transition-all ${
            visuallyDisabled || !canAfford
              ? 'opacity-50 grayscale cursor-not-allowed' 
              : 'hover:bg-primary hover:text-background hover:shadow-[0_0_15px_rgba(0,243,255,0.5)] bg-primary/20 text-primary border border-primary/50'
          }`}
        >
          {isPending ? 'Procesando...' : !canAfford ? 'CRÉDITOS INSUFICIENTES' : `[ ADQUIRIR ]`}
        </Button>
      </CardFooter>
    </Card>
  );
}
