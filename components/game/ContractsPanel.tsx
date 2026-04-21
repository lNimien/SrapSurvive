"use client";

import { useMemo, useState } from "react";
import { UserContractDTO } from "@/types/dto.types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  deliverContractAction,
  refreshContractsAction,
} from "@/server/actions/contract.actions";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  Lock,
  Package,
  RefreshCw,
  Timer,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  ContractOperationalState,
  getContractActionState,
  getContractOperationalMeta,
  getContractOperationalState,
  getContractProgress,
} from "@/lib/utils/contracts-ui";

interface ContractsPanelProps {
  contracts: UserContractDTO[];
  nextRefreshCostCC?: number;
}

const STATUS_PRIORITY: Record<ContractOperationalState, number> = {
  ready: 0,
  incomplete: 1,
  delivered: 2,
  blocked: 3,
};

export function ContractsPanel({ contracts, nextRefreshCostCC = 85 }: ContractsPanelProps) {
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sortedContracts = useMemo(() => {
    return [...contracts].sort((left, right) => {
      const leftState = getContractOperationalState(left);
      const rightState = getContractOperationalState(right);

      const byStatus = STATUS_PRIORITY[leftState] - STATUS_PRIORITY[rightState];
      if (byStatus !== 0) {
        return byStatus;
      }

      return new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime();
    });
  }, [contracts]);

  const handleDeliver = async (contractId: string, quantityToDeliver: number) => {
    if (quantityToDeliver <= 0) {
      return;
    }

    setLoadingId(contractId);
    try {
      const result = await deliverContractAction({
        contractId,
        quantity: quantityToDeliver,
      });

      if (result.success) {
        toast({ title: "Entrega confirmada", description: result.data.message, variant: "success" });
      } else {
        toast({
          title: "No se pudo entregar",
          description: result.error.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Error de conexión al entregar materiales.",
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleRefreshContracts = async () => {
    setIsRefreshing(true);
    try {
      const result = await refreshContractsAction({
        requestId: crypto.randomUUID(),
      });

        if (result.success) {
          toast({
            title: "Contratos actualizados",
            description: `${result.data.message} Costo aplicado: ${nextRefreshCostCC} CC.`,
            variant: "success",
          });
        } else {
        toast({
          title: "No se pudo refrescar",
          description: result.error.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Error de conexión al refrescar contratos.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!contracts || contracts.length === 0) {
    return (
      <Card className="glass-panel overflow-hidden border-primary/20 cyberpunk-box">
        <CardContent className="pt-6 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            No hay contratos activos en este momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Zap className="size-5 fill-yellow-400/20 text-yellow-400" aria-hidden="true" />
          <h2 className="font-sans text-xl font-bold uppercase tracking-wider text-primary neon-text-cyan">
            Contratos Diarios
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-amber-500/45 bg-amber-500/10 px-2 py-0 text-[10px] font-mono uppercase tracking-widest text-amber-200"
          >
            Próx. refresh: {nextRefreshCostCC} CC
          </Badge>
          <Badge
            variant="outline"
            className="border-primary/40 bg-primary/5 px-2 py-0 text-[10px] font-mono uppercase tracking-widest text-primary/70"
          >
            Reset: 00:00 UTC
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefreshContracts}
            disabled={isRefreshing}
            className="h-7 border-primary/30 px-2 text-[10px] font-mono uppercase tracking-wider hover:bg-primary/10"
            aria-label="Refrescar contratos diarios"
          >
            <RefreshCw
              className={cn("mr-1 size-3.5", isRefreshing && "animate-spin")}
              aria-hidden="true"
            />
            {isRefreshing ? "Refrescando" : "Refrescar"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {sortedContracts.map((contract) => {
          const progress = getContractProgress(contract);
          const state = getContractOperationalState(contract);
          const meta = getContractOperationalMeta(state);
          const action = getContractActionState(contract);
          const isLoading = loadingId === contract.id;
          const expiresInMinutes = Math.max(
            0,
            Math.floor((new Date(contract.expiresAt).getTime() - Date.now()) / 60_000),
          );
          const showCountdown = state === "incomplete" || state === "ready";
          const isCriticalWindow = showCountdown && expiresInMinutes <= 45;
          const isAlertWindow = showCountdown && !isCriticalWindow && expiresInMinutes <= 120;

          return (
            <Card
              key={contract.id}
              className={cn(
                "group relative flex h-full flex-col overflow-hidden border-primary/20 bg-background/40 transition-all duration-300 glass-panel",
                state === "ready" && "border-cyan-500/40 bg-cyan-500/5",
                state === "delivered" && "border-emerald-500/35 bg-emerald-500/5",
                state === "blocked" && "border-zinc-700/60 bg-zinc-900/50 opacity-85",
              )}
            >
              <CardHeader className="pb-2">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <Badge variant="outline" className={cn("text-[10px] uppercase tracking-widest", meta.badgeClass)}>
                    {meta.label}
                  </Badge>

                  {showCountdown ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase tracking-widest",
                        isCriticalWindow
                          ? "border-red-500/60 bg-red-500/12 text-red-200"
                          : isAlertWindow
                            ? "border-amber-500/60 bg-amber-500/12 text-amber-200"
                            : "border-cyan-500/45 bg-cyan-500/10 text-cyan-200",
                      )}
                    >
                      {isCriticalWindow ? "Crítico" : isAlertWindow ? "Alerta" : "Estable"}
                    </Badge>
                  ) : null}

                  {contract.chainStage && contract.chainStageCount ? (
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant="outline"
                        className="border-violet-500/45 bg-violet-500/10 text-[10px] uppercase tracking-widest text-violet-200"
                      >
                        Cadena {contract.chainStage}/{contract.chainStageCount}
                      </Badge>
                      {contract.chainState ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] uppercase tracking-widest',
                            contract.chainState === 'FAILED'
                              ? 'border-red-500/60 bg-red-500/12 text-red-200'
                              : contract.chainState === 'COMPLETED'
                                ? 'border-emerald-500/60 bg-emerald-500/12 text-emerald-200'
                                : 'border-violet-500/45 bg-violet-500/10 text-violet-200',
                          )}
                        >
                          {contract.chainState === 'FAILED'
                            ? 'Cadena fallida'
                            : contract.chainState === 'COMPLETED'
                              ? 'Cadena completa'
                              : 'Cadena activa'}
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight text-primary">
                  <Package className="size-4 text-primary/60" aria-hidden="true" />
                  {contract.requiredItemName}
                </CardTitle>
                <CardDescription className="font-mono text-[11px] uppercase tracking-wider text-primary/55">
                  Solicitud de Corporación
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider">
                    <span className="text-primary/60">Progreso</span>
                    <span className="text-primary">
                      {progress.delivered} / {progress.required}
                    </span>
                  </div>

                  <Progress
                    value={progress.progressPercent}
                    className={cn(
                      "h-1.5 border-none bg-primary/12",
                      state === "ready" && "[&_[data-slot=progress-indicator]]:bg-cyan-400",
                      state === "delivered" && "[&_[data-slot=progress-indicator]]:bg-emerald-400",
                      state === "blocked" && "[&_[data-slot=progress-indicator]]:bg-zinc-500",
                    )}
                    aria-label={`Progreso del contrato ${contract.requiredItemName}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress.progressPercent}
                  />

                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                    <span>Inventario: {progress.available}</span>
                    <span className="text-primary/40">•</span>
                    <span>Restante: {progress.remaining}</span>
                  </div>

                  {contract.chainStage && contract.chainStageCount ? (
                    <div className="rounded-sm border border-violet-500/30 bg-violet-500/8 px-2.5 py-2 text-[10px] font-mono uppercase tracking-[0.14em] space-y-1">
                      <p className="text-violet-200/90">
                        Bonus final cadena: +{contract.chainBonusCC ?? 0} CC · +{contract.chainBonusXP ?? 0} XP
                      </p>
                      {contract.chainState === 'FAILED' ? (
                        <p className="text-red-200">Bloqueado: una etapa expiró y anuló el bonus final.</p>
                      ) : contract.chainState === 'COMPLETED' ? (
                        <p className="text-emerald-200">Aplicado: cadena completada con éxito.</p>
                      ) : (
                        <p className="text-violet-100/80">Estado: completa todas las etapas activas antes del reset.</p>
                      )}
                    </div>
                  ) : null}

                  {showCountdown ? (
                    <div
                      className={cn(
                        "flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider",
                        isCriticalWindow
                          ? "text-red-200"
                          : isAlertWindow
                            ? "text-amber-200"
                            : "text-cyan-200",
                      )}
                    >
                      {isCriticalWindow ? (
                        <AlertTriangle className="size-3" aria-hidden="true" />
                      ) : (
                        <Timer className="size-3" aria-hidden="true" />
                      )}
                      <span>Vence en {expiresInMinutes} min</span>
                    </div>
                  ) : null}

                  <p className="text-[11px] leading-relaxed text-zinc-300">{meta.helper}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 rounded-sm border border-primary/10 bg-primary/5 px-2 py-1.5">
                    <Coins className="size-3 text-yellow-500" aria-hidden="true" />
                    <span className="font-mono text-xs font-bold text-yellow-400">+{contract.rewardCC}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-sm border border-primary/10 bg-primary/5 px-2 py-1.5">
                    <Zap className="size-3 fill-cyan-500/20 text-cyan-500" aria-hidden="true" />
                    <span className="font-mono text-xs font-bold text-cyan-400">+{contract.rewardXP}</span>
                  </div>
                </div>

                {contract.chainStage === contract.chainStageCount && contract.chainStageCount ? (
                  <div className="rounded-sm border border-violet-500/25 bg-violet-500/10 px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest text-violet-200">
                    Bonus final cadena: +{contract.chainBonusCC ?? 0} CC · +{contract.chainBonusXP ?? 0} XP
                  </div>
                ) : null}

                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "mt-1 h-9 w-full text-xs font-mono uppercase tracking-widest",
                    state === "ready" && "border-cyan-400/50 bg-cyan-500/12 text-cyan-100 hover:bg-cyan-500/20",
                    state === "incomplete" && "border-amber-400/40 text-amber-100 hover:bg-amber-500/12",
                    state === "delivered" && "border-emerald-400/40 text-emerald-200",
                    state === "blocked" && "border-zinc-600 text-zinc-300",
                  )}
                  onClick={() => handleDeliver(contract.id, action.quantityToDeliver)}
                  disabled={isLoading || action.disabled}
                  aria-label={`Acción de contrato: ${action.label}`}
                >
                  {isLoading ? "Procesando…" : action.label}
                </Button>

                {state === "delivered" ? (
                  <div className="mt-1 flex items-center justify-center gap-2 rounded-sm border border-emerald-500/20 bg-emerald-500/10 py-2 text-xs font-mono uppercase text-emerald-300">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Contrato cerrado
                  </div>
                ) : null}

                {state === "blocked" ? (
                  <div className="mt-1 flex items-center justify-center gap-2 rounded-sm border border-zinc-600/40 bg-zinc-800/40 py-2 text-xs font-mono uppercase text-zinc-300">
                    <Lock className="size-4" aria-hidden="true" />
                    Contrato bloqueado
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
