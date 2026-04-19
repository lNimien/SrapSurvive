'use client';

import { useState, useEffect, useRef } from 'react';
import { RunStateDTO } from '../types/dto.types';
import { interpolateDangerLevel } from '@/lib/utils/danger-interpolation';

export function useRunPolling(initialState: RunStateDTO) {
  const [runState, setRunState] = useState<RunStateDTO>(initialState);

  useEffect(() => {
    // Si no está corriendo ni explotando, detenemos.
    if (runState.status === 'idle') {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch('/api/game/run-state');
        const json = await response.json();
        
        if (json.success && json.data) {
          setRunState(json.data);
          
          if (json.data.status === 'idle') {
             clearInterval(intervalId);
          }
        }
      } catch (error) {
        console.error('[useRunPolling] Error obteniendo datos:', error);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [runState.status]);

  return runState;
}

export function useDangerInterpolation(runState: RunStateDTO) {
  const [visualDanger, setVisualDanger] = useState(runState.dangerLevel ?? 0);
  const [previousSnapshot, setPreviousSnapshot] = useState<RunStateDTO | null>(null);
  const [snapshotCapturedAtMs, setSnapshotCapturedAtMs] = useState<number>(Date.now());
  const lastSnapshotRef = useRef<RunStateDTO | null>(null);

  useEffect(() => {
    setPreviousSnapshot(lastSnapshotRef.current ? { ...lastSnapshotRef.current } : null);
    lastSnapshotRef.current = runState;
    setSnapshotCapturedAtMs(Date.now());
    setVisualDanger(runState.dangerLevel ?? 0);
  }, [runState]);

  useEffect(() => {
    if (runState.status !== 'running' && runState.status !== 'catastrophe') {
      return;
    }

    const intervalId = setInterval(() => {
      setVisualDanger(
        interpolateDangerLevel({
          currentSnapshot: runState,
          previousSnapshot,
          nowMs: Date.now(),
          snapshotCapturedAtMs,
        }),
      );
    }, 250);

    return () => clearInterval(intervalId);
  }, [previousSnapshot, runState, snapshotCapturedAtMs]);

  return visualDanger;
}

// Opcional recomendado: useCountdown
export function useCountdown(initialElapsed: number, isActive: boolean) {
  const [elapsed, setElapsed] = useState(initialElapsed);

  useEffect(() => {
    setElapsed(initialElapsed); // Syncs when initial changes
  }, [initialElapsed]);

  useEffect(() => {
    if (!isActive) return;

    const intervalId = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isActive]);

  return elapsed;
}
