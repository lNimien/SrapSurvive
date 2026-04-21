import { Progress } from '../ui/progress';
import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/badge';
import { getExpeditionStateMeta, getExpeditionVisualState } from '@/lib/utils/expedition-ui';

interface DangerMeterProps {
  dangerLevel: number;
  status: 'running' | 'catastrophe' | 'idle';
  trend: 'rising' | 'stable';
  catastropheThreshold?: number;
}

export function DangerMeter({ dangerLevel, status, trend, catastropheThreshold }: DangerMeterProps) {
  const percentage = Math.min(Math.max(dangerLevel * 100, 0), 100);
  const isCatastrophe = status === 'catastrophe';
  const riskState = getExpeditionVisualState(dangerLevel, isCatastrophe);
  const stateMeta = getExpeditionStateMeta(riskState);
  const thresholdPercentage = Math.min(Math.max((catastropheThreshold ?? 0.9) * 100, 0), 100);
  const thresholdDelta = thresholdPercentage - percentage;
  const nearThreshold = !isCatastrophe && thresholdDelta <= 5;

  const statusColor = isCatastrophe
    ? 'text-destructive'
    : riskState === 'alert'
      ? 'text-amber-300'
      : riskState === 'critical'
        ? 'text-destructive'
        : 'text-emerald-300';

  const operationalCopy = isCatastrophe
    ? 'Catástrofe activa — extrae inmediatamente'
    : percentage >= 85
      ? 'Zona colapsando — ventana mínima'
      : percentage >= 60
        ? 'Amenaza alta — prepárate para evacuar'
        : 'Amenaza controlada — continúa recolectando';

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isCatastrophe ? 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.8)]' : riskState === 'alert' ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : riskState === 'critical' ? 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'}`} />
            <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.3em]">Ambience_Threat_Level</h4>
          </div>
          <div className={cn(
            'text-4xl font-mono font-black tracking-tighter transition-colors duration-500 motion-reduce:transition-none',
            statusColor,
            isCatastrophe && 'animate-pulse motion-reduce:animate-none',
          )}>
            {percentage.toFixed(1)}%
          </div>
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-primary/70">{operationalCopy}</p>
        </div>

        <div className="text-right space-y-1">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Operational_Status</p>
          <Badge variant="outline" className={cn('px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest', stateMeta.badgeClass)}>
            {isCatastrophe ? 'Crítico' : stateMeta.label}
          </Badge>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            Tendencia: {trend === 'rising' ? '▲ En ascenso' : '■ Estable'}
          </p>
        </div>
      </div>

      <div className="relative pt-2">
        <Progress
          value={percentage}
          className={cn(
            'h-3 rounded-none border border-white/10 bg-background/60 motion-reduce:transition-none',
            stateMeta.progressClass,
            riskState === 'stable' && 'shadow-[0_0_10px_rgba(16,185,129,0.22)]',
            riskState === 'alert' && 'shadow-[0_0_10px_rgba(245,158,11,0.25)]',
            riskState === 'critical' && 'shadow-[0_0_12px_rgba(239,68,68,0.3)]',
          )}
          aria-label="Nivel de riesgo de expedición"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percentage)}
        />

        <div className="absolute top-2 left-0 w-full h-3 flex justify-between px-1 pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="w-[1px] h-full bg-background/40" />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-y-2 left-[60%] w-px bg-amber-300/60" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-y-2 left-[85%] w-px bg-destructive/80" aria-hidden="true" />
      </div>

      <div className="flex justify-between text-[8px] font-mono text-muted-foreground uppercase tracking-[0.35em] pt-1 opacity-60">
        <span>Min_Safe</span>
        <span>Warning_Threshold</span>
        <span>Catastrophe_Threshold</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em]">
        <span className="text-muted-foreground">Umbral catástrofe: {thresholdPercentage.toFixed(1)}%</span>
        {isCatastrophe ? (
          <span className="text-destructive">Umbral superado</span>
        ) : (
          <span className={cn(thresholdDelta <= 0 ? 'text-destructive' : 'text-amber-300')}>
            Margen actual: {Math.max(0, thresholdDelta).toFixed(1)} pp
          </span>
        )}
        {nearThreshold && (
          <Badge variant="outline" className="border-amber-500/60 bg-amber-500/15 text-amber-300 text-[9px] uppercase tracking-widest">
            Cerca del umbral
          </Badge>
        )}
      </div>

      <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
        {stateMeta.guidance}
      </p>
    </div>
  );
}
