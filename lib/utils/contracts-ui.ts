import { UserContractDTO } from '@/types/dto.types';

export type ContractOperationalState = 'incomplete' | 'ready' | 'delivered' | 'blocked';

export interface ContractProgressSnapshot {
  delivered: number;
  required: number;
  remaining: number;
  available: number;
  progressPercent: number;
}

export interface ContractOperationalMeta {
  label: string;
  badgeClass: string;
  helper: string;
}

export interface ContractActionState {
  label: string;
  quantityToDeliver: number;
  disabled: boolean;
}

export function getContractProgress(contract: UserContractDTO): ContractProgressSnapshot {
  const delivered = Math.max(0, contract.currentQuantity);
  const required = Math.max(1, contract.requiredQuantity);
  const remaining = Math.max(0, required - delivered);
  const available = Math.max(0, contract.availableQuantity);
  const progressPercent = Math.min(100, Math.round((delivered / required) * 100));

  return {
    delivered,
    required,
    remaining,
    available,
    progressPercent,
  };
}

export function getContractOperationalState(contract: UserContractDTO): ContractOperationalState {
  if (contract.status === 'COMPLETED') {
    return 'delivered';
  }

  if (contract.status === 'EXPIRED') {
    return 'blocked';
  }

  const { remaining, available } = getContractProgress(contract);

  if (remaining === 0 || available >= remaining) {
    return 'ready';
  }

  return 'incomplete';
}

export function getContractOperationalMeta(state: ContractOperationalState): ContractOperationalMeta {
  if (state === 'ready') {
    return {
      label: 'Listo',
      badgeClass: 'border-cyan-500/60 bg-cyan-500/12 text-cyan-200',
      helper: 'Tenés materiales suficientes para cerrar este contrato.',
    };
  }

  if (state === 'delivered') {
    return {
      label: 'Entregado',
      badgeClass: 'border-emerald-500/60 bg-emerald-500/12 text-emerald-200',
      helper: 'Contrato liquidado y recompensa acreditada.',
    };
  }

  if (state === 'blocked') {
    return {
      label: 'Bloqueado',
      badgeClass: 'border-zinc-500/50 bg-zinc-500/12 text-zinc-300',
      helper: 'El contrato venció o quedó fuera de ventana operativa.',
    };
  }

  return {
    label: 'Incompleto',
    badgeClass: 'border-amber-500/60 bg-amber-500/12 text-amber-200',
    helper: 'Todavía falta material para completar la entrega total.',
  };
}

export function getContractActionState(contract: UserContractDTO): ContractActionState {
  const state = getContractOperationalState(contract);
  const { remaining, available } = getContractProgress(contract);

  if (state === 'delivered') {
    return { label: 'Entregado', quantityToDeliver: 0, disabled: true };
  }

  if (state === 'blocked') {
    return { label: 'Bloqueado', quantityToDeliver: 0, disabled: true };
  }

  const quantityToDeliver = Math.min(remaining, available);

  if (quantityToDeliver <= 0) {
    return { label: 'Sin materiales', quantityToDeliver: 0, disabled: true };
  }

  if (state === 'ready') {
    return {
      label: `Entregar ${quantityToDeliver} u`,
      quantityToDeliver,
      disabled: false,
    };
  }

  return {
    label: `Entregar parcial (${quantityToDeliver} u)`,
    quantityToDeliver,
    disabled: false,
  };
}
