export type GuardrailStatus = 'healthy' | 'warning' | 'critical';

export interface GuardrailBand {
  min: number;
  max: number;
}

export interface EconomyGuardrailThresholds {
  target: GuardrailBand;
  warning: GuardrailBand;
  critical: GuardrailBand;
}

export interface BalanceGovernanceConfig {
  economyGuardrails: {
    faucetSinkRatio: EconomyGuardrailThresholds;
    catastropheRate: EconomyGuardrailThresholds;
    sellValueShare: EconomyGuardrailThresholds;
  };
  reviewCadence: {
    weekly: string;
    biweekly: string;
    ownerRole: string;
    reportPath: string;
  };
  emergencyKnobs: {
    id: string;
    description: string;
    type: 'feature-flag' | 'operational';
    activationWhen: string;
  }[];
}

export interface BalanceGovernanceSnapshot {
  faucetTotal24h: number;
  sinkTotal24h: number;
  extractionSuccessCount24h: number;
  extractionFailedCount24h: number;
  saleFaucetTotal24h: number;
}

export interface BalanceGuardrailAssessment {
  metricKey: 'faucetSinkRatio' | 'catastropheRate' | 'sellValueShare';
  status: GuardrailStatus;
  value: number;
  summary: string;
  recommendation: string;
}

export interface BalanceGovernanceEvaluation {
  overallStatus: GuardrailStatus;
  assessments: BalanceGuardrailAssessment[];
  recommendations: string[];
}

const STATUS_PRIORITY: Record<GuardrailStatus, number> = {
  healthy: 0,
  warning: 1,
  critical: 2,
};

export const BALANCE_GOVERNANCE_CONFIG: BalanceGovernanceConfig = {
  economyGuardrails: {
    faucetSinkRatio: {
      target: { min: 0.9, max: 1.25 },
      warning: { min: 0.75, max: 1.45 },
      critical: { min: 0.6, max: 1.8 },
    },
    catastropheRate: {
      target: { min: 0.12, max: 0.3 },
      warning: { min: 0.08, max: 0.38 },
      critical: { min: 0.05, max: 0.48 },
    },
    sellValueShare: {
      target: { min: 0.08, max: 0.35 },
      warning: { min: 0.05, max: 0.45 },
      critical: { min: 0.03, max: 0.55 },
    },
  },
  reviewCadence: {
    weekly: 'Revisión operativa semanal (lunes): ratio faucet/sink + catástrofes + concentración de faucets.',
    biweekly: 'Revisión de gobernanza quincenal (martes alterno): validar ajustes de precio/recompensa con ventanas 14d.',
    ownerRole: 'Economy Owner + LiveOps On-Call',
    reportPath: 'docs/balance-runbook.md',
  },
  emergencyKnobs: [
    {
      id: 'FEATURE_C2_GLOBAL_MARKET_BETA',
      description: 'Detiene flujos de mercado global para evitar arbitraje o inflación lateral.',
      type: 'feature-flag',
      activationWhen: 'Desalineación faucet/sink sostenida o manipulación de precios.',
    },
    {
      id: 'FEATURE_C3_PREMIUM_SYSTEMS',
      description: 'Congela claims/compras premium para limitar exposición en incidente de monetización.',
      type: 'feature-flag',
      activationWhen: 'Inconsistencia de ledger premium o señales de fraude de pago.',
    },
    {
      id: 'FEATURE_C3_LIVE_OPS',
      description: 'Pausa activaciones de eventos liveops con impacto de recompensas.',
      type: 'feature-flag',
      activationWhen: 'Picos de catástrofe o faucet atípico tras evento.',
    },
    {
      id: 'ops.freeze-extraction-reward-adjustments',
      description: 'Congela cambios manuales de multiplicadores de recompensa hasta cerrar incidente.',
      type: 'operational',
      activationWhen: 'Runaway inflation o degradación brusca de retención por desbalance.',
    },
  ],
};

function classifyByBands(value: number, thresholds: EconomyGuardrailThresholds): GuardrailStatus {
  if (value < thresholds.critical.min || value > thresholds.critical.max) {
    return 'critical';
  }

  if (value < thresholds.warning.min || value > thresholds.warning.max) {
    return 'warning';
  }

  if (value < thresholds.target.min || value > thresholds.target.max) {
    return 'warning';
  }

  return 'healthy';
}

function worstStatus(statuses: GuardrailStatus[]): GuardrailStatus {
  let currentWorst: GuardrailStatus = 'healthy';

  for (const status of statuses) {
    if (STATUS_PRIORITY[status] > STATUS_PRIORITY[currentWorst]) {
      currentWorst = status;
    }
  }

  return currentWorst;
}

function toFixedRatio(value: number): number {
  return Number(value.toFixed(3));
}

function toFixedPercent(value: number): number {
  return Number(value.toFixed(4));
}

export function evaluateBalanceGovernanceGuardrails(
  snapshot: BalanceGovernanceSnapshot,
  config: BalanceGovernanceConfig = BALANCE_GOVERNANCE_CONFIG,
): BalanceGovernanceEvaluation {
  const sinkTotal = Math.abs(snapshot.sinkTotal24h);
  const extractionTotal = snapshot.extractionSuccessCount24h + snapshot.extractionFailedCount24h;

  const faucetSinkRatio =
    sinkTotal === 0
      ? snapshot.faucetTotal24h > 0
        ? Number.POSITIVE_INFINITY
        : 1
      : snapshot.faucetTotal24h / sinkTotal;
  const catastropheRate =
    extractionTotal === 0 ? 0 : snapshot.extractionFailedCount24h / extractionTotal;
  const sellValueShare =
    snapshot.faucetTotal24h <= 0 ? 0 : snapshot.saleFaucetTotal24h / snapshot.faucetTotal24h;

  const faucetSinkStatus = Number.isFinite(faucetSinkRatio)
    ? classifyByBands(faucetSinkRatio, config.economyGuardrails.faucetSinkRatio)
    : 'critical';

  const catastropheStatus =
    extractionTotal === 0
      ? 'warning'
      : classifyByBands(catastropheRate, config.economyGuardrails.catastropheRate);

  const sellValueStatus = classifyByBands(sellValueShare, config.economyGuardrails.sellValueShare);

  const assessments: BalanceGuardrailAssessment[] = [
    {
      metricKey: 'faucetSinkRatio',
      status: faucetSinkStatus,
      value: Number.isFinite(faucetSinkRatio) ? toFixedRatio(faucetSinkRatio) : faucetSinkRatio,
      summary: `Ratio faucet/sink 24h: ${Number.isFinite(faucetSinkRatio) ? toFixedRatio(faucetSinkRatio) : '∞'}`,
      recommendation:
        faucetSinkStatus === 'healthy'
          ? 'Mantener el plan de ajustes incremental (<10% por release).'
          : 'Congelar cambios agresivos de recompensas/costos y validar mix de sinks antes del próximo release.',
    },
    {
      metricKey: 'catastropheRate',
      status: catastropheStatus,
      value: toFixedPercent(catastropheRate),
      summary: `Tasa de catástrofe 24h: ${(catastropheRate * 100).toFixed(1)}%`,
      recommendation:
        extractionTotal === 0
          ? 'Sin runs suficientes en 24h: no ajustes balance sin revisar ventana 7d/14d.'
          : catastropheStatus === 'healthy'
            ? 'Mantener dificultad actual y monitorear cohortes nuevas.'
            : 'Revisar tuning de riesgo por zona/equipo y detener cambios acumulados hasta estabilizar la tasa.',
    },
    {
      metricKey: 'sellValueShare',
      status: sellValueStatus,
      value: toFixedPercent(sellValueShare),
      summary: `Participación de ventas en faucet 24h: ${(sellValueShare * 100).toFixed(1)}%`,
      recommendation:
        sellValueStatus === 'healthy'
          ? 'Mantener floor/ceiling de venta vigente y validar impacto por cohorte quincenal.'
          : 'Revisar floor/ceiling de venta: evitar hotfix inmediato sin simulación en staging.',
    },
  ];

  const recommendations = Array.from(
    new Set(
      assessments
        .filter((assessment) => assessment.status !== 'healthy')
        .map((assessment) => assessment.recommendation),
    ),
  );

  if (recommendations.length === 0) {
    recommendations.push('Guardrails en verde: continuar con revisión semanal/quincenal definida en runbook.');
  }

  return {
    overallStatus: worstStatus(assessments.map((assessment) => assessment.status)),
    assessments,
    recommendations,
  };
}
