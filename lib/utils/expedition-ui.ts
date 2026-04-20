export type ExpeditionVisualState = 'stable' | 'alert' | 'critical';

export function getExpeditionVisualState(dangerLevel: number, isCatastrophe: boolean): ExpeditionVisualState {
  if (isCatastrophe || dangerLevel >= 0.85) {
    return 'critical';
  }

  if (dangerLevel >= 0.6) {
    return 'alert';
  }

  return 'stable';
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
