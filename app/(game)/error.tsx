'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error defensively capturing tracking parameters locally
    console.error('[Global Game Error Boundary]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full border-l-4 border-red-600 bg-gray-900/80 p-8 shadow-2xl relative overflow-hidden">
        
        {/* Background visual detail */}
        <div className="absolute -top-10 -right-10 text-9xl opacity-5 select-none font-mono font-bold text-red-500">
          !
        </div>

        <h1 className="text-3xl tracking-widest font-display font-bold text-red-500 mb-2">
          FALLO CRÍTICO
        </h1>
        <p className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-6">
          Sistemas corruptos. Interferencia detectada.
        </p>

        <div className="bg-black/50 p-4 border border-red-900/30 rounded mb-8 font-mono text-xs text-red-300/80 break-words">
          {error.message || 'Se ha producido una excepción inesperada durante la renderización del sector.'}
        </div>

        <button
          onClick={() => reset()}
          className="w-full py-4 text-center font-display font-bold tracking-widest bg-red-900/20 text-red-400 border border-red-800 hover:bg-red-900/40 hover:text-red-300 transition-colors uppercase"
        >
          [ Forzar Reinicio de Módulo ]
        </button>

      </div>
    </div>
  );
}
