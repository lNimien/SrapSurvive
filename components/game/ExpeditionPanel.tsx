'use client';

import { RunStateDTO, ExtractionResultDTO } from '../../types/dto.types';
import { useRunPolling, useCountdown } from '../../hooks/useRunPolling';
import { DangerMeter } from './DangerMeter';
import { LootPreview } from './LootPreview';
import { ExtractButton } from './ExtractButton';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Separator } from '../ui/separator';

interface ExpeditionPanelProps {
  activeRun: RunStateDTO;
  onExtractionResult?: (result: ExtractionResultDTO) => void;
}

export function ExpeditionPanel({ activeRun: initialActiveRun, onExtractionResult }: ExpeditionPanelProps) {
  const polledRun = useRunPolling(initialActiveRun);
  const visualElapsed = useCountdown(polledRun.elapsedSeconds || 0, polledRun.status !== 'idle');
  const visualDanger = polledRun.dangerLevel || 0.0;
  
  const handleExtractionCompleted = (result: ExtractionResultDTO) => {
     if (onExtractionResult) {
       onExtractionResult(result);
     }
  };

  const isCatastrophe = polledRun.status === 'catastrophe';

  return (
    <Card className={`relative overflow-hidden transition-all duration-700 glass-panel border-2 ${
      isCatastrophe 
        ? 'border-destructive animate-pulse bg-destructive/10' 
        : 'border-primary/30 bg-background/40'
    } cyberpunk-box`}>
      
      {/* HUD Scanline Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] pointer-events-none z-20" />

      <CardHeader className="pb-2 relative z-10 px-6 pt-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className={`font-sans font-black text-2xl uppercase tracking-tighter ${isCatastrophe ? 'text-destructive' : 'text-primary neon-text-cyan'}`}>
              {isCatastrophe ? 'CATÁSTROFE_EN_CURSO' : 'EXPEDICIÓN_ACTIVA'}
            </CardTitle>
            <p className="font-mono text-[10px] text-muted-foreground tracking-[0.3em] uppercase opacity-70">
              Sector_{polledRun.zoneId?.toUpperCase() || 'UNKNOWN'} // Link_Established
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
        <div className="py-2">
          <DangerMeter dangerLevel={visualDanger} status={polledRun.status} />
        </div>

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
