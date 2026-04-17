'use client';

import { useTransition } from 'react';
import { requestExtractionAction } from '../../server/actions/run.actions';

interface ExtractButtonProps {
  runId: string;
  isCatastrophe: boolean;
  onExtractionSuccess: (result: any) => void;
}

export function ExtractButton({ runId, isCatastrophe, onExtractionSuccess }: ExtractButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleExtraction = () => {
    startTransition(async () => {
      const result = await requestExtractionAction({ runId });
      if (result.success) {
         onExtractionSuccess(result.data);
      } else {
         alert(`Error de Extracción: ${result.error.message}`);
      }
    });
  };

  return (
    <button
      aria-label={isCatastrophe ? "Forzar reinicio de sistemas tras catástrofe" : isPending ? "Procesando extracción segura, espera por favor" : "Confirmar extracción de botín seguro y regresar a la base"}
      disabled={isPending}
      onClick={handleExtraction}
      className={`w-full py-4 text-center font-display font-bold tracking-widest rounded transition-all duration-300
                 ${isCatastrophe
                   ? 'bg-red-900 border-red-500 text-red-200 hover:bg-red-800 shadow-[0_0_15px_rgba(255,0,0,0.5)]'
                   : 'bg-green-900/50 border-green-700 text-green-500 hover:bg-green-800/80 hover:text-green-300'}
                 ${isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer'} `}
    >
      {isPending ? '[ CERRANDO SECUENCIA... ]' : isCatastrophe ? '[ SISTEMAS CRÍTICOS ]' : '[ EXTRAER BOTÍN ]'}
    </button>
  );
}
