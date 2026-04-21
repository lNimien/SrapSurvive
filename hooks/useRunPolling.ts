'use client';

import { useState, useEffect, useRef } from 'react';
import { RunStateDTO } from '../types/dto.types';
import { interpolateDangerLevel } from '@/lib/utils/danger-interpolation';

export function useRunPolling(initialState: RunStateDTO) {
  const [runState, setRunState] = useState<RunStateDTO>(initialState);
  const [previousRunState, setPreviousRunState] = useState<RunStateDTO | null>(null);

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
          setRunState((previousSnapshot) => {
            setPreviousRunState(previousSnapshot);
            return json.data;
          });
          
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

  return { runState, previousRunState };
}

export function useDangerInterpolation(runState: RunStateDTO) {
  const [visualDanger, setVisualDanger] = useState(runState.dangerLevel ?? 0);
  const previousSnapshotRef = useRef<RunStateDTO | null>(null);
  const currentSnapshotRef = useRef<RunStateDTO>(runState);
  const snapshotCapturedAtMsRef = useRef<number>(0);

  useEffect(() => {
    previousSnapshotRef.current = currentSnapshotRef.current ? { ...currentSnapshotRef.current } : null;
    currentSnapshotRef.current = runState;
    snapshotCapturedAtMsRef.current = Date.now();
  }, [runState]);

  useEffect(() => {
    if (runState.status !== 'running' && runState.status !== 'catastrophe') {
      return;
    }

    const intervalId = setInterval(() => {
      setVisualDanger(
        interpolateDangerLevel({
          currentSnapshot: currentSnapshotRef.current,
          previousSnapshot: previousSnapshotRef.current,
          nowMs: Date.now(),
          snapshotCapturedAtMs: snapshotCapturedAtMsRef.current,
        }),
      );
    }, 250);

    return () => clearInterval(intervalId);
  }, [runState.status]);

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
