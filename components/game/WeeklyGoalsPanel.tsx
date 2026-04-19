'use client';

import { useState } from 'react';

import { WeeklyGoalsDTO } from '@/types/dto.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { claimWeeklyDirectiveAction } from '@/server/actions/liveops.actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils/cn';

interface WeeklyGoalsPanelProps {
  weeklyGoals: WeeklyGoalsDTO;
}

export function WeeklyGoalsPanel({ weeklyGoals }: WeeklyGoalsPanelProps) {
  const { toast } = useToast();
  const [loadingDirectiveKey, setLoadingDirectiveKey] = useState<string | null>(null);

  const claimableCount = weeklyGoals.directives.filter((directive) => directive.claimable).length;

  const handleClaimDirective = async (directiveKey: string) => {
    setLoadingDirectiveKey(directiveKey);

    try {
      const result = await claimWeeklyDirectiveAction({
        directiveKey,
        weekStart: weeklyGoals.weekStart,
      });

      if (result.success) {
        toast({
          title: result.data.alreadyClaimed ? 'Recompensa ya reclamada' : 'Directiva reclamada',
          description: result.data.alreadyClaimed
            ? 'Este objetivo semanal ya estaba reclamado. No se aplicaron cambios duplicados.'
            : `+${result.data.rewardCC} CC y +${result.data.rewardXP} XP aplicados.`,
        });
      } else {
        toast({
          title: 'No se pudo reclamar',
          description: result.error.message,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error de red',
        description: 'No fue posible reclamar la directiva semanal en este momento.',
        variant: 'destructive',
      });
    } finally {
      setLoadingDirectiveKey(null);
    }
  };

  return (
    <Card className="glass-panel border-primary/20 cyberpunk-box">
      <CardHeader className="pb-3">
        <CardTitle className="font-sans text-sm text-primary uppercase tracking-[0.16em]">Directivas semanales</CardTitle>
        <p className="text-xs text-muted-foreground">
          Evento activo: <span className="text-primary font-semibold">{weeklyGoals.activeEvent.title}</span>
        </p>
        <p className="text-[11px] text-muted-foreground">{weeklyGoals.activeEvent.eventModifierLabel}</p>
        <p className="font-mono text-[11px] uppercase tracking-wider text-cyan-300">
          {claimableCount > 0
            ? `${claimableCount} directivas listas para reclamar`
            : 'Sin reclamos pendientes esta semana'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {weeklyGoals.directives.length === 0 && (
          <p className="text-xs text-muted-foreground">No hay directivas activas para esta semana.</p>
        )}
        {weeklyGoals.directives.map((directive) => {
          const progressPercent = Math.round(directive.progressRatio * 100);
          const isLoading = loadingDirectiveKey === directive.id;
          const badgeClassName =
            directive.status === 'CLAIMED'
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : directive.status === 'CLAIMABLE'
                ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                : 'border-muted bg-muted/20 text-muted-foreground';
          const stateLabel =
            directive.status === 'CLAIMED'
              ? 'Reclamada'
              : directive.status === 'CLAIMABLE'
                ? 'Reclamable'
                : 'En progreso';

          return (
            <article key={directive.id} className="rounded-sm border border-border/70 bg-background/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">{directive.title}</h3>
                <span className="text-[10px] font-mono text-primary">{directive.progress}/{directive.target}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{directive.description}</p>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-mono">
                <span className="text-yellow-400">+{directive.rewardCC} CC · +{directive.rewardXP} XP</span>
                <Badge variant="outline" className={cn('text-[10px] uppercase tracking-wide', badgeClassName)}>
                  {stateLabel}
                </Badge>
              </div>
              <Progress
                value={progressPercent}
                className="mt-2 h-2 border border-primary/20 bg-primary/10"
                role="progressbar"
                aria-label={`Progreso de directiva ${directive.title}`}
                aria-valuemin={0}
                aria-valuemax={directive.target}
                aria-valuenow={directive.progress}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3 w-full border-primary/40 hover:bg-primary/10"
                disabled={isLoading || !directive.claimable}
                aria-label={`Reclamar recompensa de la directiva ${directive.title}`}
                onClick={() => handleClaimDirective(directive.id)}
              >
                {directive.claimed ? 'Ya reclamada' : isLoading ? 'Procesando...' : directive.claimable ? 'Reclamar' : 'Aún no completada'}
              </Button>
            </article>
          );
        })}
      </CardContent>
    </Card>
  );
}
