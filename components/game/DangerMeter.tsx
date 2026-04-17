import { Progress } from '../ui/progress';

interface DangerMeterProps {
  dangerLevel: number;
  status: 'running' | 'catastrophe' | 'idle';
}

export function DangerMeter({ dangerLevel, status }: DangerMeterProps) {
  const percentage = Math.min(Math.max(dangerLevel * 100, 0), 100);
  const isCatastrophe = status === 'catastrophe';

  const statusColor = isCatastrophe 
    ? 'text-destructive' 
    : dangerLevel > 0.8 
      ? 'text-orange-500' 
      : dangerLevel > 0.5 
        ? 'text-yellow-500' 
        : 'text-primary';

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isCatastrophe ? 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-primary shadow-[0_0_8px_rgba(0,243,255,0.8)]'}`} />
            <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.3em]">Ambience_Threat_Level</h4>
          </div>
          <div className={`text-4xl font-mono font-black tracking-tighter ${statusColor} ${isCatastrophe ? 'animate-pulse' : ''} transition-colors duration-500`}>
            {percentage.toFixed(1)}%
          </div>
        </div>

        <div className="text-right space-y-1">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Operational_Status</p>
          <div className={`px-2 py-0.5 border text-[10px] font-mono font-bold uppercase tracking-widest ${
            isCatastrophe 
              ? 'bg-destructive/20 border-destructive text-destructive' 
              : 'bg-primary/10 border-primary/30 text-primary'
          }`}>
             {status === 'catastrophe' ? '!! CRITICAL !!' : 'NOMINAL_FLOW'}
          </div>
        </div>
      </div>

      <div className="relative pt-2">
        <Progress 
          value={percentage} 
          className={`h-3 rounded-none bg-background/50 border border-white/5 ${isCatastrophe ? '[&>div]:bg-destructive' : '[&>div]:bg-primary shadow-[0_0_10px_rgba(0,243,255,0.2)]'}`}
        />
        
        {/* Decorative Grid markings */}
        <div className="absolute top-2 left-0 w-full h-3 flex justify-between px-1 pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="w-[1px] h-full bg-background/40" />
          ))}
        </div>
      </div>

      <div className="flex justify-between text-[8px] font-mono text-muted-foreground uppercase tracking-[0.4em] pt-1 opacity-50">
        <span>Min_Safe</span>
        <span>Warning_Threshold</span>
        <span>Critical_Evac</span>
      </div>
    </div>
  );
}
