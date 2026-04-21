export type ExpeditionVisualState = 'stable' | 'alert' | 'critical';

export interface ExpeditionStateMeta {
  state: ExpeditionVisualState;
  label: string;
  badgeClass: string;
  progressClass: string;
  guidance: string;
}

export function getExpeditionVisualState(dangerLevel: number, isCatastrophe: boolean): ExpeditionVisualState {
  if (isCatastrophe || dangerLevel >= 0.85) {
    return 'critical';
  }

  if (dangerLevel >= 0.6) {
    return 'alert';
  }

  return 'stable';
}

export function getExpeditionStateMeta(state: ExpeditionVisualState): ExpeditionStateMeta {
  if (state === 'critical') {
    return {
      state,
      label: 'Crítico',
      badgeClass: 'border-destructive/60 bg-destructive/15 text-destructive',
      progressClass: '[&_[data-slot=progress-indicator]]:bg-destructive',
      guidance: 'Riesgo extremo: priorizá extracción inmediata.',
    };
  }

  if (state === 'alert') {
    return {
      state,
      label: 'Alerta',
      badgeClass: 'border-amber-500/60 bg-amber-500/15 text-amber-300',
      progressClass: '[&_[data-slot=progress-indicator]]:bg-amber-400',
      guidance: 'Riesgo alto: prepará extracción y seguí de cerca.',
    };
  }

  return {
    state,
    label: 'Estable',
    badgeClass: 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300',
    progressClass: '[&_[data-slot=progress-indicator]]:bg-emerald-400',
    guidance: 'Riesgo controlado: margen operativo disponible.',
  };
}

const ACTIVITY_LINES: Record<ExpeditionVisualState, string[]> = {
  stable: [
    'Drone scout estabiliza el corredor de chatarra',
    'Telemetría nominal, extracción de módulos en curso',
    'Motores iónicos en deriva controlada',
  ],
  alert: [
    'Fluctuaciones magnéticas detectadas en casco exterior',
    'Ruta secundaria activada para mantener señal de retorno',
    'Incremento de calor en celdas de recuperación',
  ],
  critical: [
    'Sobrecarga de campo — priorizar extracción inmediata',
    'Integridad estructural en ventana de colapso',
    'Alarma roja: la nave pierde margen operativo',
  ],
};

export function getActivityLine(state: ExpeditionVisualState, tick: number): string {
  const lines = ACTIVITY_LINES[state];
  return lines[Math.abs(tick) % lines.length];
}
