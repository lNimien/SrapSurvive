'use client';

import { useState, useTransition } from 'react';
import { InventoryItemDTO } from '../../types/dto.types';
import { sellItemsAction } from '../../server/actions/economy.actions';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';

interface MarketItemCardProps {
  item: InventoryItemDTO;
  isRunActive: boolean;
}

export function MarketItemCard({ item, isRunActive }: MarketItemCardProps) {
  const [isPending, startTransition] = useTransition();
  const [sellAmount, setSellAmount] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const visuallyDisabled = isPending || isRunActive;
  const potentialEarnings = sellAmount * item.baseValue;

  const handleSell = () => {
    if (visuallyDisabled) return;
    setErrorMsg(null);

    startTransition(async () => {
      const result = await sellItemsAction({
        itemDefinitionId: item.itemDefinitionId,
        amountToSell: sellAmount,
      });

      if (!result.success) {
        setErrorMsg(result.error.message);
      } else {
        if (sellAmount < item.quantity) {
          setSellAmount(1);
        }
      }
    });
  };

  const rarityColorClass = `rarity-border-${item.rarity.toLowerCase()}`;

  return (
    <Card className={`glass-panel border-l-4 ${rarityColorClass} cyberpunk-box transition-all hover:scale-[1.02] flex flex-col justify-between`}>
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-3">
          {/* Icon frame */}
          <div className="w-12 h-12 bg-background/50 border border-border flex items-center justify-center shadow-[inset_0_0_10px_rgba(0,243,255,0.1)]">
            <span className="text-2xl text-primary drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]" aria-hidden="true" data-icon={item.iconKey}>⬡</span>
          </div>
          <div>
            <h3 className="font-sans font-bold text-lg text-primary tracking-wide uppercase leading-tight">{item.displayName}</h3>
            <p className="text-xs text-muted-foreground font-mono">STOCK_{item.quantity}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-yellow-400 font-mono font-bold block bg-yellow-500/10 px-2 py-0.5 border border-yellow-500/20">{item.baseValue} CC</span>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 pb-2">
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center gap-4">
             <Slider 
               min={1} 
               max={item.quantity} 
               step={1}
               value={[sellAmount]}
               onValueChange={(vals) => setSellAmount(vals[0])}
               disabled={visuallyDisabled}
               className="flex-1"
             />
             <div className="relative">
               <input 
                 type="number"
                 min="1"
                 max={item.quantity}
                 value={sellAmount}
                 onChange={(e) => setSellAmount(Math.min(Math.max(1, Number(e.target.value)), item.quantity))}
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

        {errorMsg && <p className="text-destructive font-mono text-xs mt-1 text-center bg-destructive/10 border border-destructive/20 py-1">{errorMsg}</p>}
      </CardFooter>
    </Card>
  );
}
