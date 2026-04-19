import 'server-only';

import { describe, expect, it } from 'vitest';

import {
  ABYSSAL_FRACTURE_CONFIG,
  ORBITAL_DERELICT_CONFIG,
  SHIPYARD_CEMETERY_CONFIG,
} from '@/config/game.config';
import { getStartRunInputSchemaForLevel, StartRunInputSchema } from '@/lib/validators/run.validators';

describe('StartRunInputSchema zone validation', () => {
  it('accepts shipyard_cemetery', () => {
    const result = StartRunInputSchema.safeParse({ zoneId: SHIPYARD_CEMETERY_CONFIG.internalKey });

    expect(result.success).toBe(true);
  });

  it('accepts orbital_derelict', () => {
    const result = StartRunInputSchema.safeParse({ zoneId: ORBITAL_DERELICT_CONFIG.internalKey });

    expect(result.success).toBe(true);
  });

  it('accepts abyssal_fracture', () => {
    const result = StartRunInputSchema.safeParse({ zoneId: ABYSSAL_FRACTURE_CONFIG.internalKey });

    expect(result.success).toBe(true);
  });

  it('rejects unregistered zone', () => {
    const result = StartRunInputSchema.safeParse({ zoneId: 'forbidden_zone' });

    expect(result.success).toBe(false);
  });

  it('rejects locked zone for player level when using level-aware schema', () => {
    const result = getStartRunInputSchemaForLevel(2).safeParse({ zoneId: ORBITAL_DERELICT_CONFIG.internalKey });

    expect(result.success).toBe(false);
  });

  it('accepts zone when player level meets required minimum', () => {
    const result = getStartRunInputSchemaForLevel(8).safeParse({ zoneId: ABYSSAL_FRACTURE_CONFIG.internalKey });

    expect(result.success).toBe(true);
  });

  it('accepts explicit SAFE/HARD modes and defaults to SAFE', () => {
    const safeResult = StartRunInputSchema.safeParse({ zoneId: SHIPYARD_CEMETERY_CONFIG.internalKey, runMode: 'SAFE' });
    const hardResult = StartRunInputSchema.safeParse({ zoneId: SHIPYARD_CEMETERY_CONFIG.internalKey, runMode: 'HARD' });
    const defaultResult = StartRunInputSchema.safeParse({ zoneId: SHIPYARD_CEMETERY_CONFIG.internalKey });

    expect(safeResult.success).toBe(true);
    expect(hardResult.success).toBe(true);
    expect(defaultResult.success).toBe(true);

    if (!defaultResult.success) {
      throw new Error('Expected valid default run mode parse result');
    }

    expect(defaultResult.data.runMode).toBe('SAFE');
  });

  it('rejects invalid run mode', () => {
    const result = StartRunInputSchema.safeParse({ zoneId: SHIPYARD_CEMETERY_CONFIG.internalKey, runMode: 'NIGHTMARE' });
    expect(result.success).toBe(false);
  });
});
