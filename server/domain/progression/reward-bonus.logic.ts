import 'server-only';

export interface LevelRewardBonus {
  currencyMultiplier: number;
  xpMultiplier: number;
}

const CURRENCY_BONUS_PER_LEVEL = 0.015;
const CURRENCY_BONUS_CAP = 0.3;

const XP_BONUS_PER_LEVEL = 0.01;
const XP_BONUS_CAP = 0.2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function computeLevelRewardBonus(level: number): LevelRewardBonus {
  const normalizedLevel = Math.max(1, Math.floor(level));
  const effectiveLevels = normalizedLevel - 1;

  const currencyBonus = clamp(effectiveLevels * CURRENCY_BONUS_PER_LEVEL, 0, CURRENCY_BONUS_CAP);
  const xpBonus = clamp(effectiveLevels * XP_BONUS_PER_LEVEL, 0, XP_BONUS_CAP);

  return {
    currencyMultiplier: 1 + currencyBonus,
    xpMultiplier: 1 + xpBonus,
  };
}
