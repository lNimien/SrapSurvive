import { ItemConfigOptionsDTO } from '@/types/dto.types';

function toPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function getPerkLines(configOptions?: ItemConfigOptionsDTO): string[] {
  if (!configOptions) {
    return [];
  }

  const perks: string[] = [];

  if (typeof configOptions.dangerResistance === 'number') {
    perks.push(`Resistencia al peligro: ${toPercent(configOptions.dangerResistance)}`);
  }

  if (typeof configOptions.lootMultiplier === 'number') {
    perks.push(`Multiplicador de botín: ${toPercent(configOptions.lootMultiplier)}`);
  }

  if (typeof configOptions.currencyMultiplier === 'number') {
    perks.push(`Multiplicador de créditos: ${toPercent(configOptions.currencyMultiplier)}`);
  }

  if (typeof configOptions.xpMultiplier === 'number') {
    perks.push(`Multiplicador de XP: ${toPercent(configOptions.xpMultiplier)}`);
  }

  if (typeof configOptions.backpackCapacity === 'number') {
    perks.push(`Capacidad de mochila: ${toPercent(configOptions.backpackCapacity)}`);
  }

  if (typeof configOptions.anomalyDetectionBonus === 'number') {
    perks.push(`Detección de anomalías: ${toPercent(configOptions.anomalyDetectionBonus)}`);
  }

  return perks;
}
