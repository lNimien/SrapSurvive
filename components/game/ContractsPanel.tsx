"use client";

import { useState } from "react";
import { UserContractDTO } from "@/types/dto.types";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
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
  Package,
  RefreshCw,
  Timer,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ContractsPanelProps {
  contracts: UserContractDTO[];
}

export function ContractsPanel({ contracts }: ContractsPanelProps) {
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sortedContracts = [...contracts].sort((left, right) => {
    const getPriority = (contract: UserContractDTO) => {
      if (contract.status === "ACTIVE") {
        return contract.currentQuantity >= contract.requiredQuantity ? 1 : 0;
      }

      if (contract.status === "COMPLETED") {
        return 2;
      }

      return 3;
    };

    const byPriority = getPriority(left) - getPriority(right);
    if (byPriority !== 0) {
      return byPriority;
    }

    return (
      new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime()
    );
  });

  const handleDeliver = async (contractId: string, maxQuantity: number) => {
    setLoadingId(contractId);
    try {
      const result = await deliverContractAction({
        contractId,
        quantity: maxQuantity,
      });
      if (result.success) {
        toast({ title: "Éxito", description: result.data.message });
      } else {
        toast({
          title: "Error",
          description: result.error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
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
          description: result.data.message,
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
      <Card className="glass-panel border-primary/20 cyberpunk-box overflow-hidden">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground font-mono uppercase tracking-tighter">
            No hay contratos activos en este momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400/20" />
          <h2 className="font-sans text-xl font-bold text-primary uppercase tracking-wider neon-text-cyan">
            Contratos Diarios
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-primary/40 text-primary/70 font-mono text-[10px] py-0 px-2 uppercase tracking-widest bg-primary/5">
            Reset: 00:00 UTC
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefreshContracts}
            disabled={isRefreshing}
            className="h-7 px-2 border-primary/30 hover:bg-primary/10 text-[10px] font-mono uppercase tracking-wider"
            aria-label="Refrescar contratos diarios">
            <RefreshCw
              className={cn("w-3.5 h-3.5 mr-1", isRefreshing && "animate-spin")}
              aria-hidden="true"
            />
            {isRefreshing ? "Refrescando" : "Refrescar"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedContracts.map((contract) => {
          const progress = Math.min(
            100,
            (contract.currentQuantity / contract.requiredQuantity) * 100,
          );
          const isCompleted = contract.status === "COMPLETED";
          const isExpired = contract.status === "EXPIRED";
          const expiresInMinutes = Math.max(
            0,
            Math.floor(
              (new Date(contract.expiresAt).getTime() - Date.now()) / 60_000,
            ),
          );
          const isUrgent = !isCompleted && !isExpired && expiresInMinutes <= 45;
          const isWarning =
            !isCompleted && !isExpired && expiresInMinutes <= 120;
          const urgencyLabel = isExpired
            ? "Expirado"
            : isUrgent
              ? "Crítico"
              : isWarning
                ? "Urgente"
                : "Estable";

          return (
            <Card
              key={contract.id}
              className={cn(
                "glass-panel border-primary/20 transition-all duration-300 relative group overflow-hidden h-full flex flex-col",
                isCompleted
                  ? "border-green-500/30 bg-green-500/5"
                  : "hover:border-primary/40",
                isExpired && "opacity-50 grayscale pointer-events-none",
              )}>
              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
                <div className="absolute top-0 right-0 w-[1px] h-4 bg-primary/40" />
                <div className="absolute top-0 right-0 w-4 h-[1px] bg-primary/40" />
              </div>

              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0 leading-tight uppercase font-mono tracking-tighter mb-2",
                      isCompleted
                        ? "text-green-400 border-green-500/50 bg-green-500/10"
                        : isExpired
                          ? "text-muted-foreground border-muted/30 bg-muted/10"
                          : "text-primary/70 border-primary/30",
                    )}>
                    {isCompleted
                      ? "Completado"
                      : isExpired
                        ? "Expirado"
                        : "Activo"}
                  </Badge>
                  {!isCompleted && !isExpired && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 leading-tight uppercase font-mono tracking-tighter",
                        isUrgent
                          ? "text-red-300 border-red-500/60 bg-red-500/10"
                          : isWarning
                            ? "text-amber-300 border-amber-500/50 bg-amber-500/10"
                            : "text-cyan-300 border-cyan-500/40 bg-cyan-500/10",
                      )}>
                      {urgencyLabel}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary uppercase tracking-tight">
                  <Package className="w-4 h-4 text-primary/60" />
                  {contract.requiredItemName}
                </CardTitle>
                <CardDescription className="text-xs font-mono text-primary/50 uppercase">
                  Solicitud de Corporación
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 flex-grow flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono uppercase tracking-tighter">
                    <span className="text-primary/60">Progreso</span>
                    <span
                      className={cn(
                        isCompleted ? "text-green-400" : "text-primary",
                      )}>
                      {contract.currentQuantity} / {contract.requiredQuantity}
                    </span>
                  </div>
                  {!isCompleted && !isExpired && (
                    <div
                      className={cn(
                        "flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest",
                        isUrgent
                          ? "text-red-300"
                          : isWarning
                            ? "text-amber-300"
                            : "text-cyan-300",
                      )}>
                      {isUrgent ? (
                        <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <Timer className="w-3 h-3" aria-hidden="true" />
                      )}
                      <span>Vence en {expiresInMinutes} min</span>
                    </div>
                  )}
                  <Progress
                    value={progress}
                    className="h-1.5 bg-primary/10 border-none"
                    // Manual className injection for the indicator usually needs specific tailwind config or custom property
                    // With Tailwind 4 we can leverage style or data attributes
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 bg-primary/5 border border-primary/10 rounded-sm">
                    <Coins className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs font-bold text-yellow-500/90 font-mono">
                      +{contract.rewardCC}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 bg-primary/5 border border-primary/10 rounded-sm">
                    <Zap className="w-3 h-3 text-cyan-500 fill-cyan-500/20" />
                    <span className="text-xs font-bold text-cyan-400 font-mono">
                      +{contract.rewardXP}
                    </span>
                  </div>
                </div>

                {!isCompleted && !isExpired && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4 border-primary/30 hover:bg-primary/10 hover:text-primary text-xs uppercase font-mono tracking-widest h-9"
                    onClick={() =>
                      handleDeliver(
                        contract.id,
                        contract.requiredQuantity - contract.currentQuantity,
                      )
                    }
                    disabled={loadingId === contract.id}>
                    {loadingId === contract.id
                      ? "Procesando..."
                      : "Entregar Materiales"}
                  </Button>
                )}

                {isCompleted && (
                  <div className="flex items-center justify-center gap-2 mt-4 text-green-400 font-mono text-xs uppercase py-2 bg-green-500/10 rounded-sm border border-green-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                    Contrato Cerrado
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
