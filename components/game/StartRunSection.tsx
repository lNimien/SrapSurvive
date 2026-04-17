'use client';

import { useTransition } from 'react';
import { startRunAction } from '../../server/actions/run.actions';

interface StartRunSectionProps {
  hasActiveRun: boolean;
}

export function StartRunSection({ hasActiveRun }: StartRunSectionProps) {
  const [isPending, startTransition] = useTransition();

  const handleStartRun = () => {
    startTransition(async () => {
      const result = await startRunAction({ zoneId: 'shipyard_cemetery' });
      if (!result.success) {
        alert(`Error: ${result.error.message}`);
      }
    });
  };

  if (hasActiveRun) {
    return null; // El dashboard renderizará el ExpeditionPanel en su lugar
  }

  return (
    <div className="start-run-section">
      <button
        id="btn-launch-expedition"
        className={`btn-launch ${isPending ? 'opacity-50 cursor-wait' : ''}`}
        disabled={isPending}
        onClick={handleStartRun}
        aria-label="Lanzar expedición al Cementerio de Naves"
      >
        <span className="btn-launch-icon" aria-hidden="true">🚀</span>
        {isPending ? 'Preparando Nave...' : 'Lanzar Expedición'}
      </button>
    </div>
  );
}
