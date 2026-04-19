import 'server-only';

/**
 * Pure functions for economy calculations.
 * Encapsulates the logic for price fluctuations in the Black Market.
 */

/**
 * Generates a deterministic pseudo-random number between 0 and 1 based on a string seed.
 */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  
  // Use the hash to generate a predictable value between 0 and 1
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

/**
 * Computes the daily price for an item based on its base value and a date seed.
 * Price varies between -20% and +30% of baseValue.
 * Result is rounded to the nearest integer as per standard economy rules.
 */
export function computeItemPrice(
  baseValue: number,
  dateSeed: string,
  itemDefinitionId: string
): number {
  if (baseValue <= 0) return 0;

  // Combine date and itemId for a unique daily seed per item
  const combinedSeed = `${dateSeed}-${itemDefinitionId}`;
  const randomValue = seededRandom(combinedSeed);

  // Map 0..1 to -0.20..+0.30
  // Multiplier = 0.80 + (randomValue * 0.50)
  const multiplier = 0.8 + (randomValue * 0.5);
  
  return Math.round(baseValue * multiplier);
}

/**
 * Returns the percentage change relative to baseValue for UI display.
 */
export function getPriceChangePercentage(
  baseValue: number,
  currentPrice: number
): number {
  if (baseValue <= 0) return 0;
  return Math.round(((currentPrice / baseValue) - 1) * 100);
}

/**
 * Dedicated sell formula for the NPC market.
 * Global nerf: players receive a conservative 35% of base value.
 */
export function computeSellUnitPrice(baseValue: number): number {
  if (baseValue <= 0) return 0;
  return Math.max(1, Math.floor(baseValue * 0.35));
}
