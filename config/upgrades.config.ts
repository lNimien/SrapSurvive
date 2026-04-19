export interface AccountUpgradeEffect {
  readonly baseRateMultiplier?: number;
  readonly quadraticFactorMultiplier?: number;
  readonly catastropheThresholdBonus?: number;
  readonly dangerLootBonusMultiplier?: number;
}

export interface AccountUpgradeDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly costCC: number;
  readonly effects: AccountUpgradeEffect;
}

export const UPGRADE_DEFINITIONS: readonly AccountUpgradeDefinition[] = [
  {
    id: 'upgrade_hull_stabilizers_v1',
    displayName: 'Estabilizadores de Casco v1',
    description: 'Reduce la ganancia base de peligro durante la expedición.',
    costCC: 120,
    effects: {
      baseRateMultiplier: 0.92,
      quadraticFactorMultiplier: 0.95,
    },
  },
  {
    id: 'upgrade_escape_protocol_v1',
    displayName: 'Protocolo de Escape v1',
    description: 'Eleva ligeramente el umbral de catástrofe para aguantar más tiempo.',
    costCC: 180,
    effects: {
      catastropheThresholdBonus: 0.03,
    },
  },
  {
    id: 'upgrade_salvage_optimizer_v1',
    displayName: 'Optimizador de Salvamento v1',
    description: 'Mejora el bonus de botín escalado por peligro.',
    costCC: 160,
    effects: {
      dangerLootBonusMultiplier: 1.12,
    },
  },
  {
    id: 'upgrade_hull_stabilizers_v2',
    displayName: 'Estabilizadores de Casco v2',
    description: 'Ajuste fino de giroscopios para reducir aún más la escalada de peligro.',
    costCC: 280,
    effects: {
      baseRateMultiplier: 0.9,
      quadraticFactorMultiplier: 0.93,
    },
  },
  {
    id: 'upgrade_escape_protocol_v2',
    displayName: 'Protocolo de Escape v2',
    description: 'Rutas de extracción asistidas por IA para estirar la ventana segura.',
    costCC: 340,
    effects: {
      catastropheThresholdBonus: 0.04,
    },
  },
  {
    id: 'upgrade_salvage_optimizer_v2',
    displayName: 'Optimizador de Salvamento v2',
    description: 'Calibración de pinzas y escáner para mejorar el rendimiento por riesgo.',
    costCC: 310,
    effects: {
      dangerLootBonusMultiplier: 1.15,
    },
  },
  {
    id: 'upgrade_adaptive_plating_v1',
    displayName: 'Blindaje Adaptativo v1',
    description: 'Microcapas reactivas que reducen picos de peligro y elevan el umbral.',
    costCC: 420,
    effects: {
      baseRateMultiplier: 0.95,
      catastropheThresholdBonus: 0.03,
    },
  },
  {
    id: 'upgrade_entropy_shielding_v1',
    displayName: 'Blindaje Entrópico v1',
    description: 'Capas de fase que absorben microfracturas y estabilizan picos críticos.',
    costCC: 560,
    effects: {
      quadraticFactorMultiplier: 0.9,
      catastropheThresholdBonus: 0.035,
    },
  },
  {
    id: 'upgrade_tactical_telemetry_v1',
    displayName: 'Telemetría Táctica v1',
    description: 'Predicción de rutas densas de chatarra para mejorar retorno por riesgo.',
    costCC: 640,
    effects: {
      dangerLootBonusMultiplier: 1.18,
    },
  },
  {
    id: 'upgrade_vector_thrusters_v1',
    displayName: 'Micropropulsores Vectoriales v1',
    description: 'Corrección dinámica de trayectoria para reducir exposición base al peligro.',
    costCC: 590,
    effects: {
      baseRateMultiplier: 0.94,
      catastropheThresholdBonus: 0.02,
    },
  },
];

export const UPGRADE_DEFINITION_BY_ID: Readonly<Record<string, AccountUpgradeDefinition>> =
  UPGRADE_DEFINITIONS.reduce<Record<string, AccountUpgradeDefinition>>((acc, definition) => {
    acc[definition.id] = definition;
    return acc;
  }, {});
