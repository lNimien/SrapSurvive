'use client';

import { useMemo, useState } from 'react';
import { RecipeDTO } from '@/types/dto.types';
import { RecipeCard } from '@/components/game/RecipeCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

type RecipeFilter = 'ALL' | 'HEAD' | 'BODY' | 'HANDS' | 'TOOLS' | 'BACKPACK';

const FILTERS: Array<{ key: RecipeFilter; label: string }> = [
  { key: 'ALL', label: 'Todo' },
  { key: 'HEAD', label: 'Head' },
  { key: 'BODY', label: 'Body' },
  { key: 'HANDS', label: 'Hands' },
  { key: 'TOOLS', label: 'Tools' },
  { key: 'BACKPACK', label: 'Backpack' },
];

function getRecipeFilterKey(recipe: RecipeDTO): RecipeFilter {
  const slot = recipe.resultItem.equipmentSlot;
  if (!slot) return 'ALL';
  if (slot === 'HEAD') return 'HEAD';
  if (slot === 'BODY') return 'BODY';
  if (slot === 'HANDS') return 'HANDS';
  if (slot === 'BACKPACK') return 'BACKPACK';
  if (slot.startsWith('TOOL_')) return 'TOOLS';
  return 'ALL';
}

interface CraftingRecipeGridProps {
  recipes: RecipeDTO[];
  isRunActive: boolean;
}

export function CraftingRecipeGrid({ recipes, isRunActive }: CraftingRecipeGridProps) {
  const [activeFilter, setActiveFilter] = useState<RecipeFilter>('ALL');

  const filteredRecipes = useMemo(() => {
    if (activeFilter === 'ALL') return recipes;
    return recipes.filter((recipe) => getRecipeFilterKey(recipe) === activeFilter);
  }, [activeFilter, recipes]);

  return (
    <section className="space-y-5" aria-label="Recetas filtrables del taller">
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
