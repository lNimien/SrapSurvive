import { redirect } from 'next/navigation';
import { AlertTriangle, ShieldCheck, TrendingDown, TrendingUp, Users } from 'lucide-react';

import { featureFlags } from '@/config/feature-flags.config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import { auth } from '@/server/auth/auth';
import { isAdminUser } from '@/server/auth/admin';
import { EconomyObservabilityService } from '@/server/services/economy-observability.service';
import { getActiveMutationKillSwitches } from '@/server/services/mutation-guard.service';
import { MutatorTuningService } from '@/server/services/mutator-tuning.service';
import { MutatorActionPackPanel } from '@/components/game/ops/MutatorActionPackPanel';

export const metadata = {
  title: 'Ops — Scrap & Survive',
  description: 'Panel interno de observabilidad económica para operación y anti-fraude.',
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-ES').format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatLatency(value: number | null): string {
  if (value === null) {
    return '—';
  }

  return `${formatNumber(value)} ms`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const WEEKLY_CLAIM_OUTCOME_LABELS = {
  CLAIMED: 'Claimed',
  ALREADY_CLAIMED: 'Already Claimed',
  NOT_CLAIMABLE: 'Not Claimable',
  FEATURE_DISABLED: 'Feature Disabled',
  ERROR: 'Error',
} as const;

function statusLabel(status: 'healthy' | 'warning' | 'critical'): string {
  if (status === 'healthy') {
    return 'Saludable';
  }

  if (status === 'warning') {
    return 'Atención';
  }

  return 'Crítico';
}

function statusBadgeClass(status: 'healthy' | 'warning' | 'critical'): string {
  if (status === 'healthy') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  }

  if (status === 'warning') {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  }

  return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
}

function mutatorStatusLabel(status: 'healthy' | 'warning' | 'critical' | 'insufficient_data'): string {
  if (status === 'insufficient_data') {
    return 'Muestra baja';
  }

  return statusLabel(status);
}

function mutatorStatusBadgeClass(status: 'healthy' | 'warning' | 'critical' | 'insufficient_data'): string {
  if (status === 'insufficient_data') {
    return 'border-slate-500/40 bg-slate-500/10 text-slate-300';
  }

  return statusBadgeClass(status);
}

export default async function OpsPage() {
  if (!featureFlags.c1EconomyTelemetry) {
    return (
      <main className="mx-auto w-full max-w-5xl py-8">
        <Card className="border-primary/30 bg-background/80">
          <CardHeader>
            <CardTitle className="font-mono text-primary uppercase tracking-widest">Módulo no habilitado</CardTitle>
            <CardDescription>
              La telemetría interna de economía (C.1) está desactivada por feature flag.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Activa <code>FEATURE_C1_ECONOMY_TELEMETRY</code> para habilitar este panel.
          </CardContent>
        </Card>
      </main>
    );
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !isAdminUser(userId)) {
    redirect('/dashboard');
  }

  const killSwitches = getActiveMutationKillSwitches();
  const hasActiveKillSwitch = killSwitches.some((switchState) => switchState.active);
  const telemetry = await EconomyObservabilityService.getEconomyTelemetry({
    hasActiveIncident: hasActiveKillSwitch,
    reviewerUserId: userId,
  });

  const nowMs = new Date(telemetry.runMutatorActionPack.generatedAt).getTime();
  const history24h = telemetry.mutatorAdjustmentHistory.filter((entry) => nowMs - new Date(entry.createdAt).getTime() <= 24 * 60 * 60 * 1_000);
  const history7d = telemetry.mutatorAdjustmentHistory.filter((entry) => nowMs - new Date(entry.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1_000);
  const history30d = telemetry.mutatorAdjustmentHistory;

  const suggestedMutatorModePairs = Array.from(
    new Set(telemetry.runMutatorActionPack.suggestions.map((suggestion) => `${suggestion.mutatorId}:${suggestion.runMode}`)),
  );

  const capsByMutatorKeyEntries = await Promise.all(
    suggestedMutatorModePairs.map(async (pair) => {
      const [mutatorId, runModeRaw] = pair.split(':');
      const runMode = runModeRaw === 'HARD' ? 'HARD' : 'SAFE';
      const caps = await MutatorTuningService.getPolicyCaps(mutatorId, runMode);

      return [pair, {
        maxAbsRewardDeltaPercent: caps.maxAbsRewardDeltaPercent,
        maxAbsDangerDeltaPercent: caps.maxAbsDangerDeltaPercent,
      }] as const;
    }),
  );

  const capsByMutatorKey = Object.fromEntries(capsByMutatorKeyEntries);

  return (
    <main className="mx-auto w-full max-w-6xl py-6 space-y-6" aria-labelledby="ops-title">
      <header className="space-y-2">
        <h1 id="ops-title" className="font-sans text-3xl font-bold uppercase tracking-[0.12em] text-primary">
          Panel Ops — Economía Interna
        </h1>
        <p className="text-sm text-muted-foreground">
          Métricas de observabilidad C.1 para monitoreo de fuentes, sinks y actividad operacional.
        </p>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Mutator tuning source: {telemetry.mutatorTuningSource === 'table_primary' ? 'TABLE PRIMARY' : 'AUDIT FALLBACK'}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Resumen 24 horas">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Faucet 24h</CardDescription>
            <CardTitle className="text-2xl text-emerald-400">+{formatNumber(telemetry.window24h.faucetTotal)} CC</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            Total generado por entradas clasificadas como faucet.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sink 24h</CardDescription>
            <CardTitle className="text-2xl text-rose-400">-{formatNumber(telemetry.window24h.sinkTotal)} CC</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingDown className="h-4 w-4 text-rose-400" aria-hidden="true" />
            Total drenado por entradas clasificadas como sink.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Delta neto 24h</CardDescription>
            <CardTitle className="text-2xl">{formatNumber(telemetry.window24h.netDelta)} CC</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            Faucet + sink en ventana de 24 horas.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Usuarios activos 24h</CardDescription>
            <CardTitle className="text-2xl">{formatNumber(telemetry.window24h.activeUsers)}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-4 w-4 text-primary" aria-hidden="true" />
            Usuarios únicos en ledger o resultados de extracción.
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Ventanas operativas">
        <Card>
          <CardHeader>
            <CardTitle className="uppercase tracking-wider">Actividad de extracciones</CardTitle>
            <CardDescription>Comparativa 24h vs 7d.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">Éxito 24h</p>
                <p className="text-xl font-semibold">{formatNumber(telemetry.window24h.extractionSuccessCount)}</p>
              </div>
              <div className="rounded-md border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">Fallidas 24h</p>
                <p className="text-xl font-semibold">{formatNumber(telemetry.window24h.extractionFailedCount)}</p>
              </div>
              <div className="rounded-md border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">Éxito 7d</p>
                <p className="text-xl font-semibold">{formatNumber(telemetry.window7d.extractionSuccessCount)}</p>
              </div>
              <div className="rounded-md border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">Fallidas 7d</p>
                <p className="text-xl font-semibold">{formatNumber(telemetry.window7d.extractionFailedCount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="uppercase tracking-wider">Economía agregada 7d</CardTitle>
            <CardDescription>Lectura extendida para estabilidad macro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Faucet:</span>{' '}
              <span className="font-semibold text-emerald-400">+{formatNumber(telemetry.window7d.faucetTotal)} CC</span>
            </p>
            <p>
              <span className="text-muted-foreground">Sink:</span>{' '}
              <span className="font-semibold text-rose-400">-{formatNumber(telemetry.window7d.sinkTotal)} CC</span>
            </p>
            <p>
              <span className="text-muted-foreground">Delta neto:</span>{' '}
              <span className="font-semibold">{formatNumber(telemetry.window7d.netDelta)} CC</span>
            </p>
            <p>
              <span className="text-muted-foreground">Usuarios activos:</span>{' '}
              <span className="font-semibold">{formatNumber(telemetry.window7d.activeUsers)}</span>
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4" aria-label="Kill switches de mutaciones críticas">
        <Card className={cn(hasActiveKillSwitch && 'border-amber-500/50')}>
          <CardHeader>
            <CardTitle className="uppercase tracking-wider">Kill switches de mutaciones</CardTitle>
            <CardDescription>
              Controles operativos para congelar mutaciones económicas críticas sin interrumpir lecturas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-2">
              {killSwitches.map((switchState) => (
                <li
                  key={switchState.envVar}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/70 p-3"
                >
                  <div>
                    <p className="font-semibold">{switchState.label}</p>
                    <p className="font-mono text-xs text-muted-foreground">{switchState.envVar}</p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                      switchState.active
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                        : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
                    )}
                  >
                    {switchState.active ? 'Activo' : 'Inactivo'}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Top de entradas económicas">
        <Card>
          <CardHeader>
            <CardTitle className="uppercase tracking-wider">Top faucets (24h)</CardTitle>
            <CardDescription>Tipos de entrada con mayor generación de CC.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {telemetry.topFaucetEntryTypes24h.length === 0 && (
                <li className="text-muted-foreground">Sin actividad faucet en las últimas 24h.</li>
              )}
              {telemetry.topFaucetEntryTypes24h.map((entry) => (
                <li key={entry.entryType} className="flex items-center justify-between rounded-md border border-border/60 p-2">
                  <span className="font-mono text-xs uppercase tracking-widest">{entry.entryType}</span>
                  <span className="font-semibold text-emerald-400">+{formatNumber(entry.totalAmount)} CC</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="uppercase tracking-wider">Top sinks (24h)</CardTitle>
            <CardDescription>Tipos de entrada con mayor drenaje de CC.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {telemetry.topSinkEntryTypes24h.length === 0 && (
                <li className="flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  Sin actividad sink en las últimas 24h.
                </li>
              )}
              {telemetry.topSinkEntryTypes24h.map((entry) => (
                <li key={entry.entryType} className="flex items-center justify-between rounded-md border border-border/60 p-2">
                  <span className="font-mono text-xs uppercase tracking-widest">{entry.entryType}</span>
                  <span className="font-semibold text-rose-400">-{formatNumber(entry.totalAmount)} CC</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4" aria-label="Salud operativa de weekly claims">
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="uppercase tracking-wider">Weekly Claims Health</CardTitle>
            <CardDescription>
              Observabilidad D.4b para claims semanales: volumen por outcome, ratio de éxito, latencia y faucet por item.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-md border border-border/60 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Ventana 24h</p>
                <p className="mt-2 text-lg font-semibold">{formatPercent(telemetry.weeklyClaimsHealth.window24h.successRatio)}</p>
                <p className="text-xs text-muted-foreground">Ratio de éxito de claims</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border border-border/60 p-2">
                    <p className="text-muted-foreground">p50</p>
                    <p className="font-semibold">{formatLatency(telemetry.weeklyClaimsHealth.window24h.latency.p50Ms)}</p>
                  </div>
                  <div className="rounded border border-border/60 p-2">
                    <p className="text-muted-foreground">p95</p>
                    <p className="font-semibold">{formatLatency(telemetry.weeklyClaimsHealth.window24h.latency.p95Ms)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-border/60 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Ventana 7d</p>
                <p className="mt-2 text-lg font-semibold">{formatPercent(telemetry.weeklyClaimsHealth.window7d.successRatio)}</p>
                <p className="text-xs text-muted-foreground">Ratio de éxito de claims</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border border-border/60 p-2">
                    <p className="text-muted-foreground">p50</p>
                    <p className="font-semibold">{formatLatency(telemetry.weeklyClaimsHealth.window7d.latency.p50Ms)}</p>
                  </div>
                  <div className="rounded border border-border/60 p-2">
                    <p className="text-muted-foreground">p95</p>
                    <p className="font-semibold">{formatLatency(telemetry.weeklyClaimsHealth.window7d.latency.p95Ms)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border border-border/60">
              <table className="w-full min-w-[520px] text-sm">
                <caption className="sr-only">Conteo de intentos de claim por outcome en ventanas de 24h y 7d.</caption>
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Outcome</th>
                    <th className="px-3 py-2 text-right">24h</th>
                    <th className="px-3 py-2 text-right">7d</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(WEEKLY_CLAIM_OUTCOME_LABELS).map(([outcome, label]) => (
                    <tr key={outcome} className="border-t border-border/60">
                      <td className="px-3 py-2 font-mono text-xs uppercase tracking-wide">{label}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {
                          telemetry.weeklyClaimsHealth.window24h.attemptsByOutcome[
                            outcome as keyof typeof telemetry.weeklyClaimsHealth.window24h.attemptsByOutcome
                          ]
                        }
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {
                          telemetry.weeklyClaimsHealth.window7d.attemptsByOutcome[
                            outcome as keyof typeof telemetry.weeklyClaimsHealth.window7d.attemptsByOutcome
                          ]
                        }
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-border/60 bg-muted/20">
                    <td className="px-3 py-2 font-semibold">Total attempts</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {telemetry.weeklyClaimsHealth.window24h.totalAttempts}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {telemetry.weeklyClaimsHealth.window7d.totalAttempts}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-md border border-border/60 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Item faucet semanal — 24h</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {telemetry.weeklyClaimsHealth.window24h.itemFaucetByItemDef.length === 0 && (
                    <li className="text-muted-foreground">Sin ítems otorgados por claims en 24h.</li>
                  )}
                  {telemetry.weeklyClaimsHealth.window24h.itemFaucetByItemDef.map((item) => (
                    <li key={`24h-${item.itemDefinitionId}`} className="flex items-center justify-between rounded border border-border/60 p-2">
                      <span className="font-mono text-xs">{item.itemDefinitionId}</span>
                      <span className="font-semibold">+{formatNumber(item.quantity)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md border border-border/60 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Item faucet semanal — 7d</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {telemetry.weeklyClaimsHealth.window7d.itemFaucetByItemDef.length === 0 && (
                    <li className="text-muted-foreground">Sin ítems otorgados por claims en 7d.</li>
                  )}
                  {telemetry.weeklyClaimsHealth.window7d.itemFaucetByItemDef.map((item) => (
                    <li key={`7d-${item.itemDefinitionId}`} className="flex items-center justify-between rounded border border-border/60 p-2">
                      <span className="font-mono text-xs">{item.itemDefinitionId}</span>
                      <span className="font-semibold">+{formatNumber(item.quantity)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4" aria-label="Salud de mutadores tácticos">
        <Card className="border-fuchsia-500/30">
          <CardHeader>
            <CardTitle className="uppercase tracking-wider">Run Mutator Health</CardTitle>
            <CardDescription>
              Rendimiento de mutadores por modo (SAFE/HARD): volumen, tasa de extracción y duración promedio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-md border border-border/60">
              <table className="w-full min-w-[640px] text-sm">
                <caption className="sr-only">Métricas de mutadores en 24h.</caption>
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Mutador</th>
                    <th className="px-3 py-2 text-left">Modo</th>
                    <th className="px-3 py-2 text-left">Estado</th>
                    <th className="px-3 py-2 text-right">Runs</th>
                    <th className="px-3 py-2 text-right">Extracted</th>
                    <th className="px-3 py-2 text-right">Failed</th>
                    <th className="px-3 py-2 text-right">Winrate</th>
                    <th className="px-3 py-2 text-right">Duración prom.</th>
                    <th className="px-3 py-2 text-left">Recomendación</th>
                  </tr>
                </thead>
                <tbody>
                  {telemetry.runMutatorHealth.window24h.length === 0 && (
                    <tr className="border-t border-border/60">
                      <td className="px-3 py-3 text-muted-foreground" colSpan={10}>
                        Sin datos de mutadores en la ventana de 24h.
                      </td>
                    </tr>
                  )}
                  {telemetry.runMutatorHealth.window24h.map((metric) => (
                    <tr key={`mutator-24h-${metric.mutatorId}-${metric.runMode}`} className="border-t border-border/60">
                      <td className="px-3 py-2 font-mono text-xs">{metric.mutatorId}</td>
                      <td className="px-3 py-2 font-semibold">{metric.runMode}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                            mutatorStatusBadgeClass(metric.guardrailStatus),
                          )}
                        >
                          {mutatorStatusLabel(metric.guardrailStatus)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{formatNumber(metric.totalRuns)}</td>
                      <td className="px-3 py-2 text-right text-emerald-300">{formatNumber(metric.extractedRuns)}</td>
                      <td className="px-3 py-2 text-right text-rose-300">{formatNumber(metric.failedRuns)}</td>
                      <td className="px-3 py-2 text-right">{formatPercent(metric.extractionRate)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(metric.averageDurationSeconds)}s</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{metric.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <MutatorActionPackPanel
          generatedAt={telemetry.runMutatorActionPack.generatedAt}
          policySummary={telemetry.runMutatorActionPack.policySummary}
          suggestions={telemetry.runMutatorActionPack.suggestions}
          recentAdjustedKeys7d={telemetry.mutatorRecentAdjustedKeys7d}
          capsByMutatorKey={capsByMutatorKey}
        />

        <Card className="border-fuchsia-500/20">
          <CardHeader>
            <CardTitle className="uppercase tracking-wider">Historial de ajustes de mutadores</CardTitle>
            <CardDescription>
              Trazabilidad de cambios aplicados con diff before → after y filtros por ventana.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              { label: '24h', rows: history24h },
              { label: '7d', rows: history7d },
              { label: '30d', rows: history30d },
            ].map((block) => (
              <div key={block.label} className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Ventana {block.label}</p>
                <div className="overflow-x-auto rounded-md border border-border/60">
                  <table className="w-full min-w-[920px] text-sm">
                    <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Fecha</th>
                        <th className="px-3 py-2 text-left">Mutador</th>
                        <th className="px-3 py-2 text-left">Modo</th>
                        <th className="px-3 py-2 text-left">Acción</th>
                        <th className="px-3 py-2 text-right">Delta sugerido</th>
                        <th className="px-3 py-2 text-left">Before → After</th>
                        <th className="px-3 py-2 text-left">Admin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.length === 0 ? (
                        <tr className="border-t border-border/60">
                          <td className="px-3 py-3 text-muted-foreground" colSpan={7}>Sin ajustes registrados.</td>
                        </tr>
                      ) : (
                        block.rows.map((entry) => (
                          <tr key={`${block.label}-${entry.createdAt}-${entry.mutatorId}-${entry.runMode}`} className="border-t border-border/60">
                            <td className="px-3 py-2 text-xs">{formatDateTime(entry.createdAt)}</td>
                            <td className="px-3 py-2 font-mono text-xs">{entry.mutatorId}</td>
                            <td className="px-3 py-2">{entry.runMode}</td>
                            <td className="px-3 py-2">{entry.actionType}</td>
                            <td className="px-3 py-2 text-right">{entry.suggestedDeltaPercent}%</td>
                            <td className="px-3 py-2 text-xs">
                              reward {entry.beforeProfile.rewardDeltaPercent}% → {entry.afterProfile.rewardDeltaPercent}% · danger {entry.beforeProfile.dangerPressureDeltaPercent}% → {entry.afterProfile.dangerPressureDeltaPercent}%
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{entry.appliedByUserId}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {featureFlags.d3BalanceGovernance && (
        <section className="space-y-4" aria-label="Gobernanza de balance D.3b">
          <Card className="border-primary/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 uppercase tracking-wider">
                Estado de guardrails D.3b
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold uppercase tracking-wider',
                    statusBadgeClass(telemetry.governance.overallStatus),
                  )}
                >
                  {statusLabel(telemetry.governance.overallStatus)}
                </span>
              </CardTitle>
              <CardDescription>
                Evaluación automática de ratio faucet/sink, tasa de catástrofe y participación de ventas en faucet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="space-y-2">
                {telemetry.governance.assessments.map((assessment) => (
                  <li
                    key={assessment.metricKey}
                    className="rounded-md border border-border/60 bg-background/70 p-3"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="font-semibold uppercase tracking-wide">{assessment.metricKey}</p>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                          statusBadgeClass(assessment.status),
                        )}
                      >
                        {statusLabel(assessment.status)}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{assessment.summary}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{assessment.recommendation}</p>
                  </li>
                ))}
              </ul>

              <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Recomendaciones operativas</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {telemetry.governance.recommendations.map((recommendation) => (
                    <li key={recommendation}>{recommendation}</li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-muted-foreground">
                Cadencia sugerida: revisión semanal + quincenal. Ejecutar runbook en{' '}
                <code>docs/balance-runbook.md</code> antes de cualquier ajuste de balance.
              </p>
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  );
}
