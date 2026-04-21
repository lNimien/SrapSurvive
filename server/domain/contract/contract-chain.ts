import 'server-only';

type ContractChainStageCount = 2 | 3;

export type ContractChainState = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface ChainContractLike {
  id: string;
  rewardCC: number;
  rewardXP: number;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  createdAt: Date;
  expiresAt: Date;
}

export interface ContractChainBonus {
  rewardCC: number;
  rewardXP: number;
}

export interface ContractChainSnapshot<TContract extends ChainContractLike> {
  dateSeed: string;
  stageCount: ContractChainStageCount;
  chainContracts: TContract[];
  bonus: ContractChainBonus;
  state: ContractChainState;
}

const CHAIN_BONUS_MULTIPLIER: Readonly<Record<ContractChainStageCount, number>> = {
  2: 0.3,
  3: 0.5,
};

function seededRandom(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(index);
    hash |= 0;
  }

  return (Math.abs(hash) % 10_000) / 10_000;
}

export function getUtcDateSeed(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function resolveContractChainStageCount(userId: string, dateSeed: string): ContractChainStageCount {
  const roll = seededRandom(`${userId}:${dateSeed}:chain-stage-count`);
  return roll < 0.55 ? 2 : 3;
}

export function computeContractChainBonus(
  totalRewardCC: number,
  totalRewardXP: number,
  stageCount: ContractChainStageCount,
): ContractChainBonus {
  const multiplier = CHAIN_BONUS_MULTIPLIER[stageCount];

  return {
    rewardCC: Math.max(0, Math.floor(totalRewardCC * multiplier)),
    rewardXP: Math.max(0, Math.floor(totalRewardXP * multiplier)),
  };
}

export function buildContractChainBonusReference(userId: string, dateSeed: string): string {
  return `contract-chain-bonus:${userId}:${dateSeed}`;
}

export function buildContractChainSnapshot<TContract extends ChainContractLike>(
  userId: string,
  contracts: TContract[],
  now: Date = new Date(),
): ContractChainSnapshot<TContract> | null {
  if (contracts.length < 2) {
    return null;
  }

  const sorted = [...contracts].sort(
    (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
  );

  const dateSeed = getUtcDateSeed(sorted[0].createdAt);
  const stageCount = resolveContractChainStageCount(userId, dateSeed);
  const chainContracts = sorted.slice(0, stageCount);

  if (chainContracts.length < stageCount) {
    return null;
  }

  const totalRewardCC = chainContracts.reduce((sum, contract) => sum + contract.rewardCC, 0);
  const totalRewardXP = chainContracts.reduce((sum, contract) => sum + contract.rewardXP, 0);
  const bonus = computeContractChainBonus(totalRewardCC, totalRewardXP, stageCount);

  const hasFailedStage = chainContracts.some(
    (contract) => contract.status === 'EXPIRED' || (contract.status === 'ACTIVE' && contract.expiresAt <= now),
  );

  const allCompleted = chainContracts.every((contract) => contract.status === 'COMPLETED');
  const state: ContractChainState = hasFailedStage
    ? 'FAILED'
    : allCompleted
      ? 'COMPLETED'
      : 'IN_PROGRESS';

  return {
    dateSeed,
    stageCount,
    chainContracts,
    bonus,
    state,
  };
}
