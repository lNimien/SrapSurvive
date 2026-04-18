"use client";

import { useState } from "react";
import { UserContractDTO } from "@/types/dto.types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deliverContractAction } from "@/server/actions/contract.actions";
import { useToast } from "@/hooks/use-toast";
import { Package, XCircle, CheckCircle2, Zap, Coins } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ContractsPanelProps {
  contracts: UserContractDTO[];
}

export function ContractsPanel({ contracts }: ContractsPanelProps) {
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleDeliver = async (contractId: string, maxQuantity: number) => {
    setLoadingId(contractId);
    try {
      const result = await deliverContractAction({ contractId, quantity: maxQuantity });
      if (result.success) {
        toast({ title: "Éxito", description: result.data.message });
      } else {
        toast({ title: "Error", description: result.error.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Error de conexión al entregar materiales.", variant: "destructive" });
    } finally {
      setLoadingId(null);
    }
  };

  if (!contracts || contracts.length === 0) {
    return (
      <Card className="glass-panel border-primary/20 cyberpunk-box overflow-hidden">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground font-mono uppercase tracking-tighter">No hay contratos activos en este momento.</p>
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
        <Badge variant="outline" className="border-primary/40 text-primary/70 font-mono text-[10px] py-0 px-2 uppercase tracking-widest bg-primary/5">
            Reset: 00:00 UTC
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {contracts.map((contract) => {
          const progress = (contract.currentQuantity / contract.requiredQuantity) * 100;
          const isCompleted = contract.status === 'COMPLETED';
          const isExpired = contract.status === 'EXPIRED';

          return (
            <Card 
              key={contract.id} 
              className={cn(
                "glass-panel border-primary/20 transition-all duration-300 relative group overflow-hidden h-full flex flex-col",
                isCompleted ? "border-green-500/30 bg-green-500/5" : "hover:border-primary/40",
                isExpired && "opacity-50 grayscale pointer-events-none"
              )}
            >
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
                        isCompleted ? "text-green-400 border-green-500/50 bg-green-500/10" : "text-primary/70 border-primary/30"
                    )}
                  >
                    {isCompleted ? "Completado" : "Activo"}
                  </Badge>
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
                    <span className={cn(isCompleted ? "text-green-400" : "text-primary")}>
                        {contract.currentQuantity} / {contract.requiredQuantity}
                    </span>
                  </div>
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
                    <span className="text-xs font-bold text-yellow-500/90 font-mono">+{contract.rewardCC}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 bg-primary/5 border border-primary/10 rounded-sm">
                    <Zap className="w-3 h-3 text-cyan-500 fill-cyan-500/20" />
                    <span className="text-xs font-bold text-cyan-400 font-mono">+{contract.rewardXP}</span>
                  </div>
                </div>

                {!isCompleted && !isExpired && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full mt-4 border-primary/30 hover:bg-primary/10 hover:text-primary text-xs uppercase font-mono tracking-widest h-9"
                    onClick={() => handleDeliver(contract.id, contract.requiredQuantity - contract.currentQuantity)}
                    disabled={loadingId === contract.id}
                  >
                    {loadingId === contract.id ? "Procesando..." : "Entregar Materiales"}
                  </Button>
                )}

                {isCompleted && (
                  <div className="flex items-center justify-center gap-2 mt-4 text-green-400 font-mono text-xs uppercase py-2 bg-green-500/10 rounded-sm border border-green-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                    Recompensa Reclamada
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
