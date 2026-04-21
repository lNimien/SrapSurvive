'use client';

import { useState, useTransition } from 'react';
import { startRunAction } from '../../server/actions/run.actions';
import { isZoneUnlockedForLevel, ZONE_CONFIGS } from '../../config/game.config';
import { RunModeDTO } from '@/types/dto.types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils/cn';

interface StartRunSectionProps {
  hasActiveRun: boolean;
  playerLevel: number;
}

function getInitialZoneId(playerLevel: number): string {
  const firstUnlocked = ZONE_CONFIGS.find((zone) => isZoneUnlockedForLevel(zone.internalKey, playerLevel));
  return firstUnlocked?.internalKey ?? ZONE_CONFIGS[0].internalKey;
}

export function StartRunSection({ hasActiveRun, playerLevel }: StartRunSectionProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [zoneId, setZoneId] = useState<string>(() => getInitialZoneId(playerLevel));
  const [runMode, setRunMode] = useState<RunModeDTO>('SAFE');
  const selectedZone = ZONE_CONFIGS.find((zone) => zone.internalKey === zoneId) ?? ZONE_CONFIGS[0];
  const isSelectedZoneLocked = !isZoneUnlockedForLevel(selectedZone.internalKey, playerLevel);

  const handleStartRun = () => {
    startTransition(async () => {
      const result = await startRunAction({ zoneId, runMode });
      if (!result.success) {
        toast({
          title: 'No se pudo iniciar la expedición',
          description: result.error.message,
          variant: 'destructive',
        });
      }
    });
  };

  if (hasActiveRun) {
    return null; // El dashboard renderizará el ExpeditionPanel en su lugar
  }

  return (
    <div className="flex flex-col gap-3 rounded-sm border border-primary/15 bg-background/40 p-4">
      <label htmlFor="run-mode-select" className="sr-only">
        Seleccionar modo de expedición
      </label>
      <select
        id="run-mode-select"
        className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        value={runMode}
        onChange={(event) => setRunMode(event.target.value as RunModeDTO)}
        disabled={isPending}
        aria-label="Seleccionar modo de expedición"
      >
        <option value="SAFE">SAFE — Menor recompensa, no pierde equipo en catástrofe</option>
        <option value="HARD">HARD — Mayor recompensa, pierde equipo en catástrofe</option>
      </select>

      <label htmlFor="zone-select" className="sr-only">
        Seleccionar zona de expedición
      </label>
      <select
        id="zone-select"
        className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        value={zoneId}
        onChange={(event) => setZoneId(event.target.value)}
        disabled={isPending}
        aria-label="Seleccionar zona de expedición"
      >
        {ZONE_CONFIGS.map((zone) => {
          const locked = !isZoneUnlockedForLevel(zone.internalKey, playerLevel);
          const requiredLevelLabel = zone.minLevel > 1 ? `Nv.${zone.minLevel}` : 'Nv.1';

          return (
            <option key={zone.internalKey} value={zone.internalKey} disabled={locked}>
              {locked ? `🔒 ${zone.displayName} (${requiredLevelLabel})` : `${zone.displayName} (${requiredLevelLabel})`}
            </option>
          );
        })}
      </select>

      {isSelectedZoneLocked && (
        <p className="mb-3 text-xs text-amber-300" aria-live="polite">
          Esta zona requiere nivel {selectedZone.minLevel}. Nivel actual: {playerLevel}.
        </p>
      )}

      <button
        id="btn-launch-expedition"
        className={cn(
          'inline-flex w-full items-center justify-center gap-2 border border-primary/40 bg-primary/15 px-4 py-3 font-sans text-sm font-bold uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          (isPending || isSelectedZoneLocked) && 'cursor-wait opacity-50 hover:bg-primary/15 hover:text-primary',
        )}
        disabled={isPending || isSelectedZoneLocked}
        onClick={handleStartRun}
        aria-label="Lanzar expedición en la zona seleccionada"
      >
        <span aria-hidden="true">🚀</span>
        {isPending ? 'Preparando Nave...' : 'Lanzar Expedición'}
      </button>
    </div>
  );
}
