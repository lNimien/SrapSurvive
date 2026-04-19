import 'server-only';

export interface SalvageComputationInput {
  baseValue: number;
  quantity: number;
}

export function computeSalvageCreditsPerItem(baseValue: number): number {
  if (baseValue <= 0) {
    return 0;
  }

  return Math.max(1, Math.floor(baseValue * 0.35));
}

export function computeSalvageCredits({ baseValue, quantity }: SalvageComputationInput): number {
  if (quantity <= 0) {
    return 0;
  }

  return computeSalvageCreditsPerItem(baseValue) * quantity;
}
