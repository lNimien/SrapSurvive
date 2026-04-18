// /types/dto.types.ts

// The generic Action response for Server Actions
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ActionError };

export type ErrorCode = 
  | "UNAUTHORIZED" 
  | "VALIDATION_ERROR" 
  | "RUN_ALREADY_ACTIVE" 
  | "RUN_NOT_RUNNING" 
  | "NOT_FOUND" 
  | "INSUFFICIENT_FUNDS"
  | "EXPIRED"
  | "INTERNAL_ERROR";

export interface ActionError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export type ItemRarityDTO = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" | "CORRUPTED";

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
}

export interface EquipmentDTO {
  HEAD: InventoryItemDTO | null;
  BODY: InventoryItemDTO | null;
  HANDS: InventoryItemDTO | null;
  TOOL_PRIMARY: InventoryItemDTO | null;
  TOOL_SECONDARY: InventoryItemDTO | null;
  BACKPACK: InventoryItemDTO | null;
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
  resultItem: {
    id: string;
    displayName: string;
    description: string;
    rarity: ItemRarityDTO;
    iconKey: string;
    equipmentSlot?: string;
    configOptions?: any;
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
}
