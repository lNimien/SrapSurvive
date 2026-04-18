import { ExtractionResultDTO } from '../../types/dto.types';
import { cn } from '@/lib/utils';
import { Terminal, Package, CreditCard, ChevronRight, Zap } from 'lucide-react';
import { buttonVariants } from '../ui/button';

interface RunResultModalProps {
  result: ExtractionResultDTO;
  onClose: () => void;
}

export function RunResultModal({ result, onClose }: RunResultModalProps) {
  const isCatastrophe = result.status === 'failed';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className={cn(
        "w-full max-w-xl glass-panel relative overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]",
        isCatastrophe ? "border-red-500/50 shadow-red-900/20" : "border-primary/50 shadow-primary/20"
      )}>
        {/* Decorative Top Scanline */}
        <div className={cn(
          "absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-50 z-20",
          isCatastrophe ? "text-red-500" : "text-primary"
        )} />

        <header className={cn(
          "p-6 border-b flex flex-col items-center gap-2 relative overflow-hidden",
          isCatastrophe ? "border-red-900/30 bg-red-950/20" : "border-primary/20 bg-primary/5"
        )}>
           <div className="absolute top-2 left-2 flex gap-1 opacity-20 hidden sm:flex">
             <div className="w-1 h-4 bg-current" />
             <div className="w-1 h-3 bg-current" />
             <div className="w-1 h-2 bg-current" />
           </div>

           <div className={cn(
             "w-12 h-12 rounded-full flex items-center justify-center mb-2 border-2 animate-pulse",
             isCatastrophe ? "border-red-500 text-red-500" : "border-primary text-primary"
           )}>
             {isCatastrophe ? <Zap className="w-6 h-6 fill-current" /> : <Terminal className="w-6 h-6" />}
           </div>

           <h2 className={cn(
             "font-sans font-black text-3xl tracking-[0.2em] uppercase text-center leading-none",
             isCatastrophe ? "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "text-primary neon-text-cyan"
           )}>
              {isCatastrophe ? 'ENLACE_PERDIDO' : 'EXTRACCIÓN_OK'}
           </h2>
           <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
             Sync_ID: {result.runId.substring(0, 12)}... // Sector_74_Results
           </p>
        </header>

        <section className="p-8 space-y-8 relative overflow-hidden">
           <div className="grid grid-cols-2 gap-4">
              <div className="glass-panel p-4 border-white/5 bg-white/5 relative group transition-colors hover:bg-white/10">
                 <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-primary/40" />
                 <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                   <CreditCard className="w-3 h-3" /> Créditos_Sync
                 </div>
                 <div className="text-2xl font-sans font-bold text-primary neon-text-cyan">
                   +{result.currencyEarned.toLocaleString()} <span className="text-xs opacity-50">CC</span>
                 </div>
              </div>
              <div className="glass-panel p-4 border-white/5 bg-white/5 relative group transition-colors hover:bg-white/10">
                 <div className="absolute top-0 right-0 w-1 h-1 border-t border-r border-cyan-400/40" />
                 <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                   <ChevronRight className="w-3 h-3" /> XP_Feedback
                 </div>
                 <div className="text-2xl font-sans font-bold text-cyan-400">
                   +{result.xpEarned.toLocaleString()} <span className="text-xs opacity-50">XP</span>
                 </div>
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-mono flex items-center gap-2">
                 <Package className="w-4 h-4" /> Registro de Botín Asegurado
              </h3>
              
              <div className="glass-panel border-white/5 bg-black/40 p-1">
                {result.loot.length === 0 ? (
                   <div className="text-center text-muted-foreground/30 py-8 font-mono text-xs uppercase italic tracking-widest uppercase">
                     ( MEMORIA CENTRAL VACÍA - NINGÚN OBJETO DETECTADO )
                   </div>
                ) : (
                   <ul className="divide-y divide-white/5 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-primary/20">
                      {result.loot.map((item, idx) => (
                         <li key={idx} className="flex justify-between items-center p-3 font-mono text-xs group hover:bg-primary/5 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-1.5 h-1.5 rotate-45", `bg-rarity-${item.rarity.toLowerCase() || 'common'}`)} />
                              <span className={cn("uppercase tracking-wider font-bold", `text-rarity-${item.rarity.toLowerCase() || 'common'}`)}>
                                {item.displayName}
                              </span>
                            </div>
                            <span className="text-primary font-black opacity-50 group-hover:opacity-100 transition-opacity">
                              X{item.quantity}
                            </span>
                         </li>
                      ))}
                   </ul>
                )}
              </div>
           </div>

           {isCatastrophe && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-mono uppercase tracking-widest leading-relaxed text-center animate-pulse">
                &gt;&gt; ERROR CRÍTICO: CATÁSTROFE DETECTADA. <br/>
                80% DE LOS RECURSOS PERDIDOS. CRÉDITOS DE RUN RESETEADOS.
              </div>
           )}
        </section>

        <footer className="p-6 border-t border-white/5 bg-black/40">
           <button 
              onClick={onClose}
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full font-sans font-black tracking-[0.1em] uppercase h-14",
                isCatastrophe ? "bg-red-600 hover:bg-red-500 text-white" : "bg-primary hover:bg-primary/90 text-background"
              )}
           >
              SINCRONIZAR Y CONTINUAR
           </button>
        </footer>
      </div>
    </div>
  );
}
