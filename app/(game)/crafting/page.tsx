import 'server-only';

import { auth } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { PlayerStateService } from '@/server/services/player-state.service';
import { getRecipesAction } from '@/server/actions/inventory.actions';
import { CraftingRecipeGrid } from '@/components/game/CraftingRecipeGrid';
import { Hammer, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getTierLabel } from '@/lib/utils/rarity';

export const metadata = {
  title: 'Taller de Fabricación | Scrap & Survive',
  description: 'Fabrica equipo avanzado usando tus materiales recolectados.',
};

export default async function CraftingPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect('/');
  }

  const [playerState, recipesResult] = await Promise.all([
    PlayerStateService.getPlayerState(userId),
    getRecipesAction(),
  ]);

  if (!recipesResult.success) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>No se pudieron cargar las recetas de fabricación.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const recipes = recipesResult.data;
  const unlockedTierSet = new Set(recipes.flatMap((recipe) => recipe.unlockedTiers));
  const unlockedTierLabels = [...unlockedTierSet].map((tier) => getTierLabel(tier));
  const isRunActive = playerState.activeRun?.status === 'running';

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-primary/20 pb-6">
        <div>
          <div className="flex items-center gap-3 text-primary mb-2">
            <Hammer className="w-8 h-8 drop-shadow-[0_0_8px_rgba(0,243,255,0.5)]" />
            <h1 className="text-4xl font-sans font-black tracking-tighter uppercase italic">Taller de Fabricación</h1>
          </div>
          <p className="text-muted-foreground font-mono text-sm max-w-2xl leading-relaxed">
            [ UNIDAD_CRAFTING_V1.5 ] — Convierte materiales de alta pureza y procesadores recuperados en equipo de grado militar. 
            Toda fabricación es definitiva y consume los recursos al instante.
          </p>
        </div>
        
        <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg min-w-[200px] flex flex-col justify-center">
            <span className="text-[10px] font-mono text-primary/60 uppercase tracking-widest block mb-1">Balance Actual</span>
            <span className="text-2xl font-mono text-yellow-400 font-bold">{playerState.currencyBalance} CC</span>
        </div>
      </header>

      {isRunActive && (
        <Alert className="bg-destructive/10 border-destructive/30 text-destructive animate-pulse">
          <Info className="h-4 w-4" />
          <AlertTitle className="font-bold">BLOQUEO DE SEGURIDAD ACTIVO</AlertTitle>
          <AlertDescription className="font-mono text-xs">
            Los protocolos de impresión 3D están deshabilitados durante las expediciones activas para evitar desincronización de inventario. Regresa o extrae para habilitar el taller.
          </AlertDescription>
        </Alert>
      )}

      <section className="border border-primary/20 bg-primary/5 rounded-lg p-4" aria-label="Autorización del taller">
        <p className="text-[10px] font-mono uppercase tracking-widest text-primary/60">Autorización Operativa</p>
        <p className="mt-1 text-sm font-mono text-primary">
          Tiers habilitados: {unlockedTierLabels.join(' · ')}
        </p>
        <p className="mt-2 text-xs font-mono text-muted-foreground">
          El acceso a recetas combina nivel de chatarrero y alcance de expedición. La fabricación sigue validándose en servidor.
        </p>
      </section>

      <CraftingRecipeGrid recipes={recipes} isRunActive={isRunActive} />

      <footer className="mt-12 p-6 glass-panel border border-primary/10 rounded-lg bg-primary/2">
        <div className="flex items-start gap-4">
           <div className="p-3 rounded-full bg-primary/10">
              <Info className="w-5 h-5 text-primary" />
           </div>
           <div>
              <h4 className="font-sans font-bold text-primary uppercase tracking-wide">Consejo de Chatarrero</h4>
              <p className="text-xs text-muted-foreground font-mono mt-1 leading-relaxed">
                Los materiales ÉPICOS como los &quot;Núcleos de Plasma&quot; son extremadamente difíciles de conseguir. 
                Asegúrate de fabricar el equipo que mejor se adapte a tu estilo de juego. El equipo avanzado 
                puede otorgar bonificaciones de detección de anomalías o mayor resistencia al peligro.
              </p>
           </div>
        </div>
      </footer>
    </div>
  );
}
