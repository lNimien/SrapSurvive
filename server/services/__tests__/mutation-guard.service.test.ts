import 'server-only';

import { afterEach, describe, expect, it, vi } from 'vitest';

const FLAG_ENV_VARS = [
  'FEATURE_KILL_SWITCH_EXTRACTION_MUTATIONS',
  'FEATURE_KILL_SWITCH_MARKET_MUTATIONS',
  'FEATURE_KILL_SWITCH_CRAFTING_MUTATIONS',
  'FEATURE_KILL_SWITCH_CONTRACTS_MUTATIONS',
  'FEATURE_KILL_SWITCH_UPGRADE_ACHIEVEMENT_CLAIMS',
] as const;

const originalEnv: Record<string, string | undefined> = {};

for (const envVar of FLAG_ENV_VARS) {
  originalEnv[envVar] = process.env[envVar];
}

async function loadGuardService() {
  vi.resetModules();
  return import('@/server/services/mutation-guard.service');
}

afterEach(() => {
  for (const envVar of FLAG_ENV_VARS) {
    const originalValue = originalEnv[envVar];
    if (typeof originalValue === 'undefined') {
      delete process.env[envVar];
    } else {
      process.env[envVar] = originalValue;
    }
  }
});

describe('mutation guard service', () => {
  it('defaults all kill-switch flags to false when env vars are unset', async () => {
    for (const envVar of FLAG_ENV_VARS) {
      delete process.env[envVar];
    }

    const { isMutationCategoryDisabled } = await loadGuardService();

    expect(isMutationCategoryDisabled('extraction')).toBe(false);
    expect(isMutationCategoryDisabled('market')).toBe(false);
    expect(isMutationCategoryDisabled('crafting')).toBe(false);
    expect(isMutationCategoryDisabled('contracts')).toBe(false);
    expect(isMutationCategoryDisabled('upgrade-achievement-claims')).toBe(false);
  });

  it('parses truthy env values and returns standardized action-safe error metadata', async () => {
    process.env.FEATURE_KILL_SWITCH_EXTRACTION_MUTATIONS = ' TRUE ';

    const { guardMutationCategory, MUTATION_GUARD_MAINTENANCE_MESSAGE } = await loadGuardService();

    const guardResult = guardMutationCategory('extraction');

    expect(guardResult.blocked).toBe(true);
    if (!guardResult.blocked) {
      throw new Error('Expected kill-switch guard to block extraction mutations.');
    }

    expect(guardResult.error.code).toBe('FEATURE_DISABLED');
    expect(guardResult.error.message).toBe(MUTATION_GUARD_MAINTENANCE_MESSAGE);
    expect(guardResult.error.details).toMatchObject({
      mutationCategory: 'extraction',
      flag: 'killSwitchExtractionMutations',
    });
  });
});
