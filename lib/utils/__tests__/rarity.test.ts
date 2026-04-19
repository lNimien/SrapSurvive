import { describe, expect, it } from 'vitest';

import { getRarityVisuals } from '@/lib/utils/rarity';

describe('getRarityVisuals', () => {
  it('returns deterministic classes for rare tiers', () => {
    expect(getRarityVisuals('RARE')).toMatchObject({
      borderClass: 'border-l-blue-400',
      textClass: 'text-blue-300',
    });

    expect(getRarityVisuals('LEGENDARY')).toMatchObject({
      borderClass: 'border-l-amber-400',
      textClass: 'text-amber-300',
    });
  });

  it('keeps corrupted tier visually distinct', () => {
    const corrupted = getRarityVisuals('CORRUPTED');
    expect(corrupted.borderClass).toContain('red');
    expect(corrupted.textClass).toContain('red');
  });
});
