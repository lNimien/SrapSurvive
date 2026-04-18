import 'server-only';

/**
 * Progression logic for Scrap & Survive.
 */

// Threshold factor: currentLevel * THRESHOLD_BASE
const THRESHOLD_BASE = 1000;

/**
 * Calculates the total XP required to level up from the current level.
 */
export function getXpThreshold(level: number): number {
  return level * THRESHOLD_BASE;
}

/**
 * Calculates the new state of progression after gaining XP.
 * 
 * @param currentXp The player's current XP.
 * @param currentLevel The player's current level.
 * @param xpGained The amount of XP earned.
 * @returns Object containing the new XP, new level, and if a level up occurred.
 */
export function calculateLevelProgress(
  currentXp: number,
  currentLevel: number,
  xpGained: number
) {
  let newXp = currentXp + xpGained;
  let newLevel = currentLevel;
  let levelsGained = 0;

  while (newXp >= getXpThreshold(newLevel)) {
    newXp -= getXpThreshold(newLevel);
    newLevel += 1;
    levelsGained += 1;
  }

  return {
    newXp,
    newLevel,
    levelsGained,
    didLevelUp: levelsGained > 0,
  };
}
