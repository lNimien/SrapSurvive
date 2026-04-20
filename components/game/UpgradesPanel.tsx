'use client';

import { type ComponentType, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Coins,
  Cpu,
  FlaskConical,
  Gavel,
  Gauge,
  Hammer,
  Handshake,
  KeyRound,
  Rocket,
  Route,
  Shield,
  Skull,
  Sparkles,
  Wrench,
} from 'lucide-react';

import {
  cancelUpgradeResearchAction,
  startUpgradeResearchAction,
} from '@/server/actions/upgrades.actions';
import {
  UpgradeBranchDTO,
  UpgradeNodeDTO,
  UpgradeTreeDTO,
} from '@/types/dto.types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { UPGRADE_BRANCH_META } from '@/config/upgrades-tree.config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface UpgradesPanelProps {
  tree: UpgradeTreeDTO;
}

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  shield: Shield,
  route: Route,
  rocket: Rocket,
  gauge: Gauge,
  cpu: Cpu,
  hammer: Hammer,
  'key-round': KeyRound,
  wrench: Wrench,
  'flask-conical': FlaskConical,
  bot: Bot,
  coins: Coins,
  gavel: Gavel,
  handshake: Handshake,
  skull: Skull,
  sparkles: Sparkles,
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Completando...';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }

  return `${secs}s`;
}

function getStateChip(state: UpgradeNodeDTO['state']): { label: string; className: string } {
  switch (state) {
    case 'available':
      return { label: 'Disponible', className: 'border-cyan-400/40 text-cyan-300 bg-cyan-500/10' };
    case 'in_progress':
      return { label: 'En progreso', className: 'border-yellow-400/40 text-yellow-300 bg-yellow-500/10' };
    case 'unlocked':
      return { label: 'Activo', className: 'border-emerald-400/40 text-emerald-300 bg-emerald-500/10' };
    case 'maxed':
      return { label: 'Maxeado', className: 'border-violet-400/40 text-violet-300 bg-violet-500/10' };
    default:
      return { label: 'Bloqueado', className: 'border-zinc-500/40 text-zinc-300 bg-zinc-500/10' };
  }
}

function getNodeShellClass(node: UpgradeNodeDTO): string {
  switch (node.state) {
    case 'available':
      return 'border-cyan-400/50 bg-cyan-500/10 hover:bg-cyan-500/15 hover:shadow-[0_0_20px_rgba(34,211,238,0.25)]';
    case 'in_progress':
      return 'border-yellow-400/60 bg-yellow-500/10 shadow-[0_0_22px_rgba(250,204,21,0.25)] animate-pulse';
    case 'unlocked':
      return 'border-emerald-400/50 bg-emerald-500/10 hover:bg-emerald-500/15';
    case 'maxed':
      return 'border-violet-400/60 bg-violet-500/12 shadow-[0_0_22px_rgba(168,85,247,0.22)]';
    default:
      return 'border-zinc-700/70 bg-zinc-900/70 opacity-75';
  }
}

function BranchTree({
  branch,
  nodes,
  selectedId,
  onSelect,
}: {
  branch: UpgradeBranchDTO;
  nodes: UpgradeNodeDTO[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const maxTier = nodes.reduce((max, node) => Math.max(max, node.tier), 0);

  const nodeById = useMemo(() => {
    return nodes.reduce<Record<string, UpgradeNodeDTO>>((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {});
  }, [nodes]);

  const edges = useMemo(() => {
    return nodes.flatMap((node) => {
      return node.parents
        .map((parentId) => {
          const parent = nodeById[parentId];
          if (!parent) {
            return null;
          }

          return {
            from: parent,
            to: node,
          };
        })
        .filter((edge): edge is { from: UpgradeNodeDTO; to: UpgradeNodeDTO } => edge !== null);
    });
  }, [nodeById, nodes]);

  return (
    <section className="relative rounded-lg border border-primary/20 bg-background/40 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className={cn('text-xs font-mono uppercase tracking-[0.18em]', UPGRADE_BRANCH_META[branch].accentColorClass)}>
            {UPGRADE_BRANCH_META[branch].label}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{UPGRADE_BRANCH_META[branch].description}</p>
        </div>
      </div>

      <div className="relative">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {edges.map((edge) => {
            const x1 = edge.from.lane === 0 ? 25 : 75;
            const y1 = ((edge.from.tier + 0.5) / (maxTier + 1)) * 100;
            const x2 = edge.to.lane === 0 ? 25 : 75;
            const y2 = ((edge.to.tier + 0.5) / (maxTier + 1)) * 100;
            const isActive = edge.from.currentLevel >= edge.from.maxLevel;

            return (
              <line
                key={`${edge.from.id}-${edge.to.id}`}
                x1={`${x1}%`}
                y1={`${y1}%`}
                x2={`${x2}%`}
                y2={`${y2}%`}
                stroke={isActive ? 'rgba(34,211,238,0.8)' : 'rgba(113,113,122,0.45)'}
                strokeWidth={isActive ? 2.6 : 1.6}
                strokeDasharray={isActive ? '0' : '5 4'}
              />
            );
          })}
        </svg>

        <div
          className="grid grid-cols-2 gap-x-6 gap-y-5"
          style={{ gridTemplateRows: `repeat(${maxTier + 1}, minmax(92px, auto))` }}
        >
          {nodes.map((node) => {
            const Icon = ICONS[node.icon] ?? Cpu;
            const stateChip = getStateChip(node.state);

            return (
              <Tooltip key={node.id}>
                <TooltipTrigger
                  className={cn(
                    'relative z-10 rounded-md border px-3 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80',
                    getNodeShellClass(node),
                    selectedId === node.id && 'ring-2 ring-primary/70 shadow-[0_0_22px_rgba(0,243,255,0.22)]',
                  )}
                  style={{ gridColumn: node.lane + 1, gridRow: node.tier + 1 }}
                  onClick={() => onSelect(node.id)}
                  aria-label={`Nodo ${node.displayName}, estado ${stateChip.label}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                      <p className="text-xs font-sans uppercase tracking-wide text-foreground/95">{node.displayName}</p>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] uppercase tracking-wider', stateChip.className)}>
                      {stateChip.label}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">{node.category}</p>
                  <p className="mt-2 text-[10px] font-mono text-primary/85">
                    NV {node.currentLevel}/{node.maxLevel}
                  </p>
                </TooltipTrigger>
                <TooltipContent className="max-w-[260px] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide">{node.displayName}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{node.description}</p>
                  <div className="mt-2 space-y-1 text-[11px]">
                    <p>Estado: {stateChip.label}</p>
                    {node.nextCostCC !== null && <p>Coste siguiente: {node.nextCostCC} CC</p>}
                    {node.nextUnlockDurationSec !== null && (
                      <p>Tiempo: {formatDuration(node.nextUnlockDurationSec)}</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function UpgradesPanel({ tree }: UpgradesPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedNodeId, setSelectedNodeId] = useState<string>(() => tree.nodes[0]?.id ?? '');
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedNode = useMemo(() => {
    return tree.nodes.find((node) => node.id === selectedNodeId) ?? tree.nodes[0] ?? null;
  }, [selectedNodeId, tree.nodes]);

  const sortedBranches = useMemo(() => {
    const order: UpgradeBranchDTO[] = ['BRIDGE', 'WORKSHOP', 'BLACK_MARKET'];
    return order.map((branch) => ({
      branch,
      nodes: tree.nodes
        .filter((node) => node.branch === branch)
        .sort((a, b) => (a.tier === b.tier ? a.lane - b.lane : a.tier - b.tier)),
    }));
  }, [tree.nodes]);

  const activeRemainingSeconds = useMemo(() => {
    if (!tree.activeResearch) {
      return 0;
    }

    const end = new Date(tree.activeResearch.completesAt).getTime();
    return Math.max(0, Math.floor((end - now) / 1000));
  }, [tree.activeResearch, now]);

  const completionPercent = Math.round((tree.completedLevelCount / Math.max(1, tree.totalLevelCount)) * 100);

  const handleStartResearch = () => {
    if (!selectedNode || selectedNode.state === 'maxed') {
      return;
    }

    startTransition(async () => {
      const result = await startUpgradeResearchAction({ nodeId: selectedNode.id });

      if (!result.success) {
        toast({
          title: 'Investigacion rechazada',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Investigacion iniciada',
        description: `${selectedNode.displayName} Nv.${result.data.targetLevel} finaliza pronto.`,
      });
      router.refresh();
    });
  };

  const handleCancelResearch = () => {
    startTransition(async () => {
      const result = await cancelUpgradeResearchAction();

      if (!result.success) {
        toast({
          title: 'Cancelacion rechazada',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Investigacion cancelada',
        description: `Reembolso aplicado: +${result.data.refundedCC} CC`,
      });
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-primary/25 cyberpunk-box">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-3 text-primary uppercase tracking-[0.12em]">
            <Cpu className="h-5 w-5" aria-hidden="true" />
            Red de mejoras estrategicas
          </CardTitle>
          <p className="text-xs font-mono uppercase tracking-widest text-primary/70">
            Progresion por ramas con investigacion temporal, dependencias y efectos persistentes.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-primary/60">Creditos</p>
              <p className="text-lg font-mono text-yellow-300">{tree.currencyBalance} CC</p>
            </div>
            <div className="rounded-md border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-cyan-200/70">Disponibles ahora</p>
              <p className="text-lg font-mono text-cyan-200">{tree.availableCount}</p>
            </div>
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-emerald-200/70">Progreso total</p>
              <p className="text-lg font-mono text-emerald-200">
                {tree.completedLevelCount}/{tree.totalLevelCount}
              </p>
            </div>
            <div className="rounded-md border border-violet-500/20 bg-violet-500/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-violet-200/70">Sincronia global</p>
              <p className="text-lg font-mono text-violet-200">{completionPercent}%</p>
            </div>
          </div>

          <Progress
            value={completionPercent}
            className="w-full"
            aria-label="Progreso total del arbol de mejoras"
          />

          {tree.activeResearch ? (
            <div className="rounded-md border border-yellow-400/35 bg-yellow-500/8 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-yellow-300/70">Investigacion activa</p>
                  <p className="text-sm font-semibold text-yellow-200">
                    {tree.activeResearch.nodeName} · Nv.{tree.activeResearch.targetLevel}
                  </p>
                  <p className="text-[11px] text-yellow-100/80 mt-1">
                    Tiempo restante: {formatCountdown(activeRemainingSeconds)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelResearch}
                  disabled={isPending}
                  className="border-yellow-400/40 text-yellow-100 hover:bg-yellow-500/10"
                >
                  Cancelar (+{tree.activeResearch.refundableCC} CC)
                </Button>
              </div>
              <div className="mt-3">
                <Progress
                  value={Math.max(tree.activeResearch.progressPercent, ((tree.activeResearch.progressPercent + 1) / 101) * 100)}
                  aria-label="Progreso de investigacion activa"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-primary/70">
              Sin investigacion en curso. Selecciona un nodo disponible para iniciar la siguiente mejora.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {sortedBranches.map(({ branch, nodes }) => (
            <BranchTree
              key={branch}
              branch={branch}
              nodes={nodes}
              selectedId={selectedNode?.id ?? ''}
              onSelect={setSelectedNodeId}
            />
          ))}
        </div>

        <aside className="xl:sticky xl:top-6 xl:h-fit">
          <Card className="glass-panel border-primary/25">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-widest text-primary">Terminal de nodo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedNode ? (
                <p className="text-sm text-muted-foreground">Selecciona un nodo para ver detalle.</p>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-primary/70">Nodo</p>
                    <h3 className="mt-1 text-base font-semibold text-foreground">{selectedNode.displayName}</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{selectedNode.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-sm border border-primary/20 bg-primary/5 p-2">
                      <p className="uppercase tracking-wider text-primary/60">Rama</p>
                      <p className="mt-1">{UPGRADE_BRANCH_META[selectedNode.branch].label}</p>
                    </div>
                    <div className="rounded-sm border border-primary/20 bg-primary/5 p-2">
                      <p className="uppercase tracking-wider text-primary/60">Nivel</p>
                      <p className="mt-1">
                        {selectedNode.currentLevel}/{selectedNode.maxLevel}
                      </p>
                    </div>
                    <div className="rounded-sm border border-primary/20 bg-primary/5 p-2">
                      <p className="uppercase tracking-wider text-primary/60">Coste</p>
                      <p className="mt-1">{selectedNode.nextCostCC ?? '—'} CC</p>
                    </div>
                    <div className="rounded-sm border border-primary/20 bg-primary/5 p-2">
                      <p className="uppercase tracking-wider text-primary/60">Tiempo</p>
                      <p className="mt-1">{formatDuration(selectedNode.nextUnlockDurationSec)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-mono uppercase tracking-widest text-primary/70 mb-2">Efectos del siguiente nivel</p>
                    {selectedNode.effectsPreview.length > 0 ? (
                      <ul className="space-y-1.5 text-xs text-foreground/90">
                        {selectedNode.effectsPreview.map((effect) => (
                          <li key={`${selectedNode.id}-${effect.label}`} className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">{effect.label}</span>
                            <span className="font-mono text-primary">{effect.value}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nodo completo o sin mejora adicional.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Button
                      type="button"
                      className="w-full"
                      onClick={handleStartResearch}
                      disabled={
                        isPending ||
                        selectedNode.state === 'locked' ||
                        selectedNode.state === 'in_progress' ||
                        selectedNode.state === 'maxed' ||
                        Boolean(tree.activeResearch) ||
                        !selectedNode.affordable
                      }
                    >
                      {selectedNode.state === 'maxed'
                        ? 'Nodo maxeado'
                        : !selectedNode.requirementsMet
                          ? 'Prerrequisitos pendientes'
                          : !selectedNode.affordable
                            ? 'CC insuficiente'
                            : tree.activeResearch
                              ? 'Ya hay investigacion activa'
                              : 'Iniciar investigacion'}
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      Cancelar devuelve 70% del coste invertido en la investigacion activa.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

