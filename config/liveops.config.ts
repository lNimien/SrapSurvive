export interface LiveEventDescriptor {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  eventModifierLabel: string;
}

export type WeeklyDirectiveMetric =
  | 'EXTRACTIONS_COMPLETED'
  | 'CATASTROPHES_SURVIVED'
  | 'ZONE_CLEARS'
  | 'MATERIALS_COLLECTED'
  | 'CREDITS_EARNED';

export interface WeeklyDirectiveDefinition {
  id: string;
  title: string;
  description: string;
  metric: WeeklyDirectiveMetric;
  target: number;
  rewardCC: number;
  rewardXP: number;
  zoneId?: string;
}

export const WEEKLY_DIRECTIVE_REWARD_BOUNDS = {
  minCC: 25,
  maxCC: 750,
  minXP: 10,
  maxXP: 320,
} as const;

export function normalizeWeeklyDirectiveReward(reward: { rewardCC: number; rewardXP: number }) {
  const normalizedCC = Math.max(
    WEEKLY_DIRECTIVE_REWARD_BOUNDS.minCC,
    Math.min(WEEKLY_DIRECTIVE_REWARD_BOUNDS.maxCC, Math.floor(reward.rewardCC)),
  );
  const normalizedXP = Math.max(
    WEEKLY_DIRECTIVE_REWARD_BOUNDS.minXP,
    Math.min(WEEKLY_DIRECTIVE_REWARD_BOUNDS.maxXP, Math.floor(reward.rewardXP)),
  );

  return {
    rewardCC: normalizedCC,
    rewardXP: normalizedXP,
  };
}

export const ACTIVE_EVENT: LiveEventDescriptor = {
  id: 'signal-storm-0426',
  title: 'Tormenta de Señales Fantasma',
  description:
    'El Cementerio de Naves emite ecos de navegación inestables: más rutas útiles, mayor presión táctica.',
  startsAt: '2026-04-15T00:00:00.000Z',
  endsAt: '2026-04-22T00:00:00.000Z',
  eventModifierLabel: '+8% visibilidad táctica en zonas base (solo informativo en D.3.2).',
};

export const WEEKLY_DIRECTIVES: WeeklyDirectiveDefinition[] = [
  {
    id: 'directive-extract-12',
    title: 'Cadencia de extracción',
    description: 'Completa 12 extracciones esta semana.',
    metric: 'EXTRACTIONS_COMPLETED',
    target: 12,
    rewardCC: 150,
    rewardXP: 60,
  },
  {
    id: 'directive-survive-3-catastrophes',
    title: 'Veterano del colapso',
    description: 'Sobrevive 3 catástrofes (extrae después del estado crítico).',
    metric: 'CATASTROPHES_SURVIVED',
    target: 3,
    rewardCC: 220,
    rewardXP: 80,
  },
  {
    id: 'directive-zone-orbital-5',
    title: 'Patrulla orbital',
    description: 'Limpia 5 runs en Derelict Orbital.',
    metric: 'ZONE_CLEARS',
    zoneId: 'orbital_derelict',
    target: 5,
    rewardCC: 260,
    rewardXP: 95,
  },
  {
    id: 'directive-materials-1500',
    title: 'Cadena logística',
    description: 'Recolecta 1500 materiales en total durante la semana.',
    metric: 'MATERIALS_COLLECTED',
    target: 1500,
    rewardCC: 180,
    rewardXP: 70,
  },
  {
    id: 'directive-earn-2500-cc',
    title: 'Superávit de chatarra',
    description: 'Genera 2500 CC por extracción durante la semana.',
    metric: 'CREDITS_EARNED',
    target: 2500,
    rewardCC: 300,
    rewardXP: 110,
  },
];
