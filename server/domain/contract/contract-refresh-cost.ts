import 'server-only';

const BASE_REFRESH_COST_CC = 85;
const REFRESH_STEP_CC = 35;
const MAX_REFRESH_COST_CC = 225;

export function computeContractRefreshCostCC(refreshCountToday: number): number {
  const safeCount = Math.max(0, Math.floor(refreshCountToday));
  const scaledCost = BASE_REFRESH_COST_CC + (safeCount * REFRESH_STEP_CC);
  return Math.min(MAX_REFRESH_COST_CC, scaledCost);
}
