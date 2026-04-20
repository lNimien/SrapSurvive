import { redirect } from 'next/navigation';
import { auth } from '@/server/auth/auth';
import { PlayerStateService } from '@/server/services/player-state.service';
import { ScrapperCard } from '@/components/game/ScrapperCard';
import { ResourceBar } from '@/components/game/ResourceBar';
import { EquipmentDisplay } from '@/components/game/EquipmentDisplay';
import { ExpeditionManager } from '@/components/game/ExpeditionManager';
import { Separator } from '@/components/ui/separator';
import { featureFlags } from '@/config/feature-flags.config';
import { WeeklyGoalsPanel } from '@/components/game/WeeklyGoalsPanel';
import { PlayerAnalyticsPanel } from '@/components/game/PlayerAnalyticsPanel';

export const metadata = {
  title: 'Dashboard — Scrap & Survive',
  description: 'Centro de mando del chatarrero. Lanza expediciones, gestiona equipo y acumula botín.',
};

export default async function DashboardPage() {
  const session = await auth();

  // Middleware also protects this route, but double-check defensively
  if (!session?.user?.id) {
    redirect('/');
  }

  const userId = session.user.id;
  const player = await PlayerStateService.getPlayerState(userId);

  return (
    <main className="min-h-full flex flex-col pt-4 overflow-x-hidden" id="dashboard-main">
      {/* Top resource strip */}
      <header className="mb-6 pb-4 flex flex-col md:flex-row md:justify-between md:items-end gap-4 relative z-10 px-2 lg:px-6">
        <div className="relative">
          <div className="absolute -left-2 top-0 w-1 h-full bg-primary" />
          <h1 className="font-sans text-3xl md:text-4xl font-bold text-primary neon-text-cyan uppercase tracking-[0.1em] pl-4">
            Puente de Mando
          </h1>
          <p className="font-mono text-sm text-primary/70 mt-1 pl-4 uppercase tracking-widest">
            Centro de Operaciones Tácticas
          </p>
        </div>
        <div className="glass-panel px-6 py-2 border-primary/20 cyberpunk-box">
          <ResourceBar currencyBalance={player.currencyBalance} />
        </div>
      </header>

      <Separator className="bg-primary/20 mb-8 w-[calc(100%-2rem)] mx-auto" />

      <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-8 px-2 lg:px-6 pb-12 w-full max-w-7xl mx-auto">
        <aside className="flex flex-col gap-6" aria-label="Perfil y equipo del chatarrero">
          <ScrapperCard
            player={{
              displayName: player.displayName,
              level: player.level,
              currentXp: player.currentXp,
              xpToNextLevel: player.xpToNextLevel,
            }}
          />
          <EquipmentDisplay
            equipment={player.equipment}
            activeSynergies={featureFlags.d3BuildSynergies ? player.activeSynergies : []}
            activeArchetype={featureFlags.d3BuildSynergies ? player.activeArchetype : null}
          />
        </aside>

        <section className="flex flex-col gap-6 min-w-0" aria-label="Control de expedición y telemetría">
          <ExpeditionManager activeRun={player.activeRun} playerLevel={player.level} />
          {featureFlags.d3WeeklyGoals && <WeeklyGoalsPanel weeklyGoals={player.weeklyGoals} />}
          {featureFlags.d3PlayerAnalytics && <PlayerAnalyticsPanel analytics={player.analytics} />}
        </section>
      </div>
    </main>
  );
}
