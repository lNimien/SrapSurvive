import 'server-only';

import { describe, expect, it } from 'vitest';

import {
  evaluateBalanceGovernanceGuardrails,
  type BalanceGovernanceSnapshot,
} from '@/config/balance-governance.config';

function evaluate(snapshot: BalanceGovernanceSnapshot) {
  return evaluateBalanceGovernanceGuardrails(snapshot);
}

describe('balance governance guardrails', () => {
  it('marks healthy snapshot with green recommendations', () => {
    const report = evaluate({
      faucetTotal24h: 1_000,
      sinkTotal24h: 900,
      extractionSuccessCount24h: 80,
      extractionFailedCount24h: 16,
      saleFaucetTotal24h: 180,
    });

    expect(report.overallStatus).toBe('healthy');
    expect(report.assessments.map((assessment) => assessment.status)).toEqual([
      'healthy',
      'healthy',
      'healthy',
    ]);
    expect(report.recommendations).toEqual([
      'Guardrails en verde: continuar con revisión semanal/quincenal definida en runbook.',
    ]);
  });

  it('flags warning when catastrophe rate is outside target band', () => {
    const report = evaluate({
      faucetTotal24h: 1_000,
      sinkTotal24h: 920,
      extractionSuccessCount24h: 60,
      extractionFailedCount24h: 5,
      saleFaucetTotal24h: 160,
    });

    expect(report.overallStatus).toBe('warning');

    const catastropheAssessment = report.assessments.find(
      (assessment) => assessment.metricKey === 'catastropheRate',
    );
    expect(catastropheAssessment?.status).toBe('warning');
    expect(catastropheAssessment?.summary).toContain('7.7%');
    expect(report.recommendations[0]).toContain('Revisar tuning de riesgo');
  });

  it('marks critical on runaway faucet/sink imbalance', () => {
    const report = evaluate({
      faucetTotal24h: 3_000,
      sinkTotal24h: 700,
      extractionSuccessCount24h: 45,
      extractionFailedCount24h: 40,
      saleFaucetTotal24h: 1_900,
    });

    expect(report.overallStatus).toBe('critical');
    expect(report.assessments.find((assessment) => assessment.metricKey === 'faucetSinkRatio')?.status).toBe(
      'critical',
    );
    expect(report.assessments.find((assessment) => assessment.metricKey === 'sellValueShare')?.status).toBe(
      'critical',
    );
    expect(report.recommendations.length).toBeGreaterThan(1);
  });
});
