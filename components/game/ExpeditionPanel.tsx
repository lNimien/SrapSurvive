'use client';

import { RunStateDTO, ExtractionResultDTO } from '../../types/dto.types';
import { useRunPolling, useCountdown, useDangerInterpolation } from '../../hooks/useRunPolling';
import { DangerMeter } from './DangerMeter';
import { LootPreview } from './LootPreview';
import { ExtractButton } from './ExtractButton';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { resolveAnomalyAction } from '@/server/actions/run.actions';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils/cn';
import { getActivityLine, getExpeditionVisualState } from '@/lib/utils/expedition-ui';

interface ExpeditionPanelProps {
  activeRun: RunStateDTO;
  onExtractionResult?: (result: ExtractionResultDTO) => void;
}

export function ExpeditionPanel({ activeRun: initialActiveRun, onExtractionResult }: ExpeditionPanelProps) {
  const { toast } = useToast();
  const polledRun = useRunPolling(initialActiveRun);
  const visualElapsed = useCountdown(polledRun.elapsedSeconds || 0, polledRun.status !== 'idle');
  const visualDanger = useDangerInterpolation(polledRun);
  
  const handleExtractionCompleted = (result: ExtractionResultDTO) => {
     if (onExtractionResult) {
       onExtractionResult(result);
     }
  };

  const isCatastrophe = polledRun.status === 'catastrophe';
  const anomaly = polledRun.anomaly;
  const [isResolving, setIsResolving] = useState(false);
  const [activityTick, setActivityTick] = useState(0);
  const dangerTrend: 'rising' | 'stable' = visualDanger > (polledRun.dangerLevel ?? 0) ? 'rising' : 'stable';
  const signalNoise = Math.min(100, Math.round(visualDanger * 72 + (polledRun.pendingLoot?.length ?? 0) * 3));
  const visualState = getExpeditionVisualState(visualDanger, isCatastrophe);
  const activityLine = getActivityLine(visualState, activityTick);

  useEffect(() => {
    const timer = setInterval(() => setActivityTick((prev) => prev + 1), 3200);
    return () => clearInterval(timer);
  }, []);

  const handleResolveAnomaly = async (decision: 'IGNORE' | 'INVESTIGATE') => {
    if (!anomaly || !polledRun.runId) return;
    
    setIsResolving(true);
    try {
      const result = await resolveAnomalyAction({
        runId: polledRun.runId,
        anomalyId: anomaly.id,
        decision
      });

      if (result.success) {
        toast({ title: "Anomalía Resuelta", description: result.data.message });
      } else {
        toast({ title: "Error", description: result.error.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error al procesar la anomalía.", variant: "destructive" });
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-700 glass-panel border-2 cyberpunk-box",
      isCatastrophe ? "border-destructive animate-pulse bg-destructive/10" : "border-primary/30 bg-background/40",
      anomaly && "border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
    )}>
      
      {/* HUD Scanline Effect */}
      <div className={cn(
        "absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] pointer-events-none z-20",
        anomaly && "opacity-20 bg-purple-900/10"
      )} />

      {/* Anomaly Overlay */}
      {anomaly && (
        <div className="absolute inset-0 z-40 bg-background/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
           <div className="max-w-md w-full glass-panel border border-purple-500/50 p-6 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-pulse" />
              
              <div className="space-y-2 text-center">
                 <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/20 mb-2 border border-purple-500/30">
                    <AlertTriangle className="w-6 h-6 text-purple-400" />
                 </div>
                 <h2 className="text-xl font-black text-purple-400 uppercase tracking-widest font-sans">
                    {anomaly.title}
                 </h2>
                 <p className="text-sm font-mono text-primary/80 leading-relaxed">
                    {anomaly.description}
                 </p>
              </div>

              <div className="flex flex-col gap-3">
                 <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-mono uppercase tracking-widest text-xs h-12 group relative"
                    onClick={() => handleResolveAnomaly('INVESTIGATE')}
                    disabled={isResolving}
                 >
                    <Zap className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                    Investigar Señal (+20% Peligro)
                 </Button>
                 
                 <Button 
                    variant="outline"
                    className="w-full border-primary/20 hover:bg-primary/10 text-primary/60 font-mono uppercase tracking-widest text-[10px] h-10"
                    onClick={() => handleResolveAnomaly('IGNORE')}
                    disabled={isResolving}
                 >
                    <ShieldCheck className="w-3 h-3 mr-2" />
                    Ignorar y Seguir Seguro
                 </Button>
              </div>

              <div className="text-[9px] font-mono text-center opacity-30 uppercase tracking-tighter">
                 Internal_Link_Error · Anomaly_Detection_System · Sector_{polledRun.zoneId?.toUpperCase()}
              </div>
           </div>
        </div>
      )}

      <CardHeader className="pb-2 relative z-10 px-6 pt-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className={`font-sans font-black text-2xl uppercase tracking-tighter ${isCatastrophe ? 'text-destructive' : 'text-primary neon-text-cyan'}`}>
              {isCatastrophe ? 'CATÁSTROFE_EN_CURSO' : 'EXPEDICIÓN_ACTIVA'}
            </CardTitle>
            <p className="font-mono text-[10px] text-muted-foreground tracking-[0.3em] uppercase opacity-70">
              Sector_{polledRun.zoneId?.toUpperCase() || 'UNKNOWN'} · Link_Established
            </p>
            <p className="font-mono text-[10px] text-cyan-300/80 tracking-[0.2em] uppercase">
              Mode_{polledRun.runMode ?? 'SAFE'}
            </p>
          </div>
          <div className="flex flex-col items-end">
             <span className="font-mono text-sm text-primary tracking-widest bg-primary/10 px-2 py-0.5 border border-primary/20">
               {visualElapsed}s
             </span>
             {isCatastrophe && (
               <span className="text-[9px] font-mono text-destructive uppercase animate-bounce mt-1 font-bold">
                 !! EVACUAR_AHORA !!
               </span>
             )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 relative z-10 px-6">
        <section
          className={cn(
            'relative border rounded-sm overflow-hidden p-4',
            visualState === 'critical' ? 'border-destructive/40 bg-destructive/5' : 'border-primary/20 bg-primary/5',
          )}
          aria-label="Visual activo de expedición"
        >
          <div className="absolute inset-0 opacity-25 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(0,243,255,0.22),transparent_65%)]" />
          <div className="absolute inset-0 pointer-events-none opacity-40 bg-[linear-gradient(transparent_96%,rgba(255,255,255,0.07)_96%)] bg-[length:100%_12px]" />

          <div className="relative h-24 flex items-center justify-between gap-4">
            <svg viewBox="0 0 180 48" className="h-16 w-52 text-primary/80 drop-shadow-[0_0_12px_rgba(0,243,255,0.35)]">
              <g className="origin-center animate-[pulse_2.8s_ease-in-out_infinite]">
                <path d="M4 24L36 14L68 14L102 6L144 24L102 42L68 34L36 34Z" fill="currentColor" fillOpacity="0.23" />
                <path d="M18 24H136" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.8" />
              </g>
              <circle cx="150" cy="24" r="2.4" className="animate-pulse" fill="currentColor" />
              <path d="M150 24L174 24" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" />
            </svg>

            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-primary/60">Drone Feed</p>
              <p key={`${visualState}-${activityTick}`} className="mt-1 text-xs font-mono text-primary/90 animate-in fade-in slide-in-from-bottom-1 duration-300">
                {activityLine}
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Estado visual: {visualState}
              </p>
            </div>
          </div>
        </section>

        <div className="py-2">
          <DangerMeter dangerLevel={visualDanger} status={polledRun.status} trend={dangerTrend} />
        </div>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3" aria-label="Telemetría continua de amenaza">
          <div className="border border-primary/15 bg-primary/5 px-3 py-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary/60">Signal Noise</p>
            <p className="font-mono text-lg text-primary">{signalNoise}%</p>
          </div>
          <div className="border border-primary/15 bg-primary/5 px-3 py-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary/60">Threat Vector</p>
            <p className="font-mono text-lg text-primary">{dangerTrend === 'rising' ? 'ASCENDENTE' : 'ESTABLE'}</p>
          </div>
          <div className="border border-primary/15 bg-primary/5 px-3 py-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary/60">Live Tick</p>
            <p className="font-mono text-lg text-primary">{visualElapsed}s</p>
          </div>
        </section>

        <section className="bg-background/60 border border-primary/10 p-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
            <div className="absolute top-0 right-0 w-full h-[1px] bg-primary/30" />
            <div className="absolute top-0 right-0 h-full w-[1px] bg-primary/30" />
          </div>

          <h3 className="text-[10px] text-primary/50 font-mono uppercase tracking-[0.2em] mb-4 flex justify-between items-center">
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 bg-primary rounded-full" />
              Manifest_Scanner
            </span>
            <span className="opacity-40">CRC_OK</span>
          </h3>
          
          <div className="min-h-[100px]">
            <LootPreview loot={polledRun.pendingLoot} />
          </div>
        </section>
      </CardContent>

      <CardFooter className="mt-2 pb-6 px-6 relative z-10">
        <ExtractButton 
           runId={polledRun.runId as string} 
           isCatastrophe={isCatastrophe} 
           onExtractionSuccess={handleExtractionCompleted} 
        />
      </CardFooter>
    </Card>
  );
}
