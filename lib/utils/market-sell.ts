export function normalizeSellAmount(rawValue: number, maxQuantity: number): number {
  if (!Number.isFinite(rawValue)) {
    return 1;
  }

  const max = Math.max(1, Math.floor(maxQuantity));
  const normalized = Math.round(rawValue);
  return Math.min(Math.max(1, normalized), max);
}
