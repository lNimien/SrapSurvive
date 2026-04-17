'use client';

import { useState } from 'react';
import { RunStateDTO, ExtractionResultDTO } from '../../types/dto.types';
import { ExpeditionPanel } from './ExpeditionPanel';
import { StartRunSection } from './StartRunSection';
import { RunResultModal } from './RunResultModal';
import { Card, CardContent } from '../ui/card';

interface ExpeditionManagerProps {
  activeRun: RunStateDTO | null;
}

/**
 * ExpeditionManager maintains the UI state of the expedition lifecycle.
 * It survives the unmounting of components that occur during RSC revalidation 
 * (e.g. when activeRun is deleted on the server, the Dashboard re-renders).
 */
export function ExpeditionManager({ activeRun: serverActiveRun }: ExpeditionManagerProps) {
  // Use local state to track results so they persist even if serverActiveRun becomes null
  const [extractionResult, setExtractionResult] = useState<ExtractionResultDTO | null>(null);

  const handleExtractionCompleted = (result: ExtractionResultDTO) => {
    setExtractionResult(result);
  };

  const handleCloseModal = () => {
    setExtractionResult(null);
  };

  // If we have an active run from the server, we show the panel
  if (serverActiveRun) {
    return (
      <ExpeditionPanel 
        activeRun={serverActiveRun} 
        onExtractionResult={handleExtractionCompleted} 
      />
    );
  }

  // If no active run, we show the start section but keeping the modal if a result was just produced
  return (
    <>
      <StartRunSection hasActiveRun={false} />
      
      <Card className="mt-6 glass-panel border-dashed border-primary/30 cyberpunk-box bg-primary/5">
        <CardContent className="p-8 text-center flex flex-col items-center justify-center gap-2">
          <span className="text-3xl font-mono text-primary/40 animate-pulse">_</span>
          <p className="text-muted-foreground font-mono text-sm tracking-widest uppercase">
            Sistema en Espera / Chatarrero Listo Para Despliegue.
          </p>
        </CardContent>
      </Card>
      
      {extractionResult && (
        <RunResultModal 
          result={extractionResult} 
          onClose={handleCloseModal} 
        />
      )}
    </>
  );
}
