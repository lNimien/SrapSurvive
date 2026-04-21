// /types/dto.types.ts

// The generic Action response for Server Actions
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ActionError };

export type ErrorCode = 
  | "UNAUTHORIZED" 
  | "VALIDATION_ERROR" 
  | "FEATURE_DISABLED"
  | "RUN_ALREADY_ACTIVE" 
  | "RUN_NOT_RUNNING" 
  | "RUN_ALREADY_RESOLVED"
  | "NOT_FOUND" 
  | "INSUFFICIENT_BALANCE"
  | "INSUFFICIENT_FUNDS"
  | "EXPIRED"
  | "TRANSACTION_FAILED"
  | "INTERNAL_ERROR";

export interface ActionError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export type ItemRarityDTO = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" | "CORRUPTED";
export type ItemTierDTO = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" | "GODLIKE";
export type RunModeDTO = 'SAFE' | 'HARD';

export type ItemConfigOptionsDTO = {
  dangerResistance?: number;
  lootMultiplier?: number;
  currencyMultiplier?: number;
  xpMultiplier?: number;
  backpackCapacity?: number;
  anomalyDetectionBonus?: number;
};

export interface PendingLootDTO {
  itemId: string;
  displayName: string;
  iconKey: string;
  quantity: number;
  rarity: ItemRarityDTO;
}

export interface AnomalyDTO {
  id: string;
  type: string;
  title: string;
  description: string;
  discoveredAt: string; // ISO
}

export interface RunStateDTO {
  status: "idle" | "running" | "catastrophe";
  runMode?: RunModeDTO;
  runId?: string;
  zoneId?: string;
  startedAt?: string;
  dangerLevel?: number;
  catastropheThreshold?: number;
  pendingLoot?: PendingLootDTO[];
  elapsedSeconds?: number;
  anomaly?: AnomalyDTO | null;
  runMutator?: RunMutatorDTO | null;
}

export interface RunMutatorDTO {
  id: 'unstable_currents' | 'dense_scrapyard' | 'narrow_escape';
  label: string;
  summary: string;
}

export interface RunStartedDTO {
  runId: string;
  zoneId: string;
  runMode: RunModeDTO;
  startedAt: string;
}

export interface ExtractionResultDTO {
  runId: string;
  status: "extracted" | "failed";
  durationSeconds: number;
  dangerLevelAtClose: number;
  catastropheOccurred: boolean;
  loot: PendingLootDTO[];
  currencyEarned: number;
  xpEarned: number;
}

export interface RunHistoryCardDTO {
  id: string;
  runId: string;
  status: "EXTRACTED" | "FAILED";
  durationSeconds: number;
  currencyEarned: number;
  xpEarned: number;
  catastropheOccurred: boolean;
  createdAt: string;
  uniqueLootCount: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface InventoryItemDTO {
  itemId: string;
  itemDefinitionId: string;
  displayName: string;
  description: string;
  rarity: ItemRarityDTO;
  iconKey: string;
  quantity: number;
  baseValue: number;
  isEquipable: boolean;
  equipmentSlot?: string;
  configOptions?: ItemConfigOptionsDTO;
}

export interface EquipmentDTO {
  HEAD: InventoryItemDTO | null;
  BODY: InventoryItemDTO | null;
  HANDS: InventoryItemDTO | null;
  TOOL_PRIMARY: InventoryItemDTO | null;
  TOOL_SECONDARY: InventoryItemDTO | null;
  BACKPACK: InventoryItemDTO | null;
}

export interface BuildSynergyEffectDTO {
  lootMultiplierBonus?: number;
  currencyMultiplierBonus?: number;
  xpMultiplierBonus?: number;
  dangerResistanceBonus?: number;
  dangerLootBonusBonus?: number;
  catastropheThresholdBonus?: number;
}

export interface BuildSynergyDTO {
  id: string;
  name: string;
  description: string;
  isArchetype: boolean;
  effects: BuildSynergyEffectDTO;
}

export interface LiveEventDTO {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  eventModifierLabel: string;
}

export interface WeeklyDirectiveDTO {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  progressRatio: number;
  status: 'IN_PROGRESS' | 'CLAIMABLE' | 'CLAIMED';
  claimable: boolean;
  claimed: boolean;
  rewardCC: number;
  rewardXP: number;
  rewardItems: WeeklyRewardItemDTO[];
  claimedAt: string | null;
}

export interface WeeklyRewardItemDTO {
  itemDefinitionId: string;
  displayName: string;
  iconKey: string;
  quantity: number;
}

export interface WeeklyGoalsDTO {
  weekKey: string;
  weekStart: string;
  activeEvent: LiveEventDTO;
  directives: WeeklyDirectiveDTO[];
}

export interface WeeklyDirectiveClaimResultDTO {
  directiveKey: string;
  weekStart: string;
  rewardCC: number;
  rewardXP: number;
  rewardItems: WeeklyRewardItemDTO[];
  newBalance: number;
  newLevel: number;
  currentXp: number;
  alreadyClaimed: boolean;
  claimedAt: string;
}

export interface PlayerAnalyticsDTO {
  totalExtractions: number;
  successRate: number;
  averageCcPerExtraction: number;
  averageXpPerExtraction: number;
  runMix: {
    safe: number;
    hard: number;
  };
  bestZoneByEarnings: {
    zoneId: string;
    totalCredits: number;
  } | null;
}

export interface AccountUpgradeEffectDTO {
  baseRateMultiplier?: number;
  quadraticFactorMultiplier?: number;
  catastropheThresholdBonus?: number;
  dangerLootBonusMultiplier?: number;
}

export interface AccountUpgradeDTO {
  id: string;
  displayName: string;
  description: string;
  costCC: number;
  effects: AccountUpgradeEffectDTO;
  purchased: boolean;
  affordable: boolean;
}

export interface UpgradePurchaseResultDTO {
  upgradeId: string;
  newBalance: number;
}

export type UpgradeBranchDTO = 'BRIDGE' | 'WORKSHOP' | 'BLACK_MARKET';
export type UpgradeNodeStateDTO = 'locked' | 'available' | 'in_progress' | 'unlocked' | 'maxed';

export interface UpgradeNodeEffectPreviewDTO {
  label: string;
  value: string;
}

export interface UpgradeNodeDTO {
  id: string;
  branch: UpgradeBranchDTO;
  tier: number;
  lane: number;
  parents: string[];
  displayName: string;
  description: string;
  icon: string;
  rarity: 'UTILITY' | 'TACTICAL' | 'ASPIRATIONAL';
  category: string;
  currentLevel: number;
  maxLevel: number;
  nextLevel: number | null;
  nextCostCC: number | null;
  nextUnlockDurationSec: number | null;
  state: UpgradeNodeStateDTO;
  affordable: boolean;
  requirementsMet: boolean;
  effectsPreview: UpgradeNodeEffectPreviewDTO[];
}

export interface UpgradeBranchSummaryDTO {
  branch: UpgradeBranchDTO;
  label: string;
  description: string;
  unlockedLevels: number;
  totalLevels: number;
  completionRatio: number;
}

export interface UpgradeResearchActiveDTO {
  queueId: string;
  nodeId: string;
  nodeName: string;
  branch: UpgradeBranchDTO;
  targetLevel: number;
  startedAt: string;
  completesAt: string;
  progressPercent: number;
  remainingSeconds: number;
  costCC: number;
  refundableCC: number;
}

export interface UpgradeTreeDTO {
  currencyBalance: number;
  nodes: UpgradeNodeDTO[];
  branches: UpgradeBranchSummaryDTO[];
  activeResearch: UpgradeResearchActiveDTO | null;
  availableCount: number;
  completedLevelCount: number;
  totalLevelCount: number;
}

export interface StartUpgradeResearchResultDTO {
  queueId: string;
  nodeId: string;
  targetLevel: number;
  completesAt: string;
  newBalance: number;
}

export interface CancelUpgradeResearchResultDTO {
  queueId: string;
  nodeId: string;
  refundedCC: number;
  newBalance: number;
}

export type AchievementTriggerDTO =
  | { type: 'EXTRACTION_RESULTS_COUNT'; target: number }
  | { type: 'CATASTROPHE_OCCURRED_COUNT'; target: number }
  | { type: 'LEVEL_REACHED'; target: number }
  | { type: 'TOTAL_SCRAP_COLLECTED'; target: number };

export interface AchievementDTO {
  id: string;
  name: string;
  description: string;
  rewardCC: number;
  rewardXP: number;
  trigger: AchievementTriggerDTO;
  unlocked: boolean;
  claimed: boolean;
}

export interface AchievementClaimResultDTO {
  achievementId: string;
  rewardCC: number;
  rewardXP: number;
  newBalance: number;
  newLevel: number;
  currentXp: number;
}

/** Contrato diario para la UI */
export interface UserContractDTO {
  id: string;
  requiredItemDefId: string;
  requiredItemName: string;
  requiredItemIcon: string;
  requiredQuantity: number;
  currentQuantity: number;
  /** Cantidad disponible actualmente en inventario para entregar */
  availableQuantity: number;
  rewardCC: number;
  rewardXP: number;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  expiresAt: string; // ISO
  chainStage?: number | null;
  chainStageCount?: number | null;
  chainState?: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | null;
  chainBonusCC?: number;
  chainBonusXP?: number;
}

export interface RecipeIngredientDTO {
  itemDefId: string;
  displayName: string;
  iconKey: string;
  rarity: ItemRarityDTO;
  requiredQuantity: number;
  currentQuantity: number;
}

export interface RecipeDTO {
  id: string;
  requiredLevel: number;
  playerLevel: number;
   recipeTier: ItemTierDTO;
   requiredTier: ItemTierDTO;
   unlockedTiers: ItemTierDTO[];
   isTierLocked: boolean;
  isLevelLocked: boolean;
  lockReason: string | null;
  resultItem: {
    id: string;
    displayName: string;
    description: string;
    rarity: ItemRarityDTO;
    iconKey: string;
    equipmentSlot?: string;
    configOptions?: ItemConfigOptionsDTO | Record<string, unknown>;
  };
  ingredients: RecipeIngredientDTO[];
  costCC: number;
  canAffordCC: boolean;
  canAffordMaterials: boolean;
}

export type CrateVisualTierDTO = 'SCAVENGER' | 'TACTICAL' | 'RELIC';

export interface CrateRewardPreviewDTO {
  itemDefinitionId: string;
  displayName: string;
  rarity: ItemRarityDTO;
  iconKey: string;
  probabilityPercent: number;
  quantityMin: number;
  quantityMax: number;
}

export interface CrateDTO {
  id: string;
  name: string;
  description: string;
  imagePath: string;
  priceCC: number;
  currentPriceCC: number;
  nextPriceCC: number;
  dailyOpenCount: number;
  visualTier: CrateVisualTierDTO;
  available: boolean;
  minLevel: number;
  unlocked: boolean;
  pityThreshold: number;
  pityToEpic: number;
  rewards: CrateRewardPreviewDTO[];
}

export interface CrateOpenResultDTO {
  crateId: string;
  crateName: string;
  basePriceCC: number;
  spentCC: number;
  nextPriceCC: number;
  dailyOpenCount: number;
  newBalance: number;
  pityThreshold: number;
  pityToEpic: number;
  pityTriggered: boolean;
  reward: {
    itemDefinitionId: string;
    displayName: string;
    rarity: ItemRarityDTO;
    iconKey: string;
    quantity: number;
  };
  openedAt: string;
}

/** Estado completo del jugador para la dashboard */
export interface PlayerStateDTO {
  userId: string;
  displayName: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  currencyBalance: number;
  equipment: EquipmentDTO;
  activeRun: RunStateDTO | null;
  contracts: UserContractDTO[];
  nextContractRefreshCostCC?: number;
  upgrades: AccountUpgradeDTO[];
  achievements: AchievementDTO[];
  activeSynergies: BuildSynergyDTO[];
  activeArchetype: BuildSynergyDTO | null;
  weeklyGoals: WeeklyGoalsDTO;
  analytics: PlayerAnalyticsDTO;
}

export interface MutatorAdjustmentProfileDTO {
  rewardDeltaPercent: number;
  dangerPressureDeltaPercent: number;
}

export interface ApplyMutatorBalanceSuggestionResultDTO {
  applied: boolean;
  dryRun: boolean;
  mutatorId: string;
  runMode: 'SAFE' | 'HARD';
  actionType: 'buff_difficulty' | 'nerf_rewards' | 'hold';
  suggestedDeltaPercent: number;
  beforeProfile: MutatorAdjustmentProfileDTO;
  afterProfile: MutatorAdjustmentProfileDTO;
  blockedReasons: string[];
}

export interface MutatorTuningCapsDTO {
  mutatorId: string;
  runMode: 'SAFE' | 'HARD';
  maxAbsRewardDeltaPercent: number;
  maxAbsDangerDeltaPercent: number;
}
