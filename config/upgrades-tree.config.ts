export type UpgradeBranch = 'BRIDGE' | 'WORKSHOP' | 'BLACK_MARKET';

export type UpgradeNodeRarity = 'UTILITY' | 'TACTICAL' | 'ASPIRATIONAL';

export interface UpgradeEffectSet {
  readonly baseRateMultiplier?: number;
  readonly quadraticFactorMultiplier?: number;
  readonly catastropheThresholdBonus?: number;
  readonly dangerLootBonusMultiplier?: number;
  readonly extractionRewardMultiplier?: number;
  readonly extractionXpMultiplier?: number;
  readonly craftingCostMultiplier?: number;
  readonly workshopTierBoost?: number;
  readonly marketBuyPriceMultiplier?: number;
  readonly marketSellPriceMultiplier?: number;
  readonly blackMarketAccessTier?: number;
}

export interface UpgradeNodeLevelDefinition {
  readonly level: number;
  readonly costCC: number;
  readonly unlockDurationSec: number;
  readonly effects: UpgradeEffectSet;
}

export interface UpgradeNodeDefinition {
  readonly id: string;
  readonly branch: UpgradeBranch;
  readonly tier: number;
  readonly lane: 0 | 1;
  readonly parents: readonly string[];
  readonly displayName: string;
  readonly description: string;
  readonly icon: string;
  readonly rarity: UpgradeNodeRarity;
  readonly category: string;
  readonly levels: readonly UpgradeNodeLevelDefinition[];
}

export const UPGRADE_BRANCH_META: Readonly<Record<UpgradeBranch, {
  label: string;
  description: string;
  accentColorClass: string;
  glowClass: string;
}>> = {
  BRIDGE: {
    label: 'Nave · Puente de Mando',
    description: 'Control de amenaza, estabilidad y rendimiento de extracción en expedición.',
    accentColorClass: 'text-cyan-300',
    glowClass: 'shadow-[0_0_25px_rgba(34,211,238,0.35)]',
  },
  WORKSHOP: {
    label: 'Taller',
    description: 'Eficiencia de fabricación, autorizaciones de tier y rendimiento técnico.',
    accentColorClass: 'text-orange-300',
    glowClass: 'shadow-[0_0_25px_rgba(251,146,60,0.35)]',
  },
  BLACK_MARKET: {
    label: 'Mercado Negro',
    description: 'Margen comercial, acceso clandestino y optimización de operaciones económicas.',
    accentColorClass: 'text-fuchsia-300',
    glowClass: 'shadow-[0_0_25px_rgba(217,70,239,0.35)]',
  },
};

export const UPGRADE_TREE_DEFINITIONS: readonly UpgradeNodeDefinition[] = [
  // BRIDGE
  {
    id: 'bridge_hull_stabilizers',
    branch: 'BRIDGE',
    tier: 0,
    lane: 0,
    parents: [],
    displayName: 'Estabilizadores de Casco',
    description: 'Reduce la escalada base de amenaza y suaviza picos tempranos.',
    icon: 'shield',
    rarity: 'UTILITY',
    category: 'Control de amenaza',
    levels: [
      { level: 1, costCC: 120, unlockDurationSec: 90, effects: { baseRateMultiplier: 0.95, quadraticFactorMultiplier: 0.97 } },
      { level: 2, costCC: 260, unlockDurationSec: 210, effects: { baseRateMultiplier: 0.94, quadraticFactorMultiplier: 0.96 } },
      { level: 3, costCC: 520, unlockDurationSec: 420, effects: { baseRateMultiplier: 0.93, quadraticFactorMultiplier: 0.95 } },
    ],
  },
  {
    id: 'bridge_salvage_routing',
    branch: 'BRIDGE',
    tier: 1,
    lane: 0,
    parents: ['bridge_hull_stabilizers'],
    displayName: 'Ruteo de Salvamento',
    description: 'Ajusta rutas para priorizar zonas de densidad alta de botín.',
    icon: 'route',
    rarity: 'TACTICAL',
    category: 'Rendimiento de extracción',
    levels: [
      { level: 1, costCC: 210, unlockDurationSec: 180, effects: { dangerLootBonusMultiplier: 1.08 } },
      { level: 2, costCC: 440, unlockDurationSec: 360, effects: { dangerLootBonusMultiplier: 1.1, extractionRewardMultiplier: 1.03 } },
      { level: 3, costCC: 880, unlockDurationSec: 720, effects: { dangerLootBonusMultiplier: 1.12, extractionRewardMultiplier: 1.05 } },
    ],
  },
  {
    id: 'bridge_escape_orchestrator',
    branch: 'BRIDGE',
    tier: 1,
    lane: 1,
    parents: ['bridge_hull_stabilizers'],
    displayName: 'Orquestador de Escape',
    description: 'Amplía margen de extracción segura y reduce penalización por caos operativo.',
    icon: 'rocket',
    rarity: 'TACTICAL',
    category: 'Supervivencia',
    levels: [
      { level: 1, costCC: 240, unlockDurationSec: 180, effects: { catastropheThresholdBonus: 0.018 } },
      { level: 2, costCC: 500, unlockDurationSec: 390, effects: { catastropheThresholdBonus: 0.022 } },
      { level: 3, costCC: 980, unlockDurationSec: 780, effects: { catastropheThresholdBonus: 0.026, extractionXpMultiplier: 1.04 } },
    ],
  },
  {
    id: 'bridge_vector_thrusters',
    branch: 'BRIDGE',
    tier: 2,
    lane: 0,
    parents: ['bridge_salvage_routing'],
    displayName: 'Micropropulsores Vectoriales',
    description: 'Corrección dinámica de trayectoria para sostener runs largas sin colapsar.',
    icon: 'gauge',
    rarity: 'ASPIRATIONAL',
    category: 'Dominio tardío',
    levels: [
      { level: 1, costCC: 760, unlockDurationSec: 900, effects: { baseRateMultiplier: 0.92, catastropheThresholdBonus: 0.018 } },
      { level: 2, costCC: 1320, unlockDurationSec: 1440, effects: { baseRateMultiplier: 0.9, catastropheThresholdBonus: 0.02, extractionRewardMultiplier: 1.04 } },
    ],
  },
  {
    id: 'bridge_telemetry_ai',
    branch: 'BRIDGE',
    tier: 2,
    lane: 1,
    parents: ['bridge_salvage_routing', 'bridge_escape_orchestrator'],
    displayName: 'IA de Telemetría Táctica',
    description: 'Predicción de corredores de chatarra con alto retorno/segundo.',
    icon: 'cpu',
    rarity: 'ASPIRATIONAL',
    category: 'Nodo aspiracional',
    levels: [
      { level: 1, costCC: 920, unlockDurationSec: 1020, effects: { dangerLootBonusMultiplier: 1.14, extractionRewardMultiplier: 1.06 } },
      { level: 2, costCC: 1580, unlockDurationSec: 1620, effects: { dangerLootBonusMultiplier: 1.16, extractionRewardMultiplier: 1.08, extractionXpMultiplier: 1.06 } },
    ],
  },

  // WORKSHOP
  {
    id: 'workshop_modular_forges',
    branch: 'WORKSHOP',
    tier: 0,
    lane: 0,
    parents: [],
    displayName: 'Forjas Modulares',
    description: 'Optimiza consumo base del taller para abaratar fabricación inicial.',
    icon: 'hammer',
    rarity: 'UTILITY',
    category: 'Economía de fabricación',
    levels: [
      { level: 1, costCC: 130, unlockDurationSec: 80, effects: { craftingCostMultiplier: 0.94 } },
      { level: 2, costCC: 280, unlockDurationSec: 180, effects: { craftingCostMultiplier: 0.92 } },
      { level: 3, costCC: 560, unlockDurationSec: 380, effects: { craftingCostMultiplier: 0.9 } },
    ],
  },
  {
    id: 'workshop_tier_authorization',
    branch: 'WORKSHOP',
    tier: 1,
    lane: 0,
    parents: ['workshop_modular_forges'],
    displayName: 'Autorización de Tier',
    description: 'Abre acceso anticipado a planos raros y épicos.',
    icon: 'key-round',
    rarity: 'TACTICAL',
    category: 'Desbloqueo de crafting',
    levels: [
      { level: 1, costCC: 260, unlockDurationSec: 220, effects: { workshopTierBoost: 1 } },
      { level: 2, costCC: 640, unlockDurationSec: 560, effects: { workshopTierBoost: 2 } },
    ],
  },
  {
    id: 'workshop_precision_jigs',
    branch: 'WORKSHOP',
    tier: 1,
    lane: 1,
    parents: ['workshop_modular_forges'],
    displayName: 'Plantillas de Precisión',
    description: 'Reduce requisitos de nivel efectivo en recetas complejas.',
    icon: 'wrench',
    rarity: 'TACTICAL',
    category: 'Ritmo de progresión',
    levels: [
      { level: 1, costCC: 240, unlockDurationSec: 210, effects: { craftingCostMultiplier: 0.96, workshopTierBoost: 1 } },
      { level: 2, costCC: 520, unlockDurationSec: 480, effects: { craftingCostMultiplier: 0.94, workshopTierBoost: 1 } },
    ],
  },
  {
    id: 'workshop_epic_protocols',
    branch: 'WORKSHOP',
    tier: 2,
    lane: 0,
    parents: ['workshop_tier_authorization'],
    displayName: 'Protocolos Épicos',
    description: 'Estabiliza fabricación de planos de alto tier con menor fricción.',
    icon: 'flask-conical',
    rarity: 'ASPIRATIONAL',
    category: 'Power spike de taller',
    levels: [
      { level: 1, costCC: 860, unlockDurationSec: 960, effects: { craftingCostMultiplier: 0.88, workshopTierBoost: 2 } },
      { level: 2, costCC: 1460, unlockDurationSec: 1560, effects: { craftingCostMultiplier: 0.86, workshopTierBoost: 2 } },
    ],
  },
  {
    id: 'workshop_autofab_mesh',
    branch: 'WORKSHOP',
    tier: 2,
    lane: 1,
    parents: ['workshop_tier_authorization', 'workshop_precision_jigs'],
    displayName: 'Malla AutoFab',
    description: 'Automatización ligera para reducir costes en cadena y mejorar ritmo de iteración.',
    icon: 'bot',
    rarity: 'ASPIRATIONAL',
    category: 'Escalado de crafteo',
    levels: [
      { level: 1, costCC: 980, unlockDurationSec: 1020, effects: { craftingCostMultiplier: 0.87, workshopTierBoost: 2 } },
      { level: 2, costCC: 1720, unlockDurationSec: 1680, effects: { craftingCostMultiplier: 0.84, workshopTierBoost: 3 } },
    ],
  },

  // BLACK MARKET
  {
    id: 'market_broker_network',
    branch: 'BLACK_MARKET',
    tier: 0,
    lane: 0,
    parents: [],
    displayName: 'Red de Brokers',
    description: 'Mejora margen en compraventa básica y reduce fricción por transacción.',
    icon: 'coins',
    rarity: 'UTILITY',
    category: 'Margen comercial',
    levels: [
      { level: 1, costCC: 150, unlockDurationSec: 100, effects: { marketBuyPriceMultiplier: 0.97, marketSellPriceMultiplier: 1.04 } },
      { level: 2, costCC: 320, unlockDurationSec: 220, effects: { marketBuyPriceMultiplier: 0.95, marketSellPriceMultiplier: 1.06 } },
      { level: 3, costCC: 680, unlockDurationSec: 460, effects: { marketBuyPriceMultiplier: 0.93, marketSellPriceMultiplier: 1.08 } },
    ],
  },
  {
    id: 'market_shadow_auctions',
    branch: 'BLACK_MARKET',
    tier: 1,
    lane: 0,
    parents: ['market_broker_network'],
    displayName: 'Subastas Sombra',
    description: 'Desbloquea catálogo clandestino de tier medio en el mercado.',
    icon: 'gavel',
    rarity: 'TACTICAL',
    category: 'Acceso exclusivo',
    levels: [
      { level: 1, costCC: 360, unlockDurationSec: 260, effects: { blackMarketAccessTier: 1, marketBuyPriceMultiplier: 0.97 } },
      { level: 2, costCC: 820, unlockDurationSec: 760, effects: { blackMarketAccessTier: 2, marketBuyPriceMultiplier: 0.95 } },
    ],
  },
  {
    id: 'market_favor_protocols',
    branch: 'BLACK_MARKET',
    tier: 1,
    lane: 1,
    parents: ['market_broker_network'],
    displayName: 'Protocolos de Favores',
    description: 'Recorta comisión oculta y mejora salida de materiales raros.',
    icon: 'handshake',
    rarity: 'TACTICAL',
    category: 'Optimización de venta',
    levels: [
      { level: 1, costCC: 340, unlockDurationSec: 250, effects: { marketSellPriceMultiplier: 1.08 } },
      { level: 2, costCC: 760, unlockDurationSec: 700, effects: { marketSellPriceMultiplier: 1.11, marketBuyPriceMultiplier: 0.98 } },
    ],
  },
  {
    id: 'market_risk_syndicate',
    branch: 'BLACK_MARKET',
    tier: 2,
    lane: 0,
    parents: ['market_shadow_auctions'],
    displayName: 'Sindicato de Riesgo',
    description: 'Abre acceso a mercancía de alto riesgo y alto retorno.',
    icon: 'skull',
    rarity: 'ASPIRATIONAL',
    category: 'High risk / high reward',
    levels: [
      { level: 1, costCC: 960, unlockDurationSec: 1050, effects: { blackMarketAccessTier: 3, marketSellPriceMultiplier: 1.12 } },
      { level: 2, costCC: 1680, unlockDurationSec: 1740, effects: { blackMarketAccessTier: 3, marketSellPriceMultiplier: 1.15, extractionRewardMultiplier: 1.04 } },
    ],
  },
  {
    id: 'market_quantum_barter',
    branch: 'BLACK_MARKET',
    tier: 2,
    lane: 1,
    parents: ['market_shadow_auctions', 'market_favor_protocols'],
    displayName: 'Trueque Cuántico',
    description: 'Nodo final de economía: compras más baratas, ventas premium y flujo táctico.',
    icon: 'sparkles',
    rarity: 'ASPIRATIONAL',
    category: 'Nodo aspiracional',
    levels: [
      { level: 1, costCC: 1120, unlockDurationSec: 1140, effects: { marketBuyPriceMultiplier: 0.9, marketSellPriceMultiplier: 1.12 } },
      { level: 2, costCC: 1940, unlockDurationSec: 1860, effects: { marketBuyPriceMultiplier: 0.88, marketSellPriceMultiplier: 1.16, extractionRewardMultiplier: 1.05 } },
    ],
  },
] as const;

export const UPGRADE_NODE_BY_ID: Readonly<Record<string, UpgradeNodeDefinition>> = UPGRADE_TREE_DEFINITIONS.reduce<
  Record<string, UpgradeNodeDefinition>
>((acc, node) => {
  acc[node.id] = node;
  return acc;
}, {});

export const UPGRADE_TREE_BRANCHES: readonly UpgradeBranch[] = ['BRIDGE', 'WORKSHOP', 'BLACK_MARKET'];

