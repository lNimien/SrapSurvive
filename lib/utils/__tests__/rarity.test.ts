import { describe, expect, it } from 'vitest';

import { ITEM_TIER_LADDER } from '@/config/item-tiers.config';
import { compareTierOrder, getRarityVisuals, getTierLabel, resolveItemTier } from '@/lib/utils/rarity';

describe('tier helpers', () => {
  it('keeps the canonical tier ladder ordering', () => {
    expect(ITEM_TIER_LADDER).toEqual(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'GODLIKE']);
    expect(compareTierOrder('COMMON', 'LEGENDARY')).toBeLessThan(0);
    expect(compareTierOrder('GODLIKE', 'RARE')).toBeGreaterThan(0);
  });

  it('returns deterministic visuals and labels from centralized metadata', () => {
    expect(getRarityVisuals('RARE')).toMatchObject({
      borderClass: 'border-l-violet-400',
      textClass: 'text-violet-300',
      badgeClass: 'border-violet-400/50 bg-violet-500/10 text-violet-200',
    });

    expect(getTierLabel('LEGENDARY')).toBe('Legendary');
  });

  it('maps legacy rarity values to canonical tiers safely', () => {
    expect(resolveItemTier('CORRUPTED')).toBe('GODLIKE');
    expect(getRarityVisuals('CORRUPTED').textClass).toContain('cyan');
  });
});
