'use client';

import { useState } from 'react';

import { AccountUpgradeDTO } from '@/types/dto.types';
import { purchaseUpgradeAction } from '@/server/actions/upgrades.actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cpu, ShieldCheck, TrendingUp } from 'lucide-react';

interface UpgradesPanelProps {
  upgrades: AccountUpgradeDTO[];
}

function getEffectsLabel(upgrade: AccountUpgradeDTO): string[] {
  const labels: string[] = [];

  if (upgrade.effects.baseRateMultiplier !== undefined) {
    labels.push(`Riesgo base x${upgrade.effects.baseRateMultiplier.toFixed(2)}`);
  }
  if (upgrade.effects.quadraticFactorMultiplier !== undefined) {
    labels.push(`Escalada cuadrática x${upgrade.effects.quadraticFactorMultiplier.toFixed(2)}`);
  }
  if (upgrade.effects.catastropheThresholdBonus !== undefined) {
    labels.push(`Umbral catástrofe +${upgrade.effects.catastropheThresholdBonus.toFixed(2)}`);
  }
  if (upgrade.effects.dangerLootBonusMultiplier !== undefined) {
    labels.push(`Bonus botín x${upgrade.effects.dangerLootBonusMultiplier.toFixed(2)}`);
  }

  return labels;
}

export function UpgradesPanel({ upgrades }: UpgradesPanelProps) {
  const { toast } = useToast();
  const [loadingUpgradeId, setLoadingUpgradeId] = useState<string | null>(null);

  const upgradesSorted = [...upgrades].sort((left, right) => {
    const priority = (upgrade: AccountUpgradeDTO) => {
      if (!upgrade.purchased && upgrade.affordable) return 0;
      if (!upgrade.purchased && !upgrade.affordable) return 1;
      return 2;
    };

    const byPriority = priority(left) - priority(right);
    if (byPriority !== 0) {
      return byPriority;
    }

    return left.costCC - right.costCC;
  });

  const purchasableNow = upgrades.filter((upgrade) => !upgrade.purchased && upgrade.affordable).length;

  const handlePurchase = async (upgradeId: string) => {
    setLoadingUpgradeId(upgradeId);
    try {
      const result = await purchaseUpgradeAction({ upgradeId });

      if (result.success) {
        toast({
          title: 'Mejora comprada',
          description: `Compra registrada. Balance actual: ${result.data.newBalance} CC.`,
        });
        return;
      }

      toast({
        title: 'Compra rechazada',
        description: result.error.message,
        variant: 'destructive',
      });
    } catch {
      toast({
        title: 'Error de red',
        description: 'No se pudo completar la compra de mejora.',
        variant: 'destructive',
      });
    } finally {
      setLoadingUpgradeId(null);
    }
  };

  return (
    <Card className="glass-panel border-primary/20 cyberpunk-box">
      <CardHeader className="pb-3">
        <CardTitle className="font-sans text-lg uppercase tracking-widest text-primary flex items-center gap-2">
          <Cpu className="w-4 h-4" aria-hidden="true" />
          Mejoras Persistentes
        </CardTitle>
        <CardDescription className="font-mono text-xs uppercase tracking-wider text-primary/60">
          Bonos permanentes aplicados en el snapshot de run.
        </CardDescription>
        <p className="font-mono text-[11px] uppercase tracking-wider text-cyan-300">
          {purchasableNow > 0 ? `${purchasableNow} mejoras disponibles ahora` : 'Sin mejoras comprables por ahora'}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {upgradesSorted.map((upgrade) => {
          const effectLabels = getEffectsLabel(upgrade);
          const isLoading = loadingUpgradeId === upgrade.id;

          return (
            <div
              key={upgrade.id}
              className="border border-primary/20 bg-primary/5 rounded-sm p-3 space-y-3"
              aria-label={`Mejora ${upgrade.displayName}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-sans text-sm font-semibold uppercase tracking-wide text-foreground">
                      {upgrade.displayName}
                    </h3>
                    {upgrade.purchased && (
                      <Badge className="bg-green-500/10 border-green-500/30 text-green-400" variant="outline">
                        Activa
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{upgrade.description}</p>
                </div>
                <div className="text-right font-mono text-xs text-yellow-400">{upgrade.costCC} CC</div>
              </div>

              <ul className="space-y-1 text-[11px] text-primary/80 font-mono" aria-label="Efectos de la mejora">
                {effectLabels.map((effect) => (
                  <li key={effect} className="flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3" aria-hidden="true" />
                    <span>{effect}</span>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full border-primary/40 hover:bg-primary/10"
                onClick={() => handlePurchase(upgrade.id)}
                disabled={isLoading || upgrade.purchased || !upgrade.affordable}
                aria-label={`Comprar mejora ${upgrade.displayName}`}
              >
                {upgrade.purchased ? (
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    Comprada
                  </span>
                ) : isLoading ? (
                  'Procesando...'
                ) : upgrade.affordable ? (
                  'Comprar'
                ) : (
                  'CC insuficiente'
                )}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
