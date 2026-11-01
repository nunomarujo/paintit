// Votação indicativa dos condóminos sobre as propostas de um pedido (decisão de 01/11/2026).
//
// O voto não adjudica nada: a escolha continua a ser do administrador, com a ata da assembleia.
// O que a plataforma dá é a contagem — por número de votos e, quando o gestor registou a
// permilagem das frações, por permilagem somada — para o administrador levar à assembleia já
// com o sentido dos condóminos. Permilagem em inteiros (‰, soma do prédio = 1000); ausente
// quando o gestor não a registou para aquela fração.

export type Voto = {
  /** Fração de quem votou (identifica o votante sem o nomear). */
  fracao: string;
  proposalId: string;
  /** ‰ da fração; null quando o gestor não registou. */
  permilagem: number | null;
};

export type ContagemDeProposta = {
  proposalId: string;
  votos: number;
  /** Soma das permilagens dos votos que a tinham registada. */
  permilagem: number;
  /** Quantos destes votos vieram de frações sem permilagem registada. */
  semPermilagem: number;
};

export type Contagem = {
  porProposta: ContagemDeProposta[];
  totalVotos: number;
  /** Soma das permilagens de todos os votantes com permilagem registada. */
  permilagemVotante: number;
  /** Quantos votantes não têm permilagem registada — se > 0, a coluna da permilagem é parcial. */
  votantesSemPermilagem: number;
  /** A proposta com mais votos, ou null em empate / sem votos. */
  maisVotada: string | null;
  /** A proposta com mais permilagem, ou null em empate, sem votos ou sem permilagens. */
  maisPermilagem: string | null;
};

export class VotacaoError extends Error {}

export function assertPermilagem(value: number, label = 'permilagem'): number {
  if (!Number.isInteger(value) || value <= 0 || value > 1000) {
    throw new VotacaoError(`${label} inválida: ${value} (inteiro entre 1 e 1000)`);
  }
  return value;
}

function vencedor<T extends { proposalId: string }>(linhas: T[], valor: (l: T) => number): string | null {
  if (linhas.length === 0) return null;
  const ordenadas = [...linhas].sort((a, b) => valor(b) - valor(a));
  const topo = valor(ordenadas[0]!);
  if (topo <= 0) return null;
  if (ordenadas.length > 1 && valor(ordenadas[1]!) === topo) return null;
  return ordenadas[0]!.proposalId;
}

/**
 * Conta os votos. Um voto por fração: se a mesma fração aparecer duas vezes é erro de quem chamou
 * (a base garante a unicidade; aqui só se recusa a contar duas vezes).
 */
export function contarVotos(votos: Voto[], propostas: string[]): Contagem {
  const vistas = new Set<string>();
  for (const v of votos) {
    if (vistas.has(v.fracao)) throw new VotacaoError(`a fração ${v.fracao} votou duas vezes`);
    vistas.add(v.fracao);
    if (v.permilagem !== null) assertPermilagem(v.permilagem, `permilagem da fração ${v.fracao}`);
  }

  const porProposta: ContagemDeProposta[] = propostas.map((proposalId) => {
    const meus = votos.filter((v) => v.proposalId === proposalId);
    return {
      proposalId,
      votos: meus.length,
      permilagem: meus.reduce((s, v) => s + (v.permilagem ?? 0), 0),
      semPermilagem: meus.filter((v) => v.permilagem === null).length,
    };
  });

  const votantesSemPermilagem = votos.filter((v) => v.permilagem === null).length;
  return {
    porProposta,
    totalVotos: votos.length,
    permilagemVotante: votos.reduce((s, v) => s + (v.permilagem ?? 0), 0),
    votantesSemPermilagem,
    maisVotada: vencedor(porProposta, (l) => l.votos),
    maisPermilagem: vencedor(porProposta, (l) => l.permilagem),
  };
}

/** Texto curto para o ecrã do gestor: «3 votos · 412‰» ou «3 votos» quando não há permilagens. */
export function resumoDaContagem(linha: ContagemDeProposta, temPermilagens: boolean): string {
  const votos = `${linha.votos} ${linha.votos === 1 ? 'voto' : 'votos'}`;
  if (!temPermilagens) return votos;
  const parcial = linha.semPermilagem > 0 ? ` (${linha.semPermilagem} sem permilagem)` : '';
  return `${votos} · ${linha.permilagem}‰${parcial}`;
}
