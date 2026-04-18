'use client';

import { useTransition } from 'react';
import { RecipeDTO } from '../../types/dto.types';
import { craftItemAction } from '../../server/actions/inventory.actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Hammer, Package, Coins, CheckCircle2, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface RecipeCardProps {
  recipe: RecipeDTO;
  isRunActive: boolean;
}

export function RecipeCard({ recipe, isRunActive }: RecipeCardProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const canCraft = recipe.canAffordCC && recipe.canAffordMaterials && !isRunActive;

  const handleCraft = () => {
    if (!canCraft || isPending) return;

    startTransition(async () => {
      const result = await craftItemAction({ recipeId: recipe.id });

      if (result.success) {
        toast({
          title: "¡Fabricación Exitosa!",
          description: `Has fabricado: ${recipe.resultItem.displayName}`,
        });
      } else {
        toast({
          title: "Error de Fabricación",
          description: result.error.message,
          variant: "destructive",
        });
      }
    });
  };

  const rarityColorClass = `rarity-border-${recipe.resultItem.rarity.toLowerCase()}`;

  return (
    <Card className={cn(
      "glass-panel border-l-4 cyberpunk-box transition-all flex flex-col h-full",
      rarityColorClass,
      canCraft ? "hover:shadow-[0_0_20px_rgba(0,243,255,0.1)]" : "opacity-80"
    )}>
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-background/50 border border-border flex items-center justify-center shadow-[inset_0_0_10px_rgba(0,243,255,0.1)]">
              <span className="text-2xl text-primary drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]" aria-hidden="true" data-icon={recipe.resultItem.iconKey}>⬡</span>
            </div>
            <div>
              <h3 className="font-sans font-bold text-lg text-primary tracking-wide uppercase leading-tight">
                {recipe.resultItem.displayName}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] py-0 font-mono border-primary/30 text-primary/70">
                  {recipe.resultItem.equipmentSlot || "CONSUMABLE"}
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent className="glass-panel border-primary/30 p-2">
                      <p className="text-xs font-mono max-w-[200px]">{recipe.resultItem.description}</p>
                      {recipe.resultItem.configOptions && (
                         <div className="mt-2 text-[10px] border-t border-primary/20 pt-1 text-primary/60">
                            {Object.entries(recipe.resultItem.configOptions).map(([key, val]) => (
                                <div key={key} className="flex justify-between gap-4">
                                   <span>{key}:</span>
                                   <span>{val}</span>
                                </div>
                            ))}
                         </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 py-2 flex-grow">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Materiales Requeridos</span>
            <div className="h-[1px] flex-grow mx-3 bg-gradient-to-r from-primary/30 to-transparent" />
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {recipe.ingredients.map((ing) => {
              const hasEnough = ing.currentQuantity >= ing.requiredQuantity;
              return (
                <div key={ing.itemDefId} className={cn(
                  "flex items-center justify-between p-2 rounded border transition-colors",
                  hasEnough ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/30"
                )}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center bg-background/40 border border-white/5">
                       <span className="text-xs" data-icon={ing.iconKey}>⬡</span>
                    </div>
                    <span className={cn("text-xs font-mono", hasEnough ? "text-primary/90" : "text-destructive")}>
                      {ing.displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className={hasEnough ? "text-primary" : "text-destructive"}>{ing.currentQuantity}</span>
                    <span className="text-muted-foreground">/</span>
                    <span>{ing.requiredQuantity}</span>
                    {hasEnough ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-destructive" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between p-2 mt-4 bg-yellow-500/5 border border-yellow-500/20 rounded">
             <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-mono text-yellow-500/90 uppercase">Coste de Fabricación</span>
             </div>
             <div className="flex items-center gap-2 font-mono text-xs">
                <span className={recipe.canAffordCC ? "text-yellow-400" : "text-destructive"}>{recipe.costCC} CC</span>
                {!recipe.canAffordCC && <XCircle className="w-3 h-3 text-destructive" />}
             </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-2">
        <Button
          onClick={handleCraft}
          disabled={!canCraft || isPending}
          className={cn(
            "w-full font-sans font-bold tracking-widest uppercase transition-all py-6",
            canCraft 
              ? "bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-background hover:shadow-[0_0_20px_rgba(0,243,255,0.4)]" 
              : "opacity-50 grayscale bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {isPending ? (
            <div className="flex items-center gap-2">
              <span className="animate-pulse">Fabricando...</span>
            </div>
          ) : isRunActive ? (
            "No disponible en expedición"
          ) : !canCraft ? (
            "Recursos Insuficientes"
          ) : (
            <div className="flex items-center gap-2">
              <Hammer className="w-4 h-4" />
              <span>[ INICIAR FABRICACIÓN ]</span>
            </div>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
