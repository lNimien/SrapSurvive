import { RunHistoryCardDTO } from '../../../types/dto.types';

interface RunHistoryCardProps {
  run: RunHistoryCardDTO;
}

export function RunHistoryCard({ run }: RunHistoryCardProps) {
  const isExtracted = run.status === 'EXTRACTED';
  
  // Format MM/DD HH:MM
  const dateObj = new Date(run.createdAt);
  const formattedDate = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Format duration into m s
  const minutes = Math.floor(run.durationSeconds / 60);
  const seconds = run.durationSeconds % 60;
  const formattedDuration = `${minutes > 0 ? minutes + 'm ' : ''}${seconds}s`;

  return (
    <article className={`p-4 border rounded mb-3 flex items-center transition-colors ${
       isExtracted ? 'border-green-900/40 bg-gray-900/60' : 'border-red-900/30 bg-red-950/20'
    }`}>
      {/* Icon/Badge Section */}
      <div className="flex-none mr-6 text-center w-28">
         <span className={`inline-block py-1 px-3 text-xs font-mono font-bold rounded-full mb-2 ${
            isExtracted ? 'text-green-500 bg-green-950/80 border border-green-800/50' : 'text-red-500 bg-red-950/80 border border-red-800/50'
         }`}>
            {isExtracted ? 'EXTRAÍDO' : 'FALLIDO'}
         </span>
         <div className="text-gray-500 text-xs font-mono">{formattedDuration}</div>
      </div>

      {/* Details section */}
      <div className="flex-grow grid grid-cols-3 gap-4 items-center">
         <div>
             <div className="text-gray-400 font-mono text-xs mb-1 uppercase tracking-wider">Fecha</div>
             <div className="text-gray-300 font-mono text-sm">{formattedDate}</div>
         </div>

         <div>
             <div className="text-gray-400 font-mono text-xs mb-1 uppercase tracking-wider">Recompensas</div>
             <div className="flex flex-col">
                {run.currencyEarned > 0 && <span className="text-amber-500 font-mono text-sm font-bold">+{run.currencyEarned} CC</span>}
                <span className="text-cyan-400 font-mono text-sm">+{run.xpEarned} XP</span>
             </div>
         </div>

         <div>
             <div className="text-gray-400 font-mono text-xs mb-1 uppercase tracking-wider">Cargamento</div>
             <div className="text-gray-300 font-mono text-sm">
                {run.uniqueLootCount === 0 
                   ? <span className="text-gray-600 italic">Vacio</span>
                   : <span>{run.uniqueLootCount} material(es)</span>
                }
             </div>
         </div>
      </div>
    </article>
  );
}
