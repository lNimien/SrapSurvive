import { ItemConfigOptionsDTO, InventoryItemDTO } from '@/types/dto.types';

function toPercent(value: number): string {
  const normalized = Math.round(value * 100);
  return `${normalized > 0 ? '+' : ''}${normalized}%`;
}

function buildEffects(configOptions?: ItemConfigOptionsDTO): string[] {
  if (!configOptions) {
    return [];
  }

  const effects: string[] = [];

  if (typeof configOptions.dangerResistance === 'number') {
    effects.push(`Peligro ${toPercent(-configOptions.dangerResistance)} en crecimiento efectivo.`);
  }

  if (typeof configOptions.lootMultiplier === 'number') {
    effects.push(`Botín ${toPercent(configOptions.lootMultiplier)} por ciclo de extracción.`);
  }

  if (typeof configOptions.currencyMultiplier === 'number') {
    effects.push(`Créditos ${toPercent(configOptions.currencyMultiplier)} al extraer.`);
  }

  if (typeof configOptions.xpMultiplier === 'number') {
    effects.push(`XP ${toPercent(configOptions.xpMultiplier)} por run.`);
  }

  if (typeof configOptions.backpackCapacity === 'number') {
    effects.push(`Capacidad ${toPercent(configOptions.backpackCapacity)} para carga útil.`);
  }

  if (typeof configOptions.anomalyDetectionBonus === 'number') {
    effects.push(`Detección ${toPercent(configOptions.anomalyDetectionBonus)} de anomalías.`);
  }

  return effects;
}

export function deriveItemInsight(item: Pick<InventoryItemDTO, 'isEquipable' | 'configOptions'>): string {
  const effects = buildEffects(item.configOptions);

  if (effects.length === 0) {
    return item.isEquipable
      ? 'Equipo base sin modificadores activos. Útil para completar slot y habilitar sinergias.'
      : 'Material base de mercado. Úsalo en crafting, contratos o venta directa.';
  }

  return effects.slice(0, 2).join(' ');
}

export function deriveItemStats(configOptions?: ItemConfigOptionsDTO): string[] {
  return buildEffects(configOptions);
}
