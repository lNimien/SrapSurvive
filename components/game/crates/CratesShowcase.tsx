'use client';

import { useMemo, useState, useTransition } from 'react';
import { CrateDTO, CrateOpenResultDTO } from '@/types/dto.types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { Coins, Gift, Lock, Sparkles } from 'lucide-react';
import { openCrateAction } from '@/server/actions/crates.actions';
import { useToast } from '@/hooks/use-toast';
import { getTierLabel } from '@/lib/utils/rarity';
import Image from 'next/image';

interface CratesShowcaseProps {
  crates: CrateDTO[];
  currencyBalance: number;
}

type OpenStage = 'idle' | 'rolling' | 'revealed';

const VISUAL_TIER_CLASS: Record<CrateDTO['visualTier'], string> = {
  SCAVENGER: 'border-zinc-400/40 bg-zinc-500/10',
  TACTICAL: 'border-cyan-400/40 bg-cyan-500/10',
  RELIC: 'border-amber-400/40 bg-amber-500/10',
};

const VISUAL_TIER_BADGE: Record<CrateDTO['visualTier'], string> = {
  SCAVENGER: 'border-zinc-400/50 text-zinc-200 bg-zinc-500/10',
  TACTICAL: 'border-cyan-400/50 text-cyan-200 bg-cyan-500/10',
  RELIC: 'border-amber-400/50 text-amber-200 bg-amber-500/10',
};

const CRATE_DYNAMIC_INCREMENT_PERCENT = 12;
const CRATE_DYNAMIC_CAP_PERCENT = 220;

function computeDynamicPrice(basePriceCC: number, dailyOpenCount: number): number {
  const multiplier = Math.min(1 + (CRATE_DYNAMIC_INCREMENT_PERCENT / 100) * Math.max(0, dailyOpenCount), CRATE_DYNAMIC_CAP_PERCENT / 100);
  return Math.max(1, Math.round(basePriceCC * multiplier));
}

export function CratesShowcase({ crates, currencyBalance }: CratesShowcaseProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [localCrates, setLocalCrates] = useState<CrateDTO[]>(crates);
  const [localBalance, setLocalBalance] = useState<number>(currencyBalance);
  const [activeCrateId, setActiveCrateId] = useState<string | null>(null);
  const [openStage, setOpenStage] = useState<OpenStage>('idle');
  const [rollingLabel, setRollingLabel] = useState<string>('Calibrando compuerta...');
  const [openResult, setOpenResult] = useState<CrateOpenResultDTO | null>(null);

  const activeCrate = useMemo(
    () => localCrates.find((crate) => crate.id === activeCrateId) ?? null,
    [activeCrateId, localCrates],
  );

  const startOpening = (crate: CrateDTO) => {
    if (!crate.unlocked || isPending) return;

    setActiveCrateId(crate.id);
    setOpenStage('rolling');
    setOpenResult(null);

    startTransition(async () => {
      const rollingPool = crate.rewards.map((reward) => reward.displayName);
      let tick = 0;
      const rollingInterval = setInterval(() => {
        const next = rollingPool[tick % rollingPool.length] ?? crate.name;
        setRollingLabel(next);
        tick += 1;
      }, 110);

      const minAnimation = new Promise((resolve) => setTimeout(resolve, 2100));
      const actionResult = await openCrateAction({ crateId: crate.id });
      await minAnimation;
      clearInterval(rollingInterval);

      if (!actionResult.success) {
        setOpenStage('idle');
        setActiveCrateId(null);
        toast({
          title: 'Apertura fallida',
          description: actionResult.error.message,
          variant: 'destructive',
        });
        return;
      }

      setOpenResult(actionResult.data);
      setLocalBalance(actionResult.data.newBalance);
      setLocalCrates((current) => current.map((candidate) => {
        const nextDailyOpenCount = actionResult.data.dailyOpenCount;
        const isOpenedCrate = candidate.id === crate.id;

        return {
          ...candidate,
          dailyOpenCount: nextDailyOpenCount,
          currentPriceCC: isOpenedCrate
            ? actionResult.data.nextPriceCC
            : computeDynamicPrice(candidate.priceCC, nextDailyOpenCount),
          nextPriceCC: computeDynamicPrice(candidate.priceCC, nextDailyOpenCount + 1),
          pityToEpic: isOpenedCrate ? actionResult.data.pityToEpic : candidate.pityToEpic,
        };
      }));
      setOpenStage('revealed');
    });
  };

  const closeOverlay = () => {
    setActiveCrateId(null);
    setOpenStage('idle');
    setOpenResult(null);
  };

  const canOpenAgain = Boolean(
    activeCrate
    && activeCrate.unlocked
    && localBalance >= activeCrate.currentPriceCC
    && !isPending,
  );

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {localCrates.map((crate) => {
          const affordable = localBalance >= crate.currentPriceCC;
          const disabled = !crate.unlocked || !affordable || isPending;

          return (
            <Card
              key={crate.id}
              className={cn(
                'group border transition-all duration-200 hover:shadow-[0_0_35px_-15px_rgba(0,243,255,0.6)]',
                VISUAL_TIER_CLASS[crate.visualTier],
              )}
            >
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={cn('text-[10px] uppercase tracking-widest', VISUAL_TIER_BADGE[crate.visualTier])}>
                    {crate.visualTier}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-primary/20 text-primary/80">
                    NV {crate.minLevel}+
                  </Badge>
                </div>
                <div className="relative h-24 rounded-md border border-primary/20 overflow-hidden bg-black/30 flex items-center justify-center">
                  <Image src={crate.imagePath} alt={crate.name} fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover opacity-85" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </div>
                <CardTitle className="text-lg font-bold uppercase tracking-wide text-primary">{crate.name}</CardTitle>
                <CardDescription className="text-xs font-mono text-muted-foreground leading-relaxed">
                  {crate.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
                  <span className="text-[10px] uppercase tracking-widest text-yellow-300/70 font-mono">Precio</span>
                  <span className="text-sm font-mono text-yellow-300 flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5" /> {crate.currentPriceCC} CC
                  </span>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground">
                  Base {crate.priceCC} CC · Próxima {crate.nextPriceCC} CC · Abiertas hoy {crate.dailyOpenCount}
                </p>
                <p className="text-[10px] font-mono text-fuchsia-200/90">
                  Pity EPIC+: {crate.pityToEpic === 0 ? 'activa en próxima apertura' : `${crate.pityToEpic} apertura(s)`}
                </p>
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-widest text-primary/70 font-mono">Drops destacados</p>
                  <ul className="space-y-1">
                    {crate.rewards.slice(0, 4).map((reward) => (
                      <li key={`${crate.id}-${reward.itemDefinitionId}`} className="text-xs flex items-center justify-between border border-primary/10 bg-primary/5 px-2 py-1">
                        <span className="truncate pr-2">{reward.displayName}</span>
                        <span className="font-mono text-[10px] text-primary/80">{reward.probabilityPercent}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  className="w-full uppercase tracking-wider font-semibold"
                  disabled={disabled}
                  onClick={() => startOpening(crate)}
                >
                  {!crate.unlocked ? (
                    <>
                      <Lock className="mr-2 h-4 w-4" /> Bloqueada
                    </>
                  ) : !affordable ? (
                    'Fondos insuficientes'
                  ) : (
                    <>
                      <Gift className="mr-2 h-4 w-4" /> Abrir caja
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {activeCrate && openStage !== 'idle' && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl border border-primary/30 bg-background/95 p-6 shadow-[0_0_60px_-20px_rgba(0,243,255,0.65)]">
            {openStage === 'rolling' && (
              <div className="space-y-6 text-center animate-in fade-in duration-300">
                <p className="text-xs uppercase tracking-[0.25em] text-primary/80 font-mono">Secuencia de apertura en curso</p>
                <div className="h-28 border border-primary/25 bg-primary/5 flex items-center justify-center">
                  <p className="text-2xl font-bold uppercase tracking-wider text-primary animate-pulse">{rollingLabel}</p>
                </div>
                <p className="text-xs font-mono text-muted-foreground">
                  Descompresión de cerradura • lectura cuántica • validación de drop table
                </p>
              </div>
            )}

            {openStage === 'revealed' && openResult && (
              <div className="space-y-5 text-center animate-in zoom-in-95 duration-300">
                <p className="text-xs uppercase tracking-[0.2em] text-primary/80 font-mono">Recompensa confirmada</p>
                <div className="border border-primary/30 bg-primary/10 px-6 py-8">
                  <div className="mx-auto mb-3 h-16 w-16 border border-primary/30 bg-primary/5 flex items-center justify-center text-primary text-3xl">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <p className="text-xl font-black uppercase tracking-wide text-primary">{openResult.reward.displayName}</p>
                  <p className="mt-2 text-sm font-mono text-muted-foreground">
                    Cantidad: x{openResult.reward.quantity} • Tier: {getTierLabel(openResult.reward.rarity)}
                  </p>
                  <p className="mt-3 text-xs font-mono text-yellow-300">Nuevo balance: {openResult.newBalance} CC</p>
                  <p className="mt-1 text-[11px] font-mono text-fuchsia-200">
                    Próximo costo: {openResult.nextPriceCC} CC · Pity restante: {openResult.pityToEpic}/{openResult.pityThreshold}
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
                  <Button
                    onClick={() => {
                      if (!activeCrate) {
                        return;
                      }

                      startOpening(activeCrate);
                    }}
                    className="uppercase tracking-wider font-semibold px-8"
                    disabled={!canOpenAgain}
                    aria-label="Abrir la misma caja nuevamente"
                  >
                    Abrir de nuevo
                  </Button>
                  <Button onClick={closeOverlay} variant="outline" className="uppercase tracking-wider font-semibold px-8">
                    Continuar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
