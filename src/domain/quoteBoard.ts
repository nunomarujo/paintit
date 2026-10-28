import type { Cents } from './money';

// Como se arruma a secção de orçamentos (pedido do promotor, 25/10/2026).
//
// O problema a resolver não é de arrumação: é que um orçamento preenchido e nunca enviado parece
// feito. O botão de dar como enviado fica no fim da página do orçamento e o pintor sai de lá
// convencido de que tratou do assunto. Daí os três grupos — e daí o aviso.

export const ESTADOS_ORCAMENTO = ['rascunho', 'enviado', 'ganho', 'perdido'] as const;
export type EstadoOrcamento = (typeof ESTADOS_ORCAMENTO)[number];

export const GRUPOS = ['preenchimento', 'enviados', 'arquivo'] as const;
export type GrupoOrcamentos = (typeof GRUPOS)[number];

export const GRUPO_LABELS: Record<GrupoOrcamentos, string> = {
  preenchimento: 'Em preenchimento',
  enviados: 'Enviados',
  arquivo: 'Arquivo',
};

export const GRUPO_EXPLICACOES: Record<GrupoOrcamentos, string> = {
  preenchimento: 'Ainda não foram para o cliente. Enquanto estiverem aqui, não contam para nada.',
  enviados: 'Já foram para o cliente e esperam resposta.',
  arquivo: 'Ganhos e não ganhos. Ficam para consulta e para alimentar a biblioteca de preços.',
};

/** Ganho e perdido são história: o orçamento cumpriu o que tinha a cumprir. */
export function grupoDe(estado: EstadoOrcamento): GrupoOrcamentos {
  if (estado === 'rascunho') return 'preenchimento';
  if (estado === 'enviado') return 'enviados';
  return 'arquivo';
}

export interface OrcamentoDoPainel {
  id: string;
  estado: EstadoOrcamento;
  criadoEm: string;
  totalCents: Cents;
  linhas: number;
}

export function contarPorGrupo(os: OrcamentoDoPainel[]): Record<GrupoOrcamentos, number> {
  return {
    preenchimento: os.filter((o) => grupoDe(o.estado) === 'preenchimento').length,
    enviados: os.filter((o) => grupoDe(o.estado) === 'enviados').length,
    arquivo: os.filter((o) => grupoDe(o.estado) === 'arquivo').length,
  };
}

/** Dias a partir dos quais um orçamento preenchido e parado passa a ser avisado. */
export const DIAS_PARA_AVISAR = 3;

export interface AvisoDeOrcamento {
  id: string;
  dias: number;
}

/**
 * Orçamentos que já estão feitos e nunca saíram daqui.
 *
 * Só conta um que tenha linhas e valor: um rascunho aberto e abandonado no primeiro ecrã não é um
 * esquecimento, é uma desistência, e avisar sobre ele seria ruído. O que interessa é o que custou
 * uma tarde a fazer e ficou parado.
 */
export function orcamentosPorEnviar(os: OrcamentoDoPainel[], hoje: string, limite = DIAS_PARA_AVISAR): AvisoDeOrcamento[] {
  const agora = Date.parse(hoje);
  return os
    .filter((o) => o.estado === 'rascunho' && o.linhas > 0 && o.totalCents > 0)
    .map((o) => ({ id: o.id, dias: Math.floor((agora - Date.parse(o.criadoEm.slice(0, 10))) / 86_400_000) }))
    .filter((a) => a.dias >= limite)
    .sort((a, b) => b.dias - a.dias);
}

/** Pode apagar-se? O que já foi para o cliente, não: é prova do que foi proposto. */
export function podeApagar(estado: EstadoOrcamento): boolean {
  return estado === 'rascunho' || estado === 'perdido';
}

/**
 * Porque é que este não se apaga.
 *
 * O botão desaparecia sem explicação e o promotor estranhou (28/10/2026): no arquivo, um orçamento
 * perdido mostrava "Apagar" e um ganho não, sem nada que dissesse porquê. A regra estava certa e só
 * vivia dentro da acção, onde ninguém a lê antes de carregar. Um controlo escondido sem motivo
 * parece avaria; com o motivo escrito ao lado, passa a ser uma regra.
 */
export function porqueNaoApaga(estado: EstadoOrcamento): string | null {
  if (podeApagar(estado)) return null;
  return estado === 'enviado'
    ? 'Enviado ao cliente: fica como prova do que propôs. Pode registá-lo como não ganho.'
    : 'Deu origem a uma obra. Apague a obra primeiro, se for esse o caso.';
}
