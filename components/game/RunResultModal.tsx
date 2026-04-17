import { ExtractionResultDTO } from '../../types/dto.types';

interface RunResultModalProps {
  result: ExtractionResultDTO;
  onClose: () => void;
}

export function RunResultModal({ result, onClose }: RunResultModalProps) {
  const isCatastrophe = result.status === 'failed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
      <div className={`w-full max-w-lg border-2 rounded ${isCatastrophe ? 'border-red-600 bg-red-950/90' : 'border-green-600 bg-gray-900/90'} shadow-2xl overflow-hidden flex flex-col`}>
        
        <header className={`p-4 border-b ${isCatastrophe ? 'border-red-800 bg-red-900/50' : 'border-green-800 bg-green-900/30'}`}>
           <h2 className={`font-display text-2xl font-bold tracking-widest text-center ${isCatastrophe ? 'text-red-400' : 'text-green-400'}`}>
              {isCatastrophe ? '☠️ CATÁSTROFE ☠️' : '✓ EXTRACCIÓN EXITOSA'}
           </h2>
        </header>

        <section className="p-6">
           <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                 <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-mono">Créditos</div>
                 <div className="text-xl font-mono font-bold text-amber-500">+{result.currencyEarned} CC</div>
              </div>
              <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                 <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-mono">Experiencia</div>
                 <div className="text-xl font-mono font-bold text-cyan-400">+{result.xpEarned} XP</div>
              </div>
           </div>

           <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
              <h3 className="text-sm text-gray-400 uppercase tracking-wider font-mono mb-3 border-b border-gray-700 pb-2">Botín Asegurado</h3>
              {result.loot.length === 0 ? (
                 <div className="text-center text-gray-500 py-4 font-mono text-sm">( Ningún botín procesado )</div>
              ) : (
                 <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {result.loot.map((item, idx) => (
                       <li key={idx} className="flex justify-between font-mono text-sm border-b border-gray-700/50 pb-1 last:border-0 last:pb-0">
                          <span className={`rarity-text rarity-${item.rarity.toLowerCase()}`}>{item.displayName}</span>
                          <span className="text-gray-300 font-bold x-multiplier">x{item.quantity}</span>
                       </li>
                    ))}
                 </ul>
              )}
           </div>

           {isCatastrophe && (
              <p className="mt-4 text-center text-red-500 text-xs font-mono uppercase">Has perdido el 80% de tus recursos y todos los créditos.</p>
           )}
        </section>

        <footer className="p-4 bg-gray-950/50">
           <button 
              onClick={onClose}
              className={`w-full py-3 font-display font-bold tracking-widest rounded border transition-colors ${
                 isCatastrophe ? 'border-red-700 text-red-400 hover:bg-red-900/50' : 'border-green-700 text-green-400 hover:bg-green-900/50'
              }`}
           >
              CONTINUAR
           </button>
        </footer>

      </div>
    </div>
  );
}
