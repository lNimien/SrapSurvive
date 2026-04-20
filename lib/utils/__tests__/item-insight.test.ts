import { describe, expect, it } from 'vitest';

import { deriveItemInsight, deriveItemStats } from '@/lib/utils/item-insight';

describe('item insight helpers', () => {
  it('derives readable stat lines from config options', () => {
    const stats = deriveItemStats({
      dangerResistance: 0.1,
      lootMultiplier: 0.25,
      xpMultiplier: 0.08,
    });

    expect(stats).toContain('Peligro -10% en crecimiento efectivo.');
    expect(stats).toContain('Botín +25% por ciclo de extracción.');
    expect(stats).toContain('XP +8% por run.');
  });

  it('builds a short tactical explanation for equipped gear', () => {
    const insight = deriveItemInsight({
      isEquipable: true,
      configOptions: {
        lootMultiplier: 0.4,
        dangerResistance: -0.05,
      },
    });

    expect(insight).toContain('Botín +40% por ciclo de extracción.');
    expect(insight).toContain('Peligro +5% en crecimiento efectivo.');
  });

  it('returns a safe fallback message when no effects are defined', () => {
    expect(deriveItemInsight({ isEquipable: false, configOptions: undefined })).toContain('Material base de mercado');
    expect(deriveItemInsight({ isEquipable: true, configOptions: undefined })).toContain('Equipo base sin modificadores');
  });
});
