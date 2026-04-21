export interface FeatureFlags {
  c1EconomyTelemetry: boolean;
  c2GlobalMarketBeta: boolean;
  c3PremiumSystems: boolean;
  c3LiveOps: boolean;
  d3BuildSynergies: boolean;
  d3WeeklyGoals: boolean;
  d3PlayerAnalytics: boolean;
  d3BalanceGovernance: boolean;
  killSwitchExtractionMutations: boolean;
  killSwitchMarketMutations: boolean;
  killSwitchCraftingMutations: boolean;
  killSwitchContractsMutations: boolean;
  killSwitchUpgradeAchievementClaims: boolean;
  mutatorTuningDbPrimary: boolean;
}

const TRUE_LITERALS = new Set(['1', 'true', 'yes', 'on']);

function parseBooleanFlag(rawValue: string | undefined): boolean {
  if (!rawValue) {
    return false;
  }

  return TRUE_LITERALS.has(rawValue.trim().toLowerCase());
}

function readFlag(envVarName: string): boolean {
  return parseBooleanFlag(process.env[envVarName]);
}

export const featureFlags: FeatureFlags = {
  c1EconomyTelemetry: readFlag('FEATURE_C1_ECONOMY_TELEMETRY'),
  c2GlobalMarketBeta: readFlag('FEATURE_C2_GLOBAL_MARKET_BETA'),
  c3PremiumSystems: readFlag('FEATURE_C3_PREMIUM_SYSTEMS'),
  c3LiveOps: readFlag('FEATURE_C3_LIVE_OPS'),
  d3BuildSynergies: readFlag('FEATURE_D3_BUILD_SYNERGIES'),
  d3WeeklyGoals: readFlag('FEATURE_D3_WEEKLY_GOALS'),
  d3PlayerAnalytics: readFlag('FEATURE_D3_PLAYER_ANALYTICS'),
  d3BalanceGovernance: readFlag('FEATURE_D3_BALANCE_GOVERNANCE'),
  killSwitchExtractionMutations: readFlag('FEATURE_KILL_SWITCH_EXTRACTION_MUTATIONS'),
  killSwitchMarketMutations: readFlag('FEATURE_KILL_SWITCH_MARKET_MUTATIONS'),
  killSwitchCraftingMutations: readFlag('FEATURE_KILL_SWITCH_CRAFTING_MUTATIONS'),
  killSwitchContractsMutations: readFlag('FEATURE_KILL_SWITCH_CONTRACTS_MUTATIONS'),
  killSwitchUpgradeAchievementClaims: readFlag('FEATURE_KILL_SWITCH_UPGRADE_ACHIEVEMENT_CLAIMS'),
  mutatorTuningDbPrimary: readFlag('FEATURE_MUTATOR_TUNING_DB_PRIMARY'),
};

export function isAnyD3PanelEnabled(): boolean {
  return (
    featureFlags.d3BuildSynergies ||
    featureFlags.d3WeeklyGoals ||
    featureFlags.d3PlayerAnalytics ||
    featureFlags.d3BalanceGovernance
  );
}
