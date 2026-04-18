'use client';

import { useState, useTransition, memo, useMemo, useCallback } from 'react';
import { InventoryItemDTO } from '../../types/dto.types';
import { sellItemsAction } from '../../server/actions/economy.actions';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { useToast } from '@/hooks/use-toast';

interface MarketItemCardProps {
  item: InventoryItemDTO & { currentPrice?: number };
  isRunActive: boolean;
}

// Sub-componente memorizado para evitar re-renders de la parte visual estática
const MarketItemVisuals = memo(({ item }: { item: InventoryItemDTO & { currentPrice?: number } }) => {
  const price = item.currentPrice ?? item.baseValue;
  const diff = price - item.baseValue;
  const percent = Math.round((diff / item.baseValue) * 100);
  
  return (
    <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-background/50 border border-border flex items-center justify-center shadow-[inset_0_0_10px_rgba(0,243,255,0.1)]">
          <span className="text-2xl text-primary drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]" aria-hidden="true" data-icon={item.iconKey}>⬡</span>
        </div>
        <div>
          <h3 className="font-sans font-bold text-lg text-primary tracking-wide uppercase leading-tight">{item.displayName}</h3>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-tighter">STOCK_{item.quantity}</p>
        </div>
      </div>
      <div className="text-right flex flex-col items-end">
        <span className="text-yellow-400 font-mono font-bold block bg-yellow-500/10 px-2 py-0.5 border border-yellow-500/20">{price} CC</span>
        {diff !== 0 && (
          <span className={`text-[10px] font-mono font-bold mt-1 ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {diff > 0 ? '▲' : '▼'} {Math.abs(percent)}%
          </span>
        )}
      </div>
    </CardHeader>
  );
});

MarketItemVisuals.displayName = 'MarketItemVisuals';

export function MarketItemCard({ item, isRunActive }: MarketItemCardProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [sellAmount, setSellAmount] = useState<number>(1);

  const visuallyDisabled = isPending || isRunActive;
  
  // Memorizar ganancias potenciales usando el precio dinámico si existe
  const effectivePrice = item.currentPrice ?? item.baseValue;
  const potentialEarnings = useMemo(() => sellAmount * effectivePrice, [sellAmount, effectivePrice]);

  const handleSell = useCallback(() => {
    if (visuallyDisabled) return;

    startTransition(async () => {
      const result = await sellItemsAction({
        itemDefinitionId: item.itemDefinitionId,
        amountToSell: sellAmount,
      });

      if (!result.success) {
        toast({
          title: "Venta Fallida",
          description: result.error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Venta Exitosa",
          description: `Has vendido x${sellAmount} de ${item.displayName} por ${potentialEarnings} CC.`
        });
        if (sellAmount < item.quantity) {
          setSellAmount(1);
        }
      }
    });
  }, [visuallyDisabled, item.itemDefinitionId, item.quantity, sellAmount]);

  const onSliderChange = useCallback((vals: number[]) => {
    if (vals && vals.length > 0) {
      setSellAmount(vals[0]);
    }
  }, []);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? 1 : Math.min(Math.max(1, Number(e.target.value)), item.quantity || 1);
    setSellAmount(val);
  }, [item.quantity]);

  // Clase de rareza memorizada
  const rarityColorClass = useMemo(() => `rarity-border-${item.rarity.toLowerCase()}`, [item.rarity]);

  // Array memorizado para Base UI Slider para evitar cancelación de arrastre por nueva de referencia
  const sliderValue = useMemo(() => [sellAmount], [sellAmount]);

  return (
    <Card className={`glass-panel border-l-4 ${rarityColorClass} cyberpunk-box transition-all hover:border-primary/50 hover:shadow-[0_0_20px_rgba(0,243,255,0.1)] flex flex-col justify-between`}>
      <MarketItemVisuals item={item} />

      <CardContent className="p-4 pt-2 pb-2">
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center gap-4">
             <Slider 
               min={1} 
               max={Math.max(2, item.quantity)} 
               step={1}
               orientation="horizontal"
               value={sliderValue}
               onValueChange={onSliderChange}
               disabled={visuallyDisabled || item.quantity < 2}
               className="flex-1"
             />
             <div className="relative">
               <input 
                 type="number"
                 min="1"
                 max={item.quantity || 1}
                 value={sellAmount}
                 onChange={onInputChange}
                 className="w-16 bg-background/50 border border-primary/30 outline-none text-center font-mono text-sm text-primary py-1"
                 disabled={visuallyDisabled}
               />
               <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary"></div>
             </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-2 flex flex-col gap-2">
        <Button
          onClick={handleSell}
          disabled={visuallyDisabled}
          variant="default"
          className={`w-full font-sans font-bold tracking-widest uppercase transition-all ${
            visuallyDisabled 
              ? 'opacity-50 grayscale cursor-not-allowed' 
              : 'hover:bg-green-500 hover:text-background hover:shadow-[0_0_15px_rgba(0,255,136,0.5)] bg-green-500/20 text-green-400 border border-green-500/50'
          }`}
        >
          {isPending ? 'Procesando...' : `[ TRASPASAR ${sellAmount} > +${potentialEarnings} CC ]`}
        </Button>
      </CardFooter>
    </Card>
  );
}
