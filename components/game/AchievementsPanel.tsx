'use client';

import { useState } from 'react';

import { AchievementDTO } from '@/types/dto.types';
import { claimAchievementAction } from '@/server/actions/achievements.actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, CheckCircle2, Coins, Sparkles } from 'lucide-react';

interface AchievementsPanelProps {
  achievements: AchievementDTO[];
}

export function AchievementsPanel({ achievements }: AchievementsPanelProps) {
  const { toast } = useToast();
  const [loadingAchievementId, setLoadingAchievementId] = useState<string | null>(null);

  const achievementsSorted = [...achievements].sort((left, right) => {
    const priority = (achievement: AchievementDTO) => {
      if (achievement.unlocked && !achievement.claimed) return 0;
      if (!achievement.unlocked) return 1;
      return 2;
    };

    return priority(left) - priority(right);
  });

  const claimableNow = achievements.filter((achievement) => achievement.unlocked && !achievement.claimed).length;

  const handleClaim = async (achievementId: string) => {
    setLoadingAchievementId(achievementId);
    try {
      const result = await claimAchievementAction({ achievementId });

      if (result.success) {
        toast({
          title: 'Logro reclamado',
          description: `+${result.data.rewardCC} CC y +${result.data.rewardXP} XP recibidos.`,
        });
        return;
      }

      toast({
        title: 'No se pudo reclamar',
        description: result.error.message,
        variant: 'destructive',
      });
    } catch {
      toast({
        title: 'Error de red',
        description: 'No fue posible reclamar el logro en este momento.',
        variant: 'destructive',
      });
    } finally {
      setLoadingAchievementId(null);
    }
  };

  return (
    <Card className="glass-panel border-primary/20 cyberpunk-box">
      <CardHeader className="pb-3">
        <CardTitle className="font-sans text-lg uppercase tracking-widest text-primary flex items-center gap-2">
          <Award className="w-4 h-4" aria-hidden="true" />
          Logros
        </CardTitle>
        <CardDescription className="font-mono text-xs uppercase tracking-wider text-primary/60">
          Recompensas por hitos globales de tu cuenta.
        </CardDescription>
        <p className="font-mono text-[11px] uppercase tracking-wider text-cyan-300">
          {claimableNow > 0 ? `${claimableNow} logros listos para reclamar` : 'Sigue jugando para desbloquear logros'}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {achievementsSorted.map((achievement) => {
          const isLoading = loadingAchievementId === achievement.id;
          const canClaim = achievement.unlocked && !achievement.claimed;

          return (
            <div
              key={achievement.id}
              className="border border-primary/20 bg-primary/5 rounded-sm p-3 space-y-3"
              aria-label={`Logro ${achievement.name}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-sans text-sm font-semibold uppercase tracking-wide text-foreground">
                      {achievement.name}
                    </h3>
                    {achievement.claimed ? (
                      <Badge className="bg-green-500/10 border-green-500/30 text-green-400" variant="outline">
                        Reclamado
                      </Badge>
                    ) : achievement.unlocked ? (
                      <Badge className="bg-cyan-500/10 border-cyan-500/30 text-cyan-300" variant="outline">
                        Desbloqueado
                      </Badge>
                    ) : (
                      <Badge className="bg-muted/20 border-muted text-muted-foreground" variant="outline">
                        Bloqueado
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{achievement.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="flex items-center gap-1.5 px-2 py-1 border border-primary/20 bg-primary/10 text-yellow-400">
                  <Coins className="w-3 h-3" aria-hidden="true" />
                  +{achievement.rewardCC} CC
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 border border-primary/20 bg-primary/10 text-cyan-300">
                  <Sparkles className="w-3 h-3" aria-hidden="true" />
                  +{achievement.rewardXP} XP
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full border-primary/40 hover:bg-primary/10"
                disabled={isLoading || !canClaim}
                onClick={() => handleClaim(achievement.id)}
                aria-label={`Reclamar logro ${achievement.name}`}
              >
                {achievement.claimed ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Ya reclamado
                  </span>
                ) : isLoading ? (
                  'Procesando...'
                ) : achievement.unlocked ? (
                  'Reclamar recompensa'
                ) : (
                  'Aún bloqueado'
                )}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
