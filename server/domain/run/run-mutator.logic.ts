import 'server-only';

import { DangerConfig } from '@/server/domain/run/run.calculator';
import { MutatorAdjustmentProfileDTO } from '@/types/dto.types';
import { RunMode } from '@/types/game.types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export interface RunMutatorDescriptor {
  id: 'unstable_currents' | 'dense_scrapyard' | 'narrow_escape';
  label: string;
  summary: string;
}

const MUTATOR_PROFILE_DELTA_CAP_PERCENT = 10;

function seededRoll(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash) % 3;
}

export function resolveRunMutator(zoneId: string, runMode: RunMode, runSeed: string): RunMutatorDescriptor {
  const roll = seededRoll(`${zoneId}:${runMode}:${runSeed}`);

  if (roll === 0) {
    return {
      id: 'unstable_currents',
      label: 'Corrientes inestables',
      summary: 'Sube la presión de peligro, pero mejora el payout por minuto.',
    };
  }

  if (roll === 1) {
    return {
      id: 'dense_scrapyard',
      label: 'Campo denso de chatarra',
      summary: 'Más botín por segundo con leve penalización de créditos.',
    };
  }

  return {
    id: 'narrow_escape',
    label: 'Ventana de escape estrecha',
    summary: 'Más XP y botín por peligro, pero menor margen de catástrofe.',
  };
}

export function applyRunMutator(
  config: DangerConfig,
  mutator: RunMutatorDescriptor,
  profile?: MutatorAdjustmentProfileDTO,
): DangerConfig {
  const rewardDeltaPercent = clamp(profile?.rewardDeltaPercent ?? 0, -MUTATOR_PROFILE_DELTA_CAP_PERCENT, MUTATOR_PROFILE_DELTA_CAP_PERCENT);
  const dangerPressureDeltaPercent = clamp(
    profile?.dangerPressureDeltaPercent ?? 0,
    -MUTATOR_PROFILE_DELTA_CAP_PERCENT,
    MUTATOR_PROFILE_DELTA_CAP_PERCENT,
  );
  const rewardFactor = 1 + (rewardDeltaPercent / 100);
  const dangerFactor = 1 + (dangerPressureDeltaPercent / 100);

  const applyProfile = (base: DangerConfig): DangerConfig => {
    const tunedLootPerSecond = Object.fromEntries(
      Object.entries(base.baseLootPerSecond).map(([itemId, rate]) => [itemId, Math.max(0, rate * rewardFactor)]),
    );

    return {
      ...base,
      baseLootPerSecond: tunedLootPerSecond,
      baseCreditsPerMinute: Math.max(0.1, base.baseCreditsPerMinute * rewardFactor),
      baseXpPerSecond: Math.max(0.1, base.baseXpPerSecond * rewardFactor),
      baseRate: Math.max(0.001, base.baseRate * dangerFactor),
      quadraticFactor: Math.max(0.0000005, base.quadraticFactor * dangerFactor),
      catastropheThreshold: clamp(base.catastropheThreshold - (dangerPressureDeltaPercent / 100) * 0.2, 0.75, 0.995),
    };
  };

  if (mutator.id === 'unstable_currents') {
    return applyProfile({
      ...config,
      baseRate: Math.max(0.001, config.baseRate * 1.15),
      quadraticFactor: Math.max(0.0000005, config.quadraticFactor * 1.12),
      baseCreditsPerMinute: Math.max(0.1, config.baseCreditsPerMinute * 1.14),
    });
  }

  if (mutator.id === 'dense_scrapyard') {
    const boostedLoot = Object.fromEntries(
      Object.entries(config.baseLootPerSecond).map(([itemId, rate]) => [itemId, Math.max(0, rate * 1.18)]),
    );

    return applyProfile({
      ...config,
      baseLootPerSecond: boostedLoot,
      baseCreditsPerMinute: Math.max(0.1, config.baseCreditsPerMinute * 0.93),
    });
  }

  return applyProfile({
    ...config,
    catastropheThreshold: clamp(config.catastropheThreshold - 0.02, 0.75, 0.995),
    baseXpPerSecond: Math.max(0.1, config.baseXpPerSecond * 1.2),
    dangerLootBonus: clamp(config.dangerLootBonus + 0.18, 0.1, 2.5),
  });
}
