'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import {
  applyMutatorSuggestionAction,
  rollbackMutatorSuggestionAction,
  setMutatorTuningCapsAction,
} from '@/server/actions/ops.actions';
import { useToast } from '@/hooks/use-toast';

type MutatorActionSuggestionView = {
  mutatorId: string;
  runMode: 'SAFE' | 'HARD';
  status: 'warning' | 'critical';
  actionType: 'buff_difficulty' | 'nerf_rewards' | 'hold';
  suggestedDeltaPercent: number;
  rationale: string;
  sampleSize: number;
  applicability: 'APPLICABLE' | 'BLOCKED';
  blockedReasons: string[];
};

interface MutatorActionPackPanelProps {
  generatedAt: string;
  policySummary: string[];
  suggestions: MutatorActionSuggestionView[];
  recentAdjustedKeys7d: string[];
  capsByMutatorKey: Record<string, {
    maxAbsRewardDeltaPercent: number;
    maxAbsDangerDeltaPercent: number;
  }>;
}

function buildMutatorModeKey(mutatorId: string, runMode: 'SAFE' | 'HARD'): string {
  return `${mutatorId}:${runMode}`;
}

export function MutatorActionPackPanel({
  generatedAt,
  policySummary,
  suggestions,
  recentAdjustedKeys7d,
  capsByMutatorKey,
}: MutatorActionPackPanelProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [capsDraftByMutatorKey, setCapsDraftByMutatorKey] = useState(capsByMutatorKey);

  function updateCapsDraft(
    mutatorId: string,
    runMode: 'SAFE' | 'HARD',
    field: 'maxAbsRewardDeltaPercent' | 'maxAbsDangerDeltaPercent',
    value: number,
  ) {
    const key = buildMutatorModeKey(mutatorId, runMode);
    setCapsDraftByMutatorKey((current) => ({
      ...current,
      [key]: {
        maxAbsRewardDeltaPercent: current[key]?.maxAbsRewardDeltaPercent ?? 10,
        maxAbsDangerDeltaPercent: current[key]?.maxAbsDangerDeltaPercent ?? 10,
        [field]: value,
      },
    }));
  }

  async function saveCaps(mutatorId: string, runMode: 'SAFE' | 'HARD') {
    const key = buildMutatorModeKey(mutatorId, runMode);
    const draft = capsDraftByMutatorKey[key] ?? {
      maxAbsRewardDeltaPercent: 10,
      maxAbsDangerDeltaPercent: 10,
    };

    const actionKey = `${key}:caps`;
    setPendingKey(actionKey);

    try {
      const result = await setMutatorTuningCapsAction({
        mutatorId,
        runMode,
        maxAbsRewardDeltaPercent: draft.maxAbsRewardDeltaPercent,
        maxAbsDangerDeltaPercent: draft.maxAbsDangerDeltaPercent,
      });

      if (!result.success) {
        toast({
          title: 'Caps no actualizados',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Caps actualizados',
        description: `${result.data.mutatorId} ${result.data.runMode} · ±reward ${result.data.maxAbsRewardDeltaPercent}% · ±danger ${result.data.maxAbsDangerDeltaPercent}%`,
        variant: 'success',
      });
      router.refresh();
    } finally {
      setPendingKey(null);
    }
  }

  async function runDryPreview(suggestion: MutatorActionSuggestionView) {
    const actionKey = `${suggestion.mutatorId}:${suggestion.runMode}:${suggestion.actionType}:dry`;
    setPendingKey(actionKey);

    try {
      const result = await applyMutatorSuggestionAction({
        mutatorId: suggestion.mutatorId,
        runMode: suggestion.runMode,
        actionType: suggestion.actionType,
        dryRun: true,
      });

      if (!result.success) {
        toast({
          title: 'Dry-run bloqueado',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Dry-run OK',
        description: `Preview ${result.data.actionType} (${result.data.suggestedDeltaPercent}%).`,
        variant: 'success',
      });
    } finally {
      setPendingKey(null);
    }
  }

  async function applySuggestion(suggestion: MutatorActionSuggestionView) {
    const confirmed = window.confirm(
      `Vas a aplicar ${suggestion.actionType} sobre ${suggestion.mutatorId} (${suggestion.runMode}) con delta ${suggestion.suggestedDeltaPercent}%. ¿Continuar?`,
    );

    if (!confirmed) {
      return;
    }

    const actionKey = `${suggestion.mutatorId}:${suggestion.runMode}:${suggestion.actionType}:apply`;
    setPendingKey(actionKey);

    try {
      const result = await applyMutatorSuggestionAction({
        mutatorId: suggestion.mutatorId,
        runMode: suggestion.runMode,
        actionType: suggestion.actionType,
        dryRun: false,
      });

      if (!result.success) {
        toast({
          title: 'Apply bloqueado',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Ajuste aplicado',
        description: `${result.data.mutatorId} ${result.data.runMode} · ${result.data.actionType}`,
        variant: 'success',
      });
      router.refresh();
    } finally {
      setPendingKey(null);
    }
  }

  async function rollbackSuggestion(suggestion: MutatorActionSuggestionView) {
    const confirmed = window.confirm(
      `Vas a revertir a perfil neutral ${suggestion.mutatorId} (${suggestion.runMode}). ¿Continuar?`,
    );

    if (!confirmed) {
      return;
    }

    const actionKey = `${suggestion.mutatorId}:${suggestion.runMode}:rollback`;
    setPendingKey(actionKey);

    try {
      const result = await rollbackMutatorSuggestionAction({
        mutatorId: suggestion.mutatorId,
        runMode: suggestion.runMode,
      });

      if (!result.success) {
        toast({
          title: 'Rollback bloqueado',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Rollback aplicado',
        description: `${result.data.mutatorId} ${result.data.runMode} volvió a perfil neutral.`,
        variant: 'success',
      });
      router.refresh();
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <Card className="border-fuchsia-500/25">
      <CardHeader>
        <CardTitle className="uppercase tracking-wider">Action Pack sugerido (7d)</CardTitle>
        <CardDescription>
          Top 3 acciones recomendadas para balance de mutadores. Exportable al runbook operativo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">Generado: {generatedAt}</p>
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {policySummary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        {suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin sugerencias activas: mutadores dentro de banda o sin muestra suficiente.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {suggestions.map((suggestion) => {
              const dryKey = `${suggestion.mutatorId}:${suggestion.runMode}:${suggestion.actionType}:dry`;
              const applyKey = `${suggestion.mutatorId}:${suggestion.runMode}:${suggestion.actionType}:apply`;
              const dryPending = pendingKey === dryKey;
              const applyPending = pendingKey === applyKey;
              const rollbackKey = `${suggestion.mutatorId}:${suggestion.runMode}:rollback`;
              const rollbackPending = pendingKey === rollbackKey;
              const mutatorModeKey = buildMutatorModeKey(suggestion.mutatorId, suggestion.runMode);
              const capsKey = `${mutatorModeKey}:caps`;
              const capsPending = pendingKey === capsKey;
              const capsDraft = capsDraftByMutatorKey[mutatorModeKey] ?? {
                maxAbsRewardDeltaPercent: 10,
                maxAbsDangerDeltaPercent: 10,
              };

              return (
                <li key={`${suggestion.mutatorId}:${suggestion.runMode}:${suggestion.actionType}`} className="rounded border border-border/60 bg-background/70 p-3">
                  <p className="font-mono text-xs uppercase tracking-wider text-primary/80">
                    {suggestion.mutatorId} · {suggestion.runMode} · {suggestion.actionType}
                  </p>
                  {recentAdjustedKeys7d.includes(`${suggestion.mutatorId}:${suggestion.runMode}`) ? (
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-amber-300">
                      Ajuste reciente detectado (7d)
                    </p>
                  ) : null}
                  <p className="mt-1">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                        suggestion.applicability === 'APPLICABLE'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : 'border-rose-500/40 bg-rose-500/10 text-rose-300',
                      )}
                    >
                      {suggestion.applicability}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Delta sugerido: {suggestion.suggestedDeltaPercent}% · Muestra: {suggestion.sampleSize} runs</p>
                  <p className="mt-1">{suggestion.rationale}</p>

                  {suggestion.blockedReasons.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-200">
                      {suggestion.blockedReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => runDryPreview(suggestion)}
                      disabled={pendingKey !== null}
                      aria-label={`Ejecutar dry-run para ${suggestion.mutatorId} ${suggestion.runMode}`}
                    >
                      {dryPending ? 'Dry-run...' : 'Dry-run'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => applySuggestion(suggestion)}
                      disabled={pendingKey !== null || suggestion.applicability === 'BLOCKED'}
                      aria-label={`Aplicar sugerencia para ${suggestion.mutatorId} ${suggestion.runMode}`}
                    >
                      {applyPending ? 'Aplicando...' : 'Apply'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => rollbackSuggestion(suggestion)}
                      disabled={pendingKey !== null}
                      aria-label={`Revertir ajuste para ${suggestion.mutatorId} ${suggestion.runMode}`}
                    >
                      {rollbackPending ? 'Revirtiendo...' : 'Rollback'}
                    </Button>
                  </div>

                  <div className="mt-3 rounded border border-border/60 bg-muted/20 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Caps por mutador+modo (1..50)</p>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <label className="text-xs text-muted-foreground">
                        Reward ±%
                        <input
                          type="number"
                          min={1}
                          max={50}
                          className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm"
                          value={capsDraft.maxAbsRewardDeltaPercent}
                          onChange={(event) => updateCapsDraft(
                            suggestion.mutatorId,
                            suggestion.runMode,
                            'maxAbsRewardDeltaPercent',
                            Number(event.target.value || 0),
                          )}
                          aria-label={`Cap reward para ${suggestion.mutatorId} ${suggestion.runMode}`}
                        />
                      </label>

                      <label className="text-xs text-muted-foreground">
                        Danger ±%
                        <input
                          type="number"
                          min={1}
                          max={50}
                          className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm"
                          value={capsDraft.maxAbsDangerDeltaPercent}
                          onChange={(event) => updateCapsDraft(
                            suggestion.mutatorId,
                            suggestion.runMode,
                            'maxAbsDangerDeltaPercent',
                            Number(event.target.value || 0),
                          )}
                          aria-label={`Cap danger para ${suggestion.mutatorId} ${suggestion.runMode}`}
                        />
                      </label>

                      <div className="flex items-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => saveCaps(suggestion.mutatorId, suggestion.runMode)}
                          disabled={pendingKey !== null}
                          aria-label={`Guardar caps para ${suggestion.mutatorId} ${suggestion.runMode}`}
                        >
                          {capsPending ? 'Guardando...' : 'Guardar caps'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="rounded-md border border-border/60 bg-muted/20 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Export JSON (copiable)</p>
          <pre className="overflow-x-auto text-xs leading-relaxed">{JSON.stringify({ generatedAt, policySummary, suggestions }, null, 2)}</pre>
        </div>
      </CardContent>
    </Card>
  );
}
