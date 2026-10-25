import type { Cents } from './money';

// Obras de uma empresa de pintura (25/10/2026, docs/DECISOES.md).
//
// Uma obra pode ter vindo da plataforma — e então tem contratação por trás — ou ser obra própria do
// pintor, ganha por fora. As ferramentas são as mesmas: é a mesma gente, o mesmo material e os
// mesmos custos, e não fazia sentido só funcionarem para quem já tinha ganho uma obra aqui.

export const WORKSITE_STATES = ['ativa', 'concluida', 'cancelada'] as const;
export type WorksiteState = (typeof WORKSITE_STATES)[number];
export const WORKSITE_STATE_LABELS: Record<WorksiteState, string> = {
  ativa: 'Em curso',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export interface WorksiteInput {
  nome: string;
  clienteNome: string | null;
  local: string | null;
  valorCents: Cents | null;
  inicio: string | null;
}

export function worksiteErrors(input: WorksiteInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const nome = input.nome.trim();
  if (nome.length < 2) errors.nome = 'Dê um nome à obra — basta a rua ou o cliente.';
  if (nome.length > 160) errors.nome = 'Até 160 caracteres.';
  if (input.valorCents !== null && (!Number.isInteger(input.valorCents) || input.valorCents < 0)) {
    errors.valor = 'Valor em euros, sem IVA.';
  }
  if (input.inicio !== null && !/^\d{4}-\d{2}-\d{2}$/.test(input.inicio)) errors.inicio = 'Data em AAAA-MM-DD.';
  return errors;
}

// --- Consumíveis -------------------------------------------------------------------------------
//
// O stock não se guarda em lado nenhum: soma-se dos movimentos. Dois números a dizer o mesmo acabam
// sempre por discordar, e aqui o que manda é o histórico de entradas e saídas.

export const UNIDADES = ['un', 'l', 'kg', 'm', 'm2', 'rolo', 'caixa'] as const;
export type Unidade = (typeof UNIDADES)[number];
export const UNIDADE_LABELS: Record<Unidade, string> = {
  un: 'unidades',
  l: 'litros',
  kg: 'kg',
  m: 'metros',
  m2: 'm²',
  rolo: 'rolos',
  caixa: 'caixas',
};

export interface Movimento {
  consumableId: string;
  /** Centésimos da unidade, com sinal: positivo entra, negativo sai para uma obra. */
  quantidade: number;
  worksiteId: string | null;
}

export interface Consumivel {
  id: string;
  nome: string;
  unidade: Unidade;
  /** Abaixo disto é altura de repor. Centésimos da unidade; 0 = sem alerta. */
  minimo: number;
}

export interface SaldoConsumivel extends Consumivel {
  stock: number;
  /** Está abaixo do mínimo que a empresa definiu. */
  repor: boolean;
}

/** O stock de cada consumível agora, somado dos movimentos. */
export function saldos(consumiveis: Consumivel[], movimentos: Movimento[]): SaldoConsumivel[] {
  return consumiveis
    .map((c) => {
      const stock = movimentos.filter((m) => m.consumableId === c.id).reduce((n, m) => n + m.quantidade, 0);
      return { ...c, stock, repor: c.minimo > 0 && stock < c.minimo };
    })
    .sort((a, b) => Number(b.repor) - Number(a.repor) || a.nome.localeCompare(b.nome, 'pt'));
}

/** Quanto de cada consumível saiu para uma obra — o que ela gastou. */
export function gastoNaObra(movimentos: Movimento[], worksiteId: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of movimentos) {
    if (m.worksiteId === worksiteId && m.quantidade < 0) out[m.consumableId] = (out[m.consumableId] ?? 0) - m.quantidade;
  }
  return out;
}

/** Formata centésimos de unidade como quantidade legível (1250 → "12,5"). */
export const formatQuantidade = (centesimos: number): string =>
  (centesimos / 100).toLocaleString('pt-PT', { maximumFractionDigits: 2 });
