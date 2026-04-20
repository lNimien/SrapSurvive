'use client';

import { useMemo, useState } from 'react';
import { RecipeDTO } from '@/types/dto.types';
import { RecipeCard } from '@/components/game/RecipeCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

type RecipeFilter = 'ALL' | 'READY' | 'LOCKED' | 'HEAD' | 'BODY' | 'HANDS' | 'TOOL_PRIMARY' | 'TOOL_SECONDARY' | 'BACKPACK';

const FILTERS: Array<{ key: RecipeFilter; label: string }> = [
  { key: 'ALL', label: 'Todas' },
  { key: 'READY', label: 'Listas' },
  { key: 'LOCKED', label: 'Bloqueadas' },
  { key: 'HEAD', label: 'Casco' },
  { key: 'BODY', label: 'Armadura' },
  { key: 'HANDS', label: 'Guantes' },
  { key: 'TOOL_PRIMARY', label: 'Herramienta P' },
  { key: 'TOOL_SECONDARY', label: 'Herramienta S' },
  { key: 'BACKPACK', label: 'Mochila' },
];

function getRecipeFilterKey(recipe: RecipeDTO): RecipeFilter {
  const slot = recipe.resultItem.equipmentSlot;
  if (!slot) return 'ALL';
  if (slot === 'HEAD') return 'HEAD';
  if (slot === 'BODY') return 'BODY';
  if (slot === 'HANDS') return 'HANDS';
  if (slot === 'BACKPACK') return 'BACKPACK';
  if (slot === 'TOOL_PRIMARY') return 'TOOL_PRIMARY';
  if (slot === 'TOOL_SECONDARY') return 'TOOL_SECONDARY';
  return 'ALL';
}

interface CraftingRecipeGridProps {
  recipes: RecipeDTO[];
  isRunActive: boolean;
}

export function CraftingRecipeGrid({ recipes, isRunActive }: CraftingRecipeGridProps) {
  const [activeFilter, setActiveFilter] = useState<RecipeFilter>('ALL');

  const sortedRecipes = useMemo(() => {
    return [...recipes].sort((left, right) => {
      const leftReady = left.canAffordCC && left.canAffordMaterials && !left.isTierLocked ? 1 : 0;
      const rightReady = right.canAffordCC && right.canAffordMaterials && !right.isTierLocked ? 1 : 0;
      return rightReady - leftReady;
    });
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    if (activeFilter === 'ALL') return sortedRecipes;
    if (activeFilter === 'READY') {
      return sortedRecipes.filter((recipe) => recipe.canAffordCC && recipe.canAffordMaterials && !recipe.isTierLocked);
    }
    if (activeFilter === 'LOCKED') {
      return sortedRecipes.filter((recipe) => recipe.isTierLocked);
    }

    return sortedRecipes.filter((recipe) => getRecipeFilterKey(recipe) === activeFilter);
  }, [activeFilter, sortedRecipes]);

  const summary = useMemo(() => {
    return {
      total: recipes.length,
      ready: recipes.filter((recipe) => recipe.canAffordCC && recipe.canAffordMaterials && !recipe.isTierLocked).length,
      locked: recipes.filter((recipe) => recipe.isTierLocked).length,
    };
  }, [recipes]);

  return (
    <section className="space-y-5" aria-label="Recetas filtrables del taller">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="border border-primary/20 bg-primary/5 p-3">
          <p className="text-[10px] uppercase tracking-widest text-primary/60 font-mono">Total recetas</p>
          <p className="text-2xl font-mono text-primary">{summary.total}</p>
        </div>
        <div className="border border-emerald-400/25 bg-emerald-500/10 p-3">
          <p className="text-[10px] uppercase tracking-widest text-emerald-300/80 font-mono">Listas para fabricar</p>
          <p className="text-2xl font-mono text-emerald-300">{summary.ready}</p>
        </div>
        <div className="border border-rose-400/25 bg-rose-500/10 p-3">
          <p className="text-[10px] uppercase tracking-widest text-rose-300/80 font-mono">Aún bloqueadas</p>
          <p className="text-2xl font-mono text-rose-300">{summary.locked}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Button
            key={filter.key}
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              'font-mono text-[11px] uppercase tracking-widest border-primary/30',
              activeFilter === filter.key && 'bg-primary text-background border-primary',
            )}
            onClick={() => setActiveFilter(filter.key)}
            aria-label={`Filtrar recetas por ${filter.label}`}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {filteredRecipes.length === 0 ? (
        <div className="border border-primary/20 bg-primary/5 p-6 text-center font-mono text-xs text-primary/80 uppercase tracking-widest">
          No hay recetas para este filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} isRunActive={isRunActive} />
          ))}
        </div>
      )}
    </section>
  );
}
