import 'server-only';

import { featureFlags, FeatureFlags } from '@/config/feature-flags.config';
import { ActionError } from '@/types/dto.types';

export type MutationCategory =
  | 'extraction'
  | 'market'
  | 'crafting'
  | 'contracts'
  | 'upgrade-achievement-claims';

export const MUTATION_GUARD_MAINTENANCE_MESSAGE =
  'Sistema temporalmente en mantenimiento. Intenta más tarde.';

type KillSwitchFeatureFlagKey =
  | 'killSwitchExtractionMutations'
  | 'killSwitchMarketMutations'
  | 'killSwitchCraftingMutations'
  | 'killSwitchContractsMutations'
  | 'killSwitchUpgradeAchievementClaims';

const KILL_SWITCH_FLAG_BY_CATEGORY: Record<MutationCategory, KillSwitchFeatureFlagKey> = {
  extraction: 'killSwitchExtractionMutations',
  market: 'killSwitchMarketMutations',
  crafting: 'killSwitchCraftingMutations',
  contracts: 'killSwitchContractsMutations',
  'upgrade-achievement-claims': 'killSwitchUpgradeAchievementClaims',
};

export function getKillSwitchFlagKeyForCategory(category: MutationCategory): KillSwitchFeatureFlagKey {
  return KILL_SWITCH_FLAG_BY_CATEGORY[category];
}

export function isMutationCategoryDisabled(category: MutationCategory): boolean {
  const flagKey = getKillSwitchFlagKeyForCategory(category);
  return featureFlags[flagKey];
}

export function getMutationDisabledError(category: MutationCategory): ActionError {
  const flagKey = getKillSwitchFlagKeyForCategory(category);

  return {
    code: 'FEATURE_DISABLED',
    message: MUTATION_GUARD_MAINTENANCE_MESSAGE,
    details: {
      mutationCategory: category,
      flag: flagKey,
    },
  };
}

export function guardMutationCategory(category: MutationCategory):
  | { blocked: false }
  | { blocked: true; error: ActionError } {
  if (!isMutationCategoryDisabled(category)) {
    return { blocked: false };
  }

  return {
    blocked: true,
    error: getMutationDisabledError(category),
  };
}

export function getActiveMutationKillSwitches(flags: FeatureFlags = featureFlags): Array<{
  label: string;
  envVar: string;
  active: boolean;
}> {
  return [
    {
      label: 'Extracciones y resolución de run',
      envVar: 'FEATURE_KILL_SWITCH_EXTRACTION_MUTATIONS',
      active: flags.killSwitchExtractionMutations,
    },
    {
      label: 'Mercado (compra/venta)',
      envVar: 'FEATURE_KILL_SWITCH_MARKET_MUTATIONS',
      active: flags.killSwitchMarketMutations,
    },
    {
      label: 'Crafting y salvage',
      envVar: 'FEATURE_KILL_SWITCH_CRAFTING_MUTATIONS',
      active: flags.killSwitchCraftingMutations,
    },
    {
      label: 'Contratos (entrega/refresh)',
      envVar: 'FEATURE_KILL_SWITCH_CONTRACTS_MUTATIONS',
      active: flags.killSwitchContractsMutations,
    },
    {
      label: 'Claims de mejoras y logros',
      envVar: 'FEATURE_KILL_SWITCH_UPGRADE_ACHIEVEMENT_CLAIMS',
      active: flags.killSwitchUpgradeAchievementClaims,
    },
  ];
}
