export type AchievementTriggerRule =
  | { readonly type: 'EXTRACTION_RESULTS_COUNT'; readonly target: number }
  | { readonly type: 'CATASTROPHE_OCCURRED_COUNT'; readonly target: number }
  | { readonly type: 'LEVEL_REACHED'; readonly target: number }
  | { readonly type: 'TOTAL_SCRAP_COLLECTED'; readonly target: number };

export interface AchievementDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly rewardCC: number;
  readonly rewardXP: number;
  readonly trigger: AchievementTriggerRule;
}

export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = [
  {
    id: 'achievement_first_extraction',
    name: 'Primer Retorno',
    description: 'Completa tu primera extracción.',
    rewardCC: 60,
    rewardXP: 120,
    trigger: { type: 'EXTRACTION_RESULTS_COUNT', target: 1 },
  },
  {
    id: 'achievement_catastrophe_veteran',
    name: 'Veterano de Catástrofes',
    description: 'Resuelve una expedición tras entrar en estado de catástrofe.',
    rewardCC: 90,
    rewardXP: 160,
    trigger: { type: 'CATASTROPHE_OCCURRED_COUNT', target: 1 },
  },
  {
    id: 'achievement_level_three',
    name: 'Operador Certificado',
    description: 'Alcanza nivel 3.',
    rewardCC: 120,
    rewardXP: 220,
    trigger: { type: 'LEVEL_REACHED', target: 3 },
  },
  {
    id: 'achievement_scrap_hoarder',
    name: 'Acaparador de Chatarra',
    description: 'Recolecta 500 unidades de chatarra total.',
    rewardCC: 150,
    rewardXP: 260,
    trigger: { type: 'TOTAL_SCRAP_COLLECTED', target: 500 },
  },
  {
    id: 'achievement_ten_extractions',
    name: 'Turno Completo',
    description: 'Completa 10 extracciones.',
    rewardCC: 180,
    rewardXP: 280,
    trigger: { type: 'EXTRACTION_RESULTS_COUNT', target: 10 },
  },
  {
    id: 'achievement_fifty_extractions',
    name: 'Operador de Flota',
    description: 'Completa 50 extracciones.',
    rewardCC: 420,
    rewardXP: 520,
    trigger: { type: 'EXTRACTION_RESULTS_COUNT', target: 50 },
  },
  {
    id: 'achievement_three_catastrophes',
    name: 'Sobreviviente Improbable',
    description: 'Resuelve 3 expediciones en estado de catástrofe.',
    rewardCC: 220,
    rewardXP: 320,
    trigger: { type: 'CATASTROPHE_OCCURRED_COUNT', target: 3 },
  },
  {
    id: 'achievement_ten_catastrophes',
    name: 'Domador del Caos',
    description: 'Resuelve 10 expediciones en catástrofe.',
    rewardCC: 500,
    rewardXP: 640,
    trigger: { type: 'CATASTROPHE_OCCURRED_COUNT', target: 10 },
  },
  {
    id: 'achievement_level_five',
    name: 'Capataz Orbital',
    description: 'Alcanza nivel 5.',
    rewardCC: 250,
    rewardXP: 360,
    trigger: { type: 'LEVEL_REACHED', target: 5 },
  },
  {
    id: 'achievement_level_ten',
    name: 'Ingeniero de Riesgo',
    description: 'Alcanza nivel 10.',
    rewardCC: 700,
    rewardXP: 900,
    trigger: { type: 'LEVEL_REACHED', target: 10 },
  },
  {
    id: 'achievement_scrap_tycoon',
    name: 'Magnate del Astillero',
    description: 'Recolecta 2,500 unidades de chatarra total.',
    rewardCC: 420,
    rewardXP: 580,
    trigger: { type: 'TOTAL_SCRAP_COLLECTED', target: 2500 },
  },
  {
    id: 'achievement_scrap_legend',
    name: 'Leyenda de la Chatarra',
    description: 'Recolecta 7,500 unidades de chatarra total.',
    rewardCC: 980,
    rewardXP: 1200,
    trigger: { type: 'TOTAL_SCRAP_COLLECTED', target: 7500 },
  },
  {
    id: 'achievement_hundred_extractions',
    name: 'Operador de Turno Doble',
    description: 'Completa 100 extracciones.',
    rewardCC: 1400,
    rewardXP: 1500,
    trigger: { type: 'EXTRACTION_RESULTS_COUNT', target: 100 },
  },
  {
    id: 'achievement_twenty_catastrophes',
    name: 'Navegante del Umbral',
    description: 'Resuelve 20 expediciones en estado de catástrofe.',
    rewardCC: 1100,
    rewardXP: 1400,
    trigger: { type: 'CATASTROPHE_OCCURRED_COUNT', target: 20 },
  },
  {
    id: 'achievement_level_twelve',
    name: 'Supervisor de Frontera',
    description: 'Alcanza nivel 12.',
    rewardCC: 900,
    rewardXP: 1300,
    trigger: { type: 'LEVEL_REACHED', target: 12 },
  },
  {
    id: 'achievement_level_fifteen',
    name: 'Cartógrafo de Riesgo',
    description: 'Alcanza nivel 15.',
    rewardCC: 1600,
    rewardXP: 2100,
    trigger: { type: 'LEVEL_REACHED', target: 15 },
  },
  {
    id: 'achievement_void_scrap_magnate',
    name: 'Magnate de la Fisura',
    description: 'Recolecta 12,000 unidades de chatarra total.',
    rewardCC: 1700,
    rewardXP: 1900,
    trigger: { type: 'TOTAL_SCRAP_COLLECTED', target: 12000 },
  },
];

export const ACHIEVEMENT_DEFINITION_BY_ID: Readonly<Record<string, AchievementDefinition>> =
  ACHIEVEMENT_DEFINITIONS.reduce<Record<string, AchievementDefinition>>((acc, definition) => {
    acc[definition.id] = definition;
    return acc;
  }, {});
