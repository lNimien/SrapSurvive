import { PlayerAnalyticsDTO } from '@/types/dto.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PlayerAnalyticsPanelProps {
  analytics: PlayerAnalyticsDTO;
}

function toPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function PlayerAnalyticsPanel({ analytics }: PlayerAnalyticsPanelProps) {
  return (
    <Card className="glass-panel border-primary/20 cyberpunk-box">
      <CardHeader className="pb-3">
        <CardTitle className="font-sans text-sm text-primary uppercase tracking-[0.16em]">Analítica de piloto</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="rounded-sm border border-border/70 bg-background/40 p-3">
          <p className="text-muted-foreground">Extracciones totales</p>
          <p className="text-lg font-semibold text-foreground">{analytics.totalExtractions}</p>
        </div>
        <div className="rounded-sm border border-border/70 bg-background/40 p-3">
          <p className="text-muted-foreground">Tasa de éxito</p>
          <p className="text-lg font-semibold text-emerald-300">{toPercent(analytics.successRate)}</p>
        </div>
        <div className="rounded-sm border border-border/70 bg-background/40 p-3">
          <p className="text-muted-foreground">CC promedio / extracción</p>
          <p className="text-lg font-semibold text-foreground">{analytics.averageCcPerExtraction}</p>
        </div>
        <div className="rounded-sm border border-border/70 bg-background/40 p-3">
          <p className="text-muted-foreground">XP promedio / extracción</p>
          <p className="text-lg font-semibold text-foreground">{analytics.averageXpPerExtraction}</p>
        </div>
        <div className="rounded-sm border border-border/70 bg-background/40 p-3">
          <p className="text-muted-foreground">Mix SAFE/HARD</p>
          <p className="text-lg font-semibold text-foreground">
            {analytics.runMix.safe} / {analytics.runMix.hard}
          </p>
        </div>
        <div className="rounded-sm border border-border/70 bg-background/40 p-3">
          <p className="text-muted-foreground">Mejor zona por CC</p>
          <p className="text-sm font-semibold text-foreground">
            {analytics.bestZoneByEarnings
              ? `${analytics.bestZoneByEarnings.zoneId} (${analytics.bestZoneByEarnings.totalCredits} CC)`
              : 'Sin datos'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
