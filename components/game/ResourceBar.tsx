import { Coins } from 'lucide-react';

interface ResourceBarProps {
  currencyBalance: number;
}

export function ResourceBar({ currencyBalance }: ResourceBarProps) {
  return (
    <div className="flex items-center gap-6" role="status" aria-label="Balance de Créditos de Chatarrero">
      <div className="flex items-center gap-3 group">
        <div className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
          <Coins className="w-4 h-4 text-yellow-500 drop-shadow-[0_0_5px_rgba(252,238,10,0.5)]" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] leading-none mb-1">C_Balance</span>
          <span className="text-xl font-mono font-bold text-yellow-500 drop-shadow-[0_0_8px_rgba(252,238,10,0.4)] leading-none transition-all group-hover:scale-110 origin-left">
            {currencyBalance.toLocaleString()} <span className="text-xs opacity-70">CC</span>
          </span>
        </div>
      </div>
    </div>
  );
}
