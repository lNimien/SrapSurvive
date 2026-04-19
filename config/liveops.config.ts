import { ITEM_CATALOG } from '@/config/game.config';

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
  rewardItems?: Array<{ itemDefId: string; quantity: number }>;
  zoneId?: string;
}

export const WEEKLY_DIRECTIVE_REWARD_BOUNDS = {
  minCC: 25,
  maxCC: 750,
  minXP: 10,
  maxXP: 320,
  minItemQuantity: 1,
  maxItemQuantity: 250,
  maxRewardItemsPerDirective: 3,
} as const;

const ITEM_DEFINITION_IDS = new Set(ITEM_CATALOG.map((item) => item.id));

export interface WeeklyDirectiveRewardInput {
  rewardCC: number;
  rewardXP: number;
  rewardItems?: Array<{ itemDefId: string; quantity: number }>;
}

export interface WeeklyDirectiveNormalizedReward {
  rewardCC: number;
  rewardXP: number;
  rewardItems: Array<{ itemDefId: string; quantity: number }>;
}

export function normalizeWeeklyDirectiveReward(reward: WeeklyDirectiveRewardInput): WeeklyDirectiveNormalizedReward {
  const normalizedCC = Math.max(
    WEEKLY_DIRECTIVE_REWARD_BOUNDS.minCC,
    Math.min(WEEKLY_DIRECTIVE_REWARD_BOUNDS.maxCC, Math.floor(reward.rewardCC)),
  );
  const normalizedXP = Math.max(
    WEEKLY_DIRECTIVE_REWARD_BOUNDS.minXP,
    Math.min(WEEKLY_DIRECTIVE_REWARD_BOUNDS.maxXP, Math.floor(reward.rewardXP)),
  );

  const mergedRewardItems = new Map<string, number>();

  for (const rewardItem of reward.rewardItems ?? []) {
    if (!ITEM_DEFINITION_IDS.has(rewardItem.itemDefId)) {
      continue;
    }

    const normalizedQuantity = Math.max(
      WEEKLY_DIRECTIVE_REWARD_BOUNDS.minItemQuantity,
      Math.min(WEEKLY_DIRECTIVE_REWARD_BOUNDS.maxItemQuantity, Math.floor(rewardItem.quantity)),
    );

    const previousQuantity = mergedRewardItems.get(rewardItem.itemDefId) ?? 0;
    mergedRewardItems.set(rewardItem.itemDefId, previousQuantity + normalizedQuantity);
  }

  const normalizedRewardItems = [...mergedRewardItems.entries()]
    .map(([itemDefId, quantity]) => ({
      itemDefId,
      quantity: Math.max(
        WEEKLY_DIRECTIVE_REWARD_BOUNDS.minItemQuantity,
        Math.min(WEEKLY_DIRECTIVE_REWARD_BOUNDS.maxItemQuantity, quantity),
      ),
    }))
    .sort((a, b) => a.itemDefId.localeCompare(b.itemDefId))
    .slice(0, WEEKLY_DIRECTIVE_REWARD_BOUNDS.maxRewardItemsPerDirective);

  return {
    rewardCC: normalizedCC,
    rewardXP: normalizedXP,
    rewardItems: normalizedRewardItems,
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
    rewardItems: [
      { itemDefId: 'scrap_metal', quantity: 120 },
      { itemDefId: 'energy_cell', quantity: 24 },
    ],
  },
  {
    id: 'directive-survive-3-catastrophes',
    title: 'Veterano del colapso',
    description: 'Sobrevive 3 catástrofes (extrae después del estado crítico).',
    metric: 'CATASTROPHES_SURVIVED',
    target: 3,
    rewardCC: 220,
    rewardXP: 80,
    rewardItems: [{ itemDefId: 'armor_fiber', quantity: 20 }],
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
    rewardItems: [{ itemDefId: 'recycled_component', quantity: 30 }],
  },
  {
    id: 'directive-materials-1500',
    title: 'Cadena logística',
    description: 'Recolecta 1500 materiales en total durante la semana.',
    metric: 'MATERIALS_COLLECTED',
    target: 1500,
    rewardCC: 180,
    rewardXP: 70,
    rewardItems: [
      { itemDefId: 'scrap_metal', quantity: 80 },
      { itemDefId: 'energy_cell', quantity: 30 },
    ],
  },
  {
    id: 'directive-earn-2500-cc',
    title: 'Superávit de chatarra',
    description: 'Genera 2500 CC por extracción durante la semana.',
    metric: 'CREDITS_EARNED',
    target: 2500,
    rewardCC: 300,
    rewardXP: 110,
    rewardItems: [{ itemDefId: 'optic_sensor', quantity: 8 }],
  },
];
