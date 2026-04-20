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
  rewardCC: number;
  rewardXP: number;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  expiresAt: string; // ISO
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
  upgrades: AccountUpgradeDTO[];
  achievements: AchievementDTO[];
  activeSynergies: BuildSynergyDTO[];
  activeArchetype: BuildSynergyDTO | null;
  weeklyGoals: WeeklyGoalsDTO;
  analytics: PlayerAnalyticsDTO;
}
