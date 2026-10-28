import type { Cents } from './money';
import { percentOf } from './money';
import type { PaymentPhase } from './proposal';

/**
 * As tranches do cliente, tiradas do contrato (pedido do promotor, 28/10/2026).
 *
 * «Se houver contrato vindo de obra ganha com o quempinta.pt, os dados devem estar pré-preenchidos
 * vindos do contrato.»
 *
 * O plano de pagamentos já foi escrito uma vez, na proposta: um adiantamento e as fases, a somar
 * 100%. Quando essa proposta é escolhida e assinada, aquilo deixa de ser uma intenção e passa a ser
 * o que o cliente deve, quando o deve. Obrigar o pintor a copiá-lo à mão para as tranches é pedir-lhe
 * que volte a decidir o que já está decidido — e é onde os enganos entram.
 *
 * Duas regras que não são óbvias:
 *
 * **Os cêntimos perdidos vão à última.** Quatro fases de 25% sobre 1.000,01 € dão quatro vezes
 * 250,00 € e perde-se um cêntimo. A última tranche leva o resto, para a soma das tranches ser
 * exactamente o contrato — de outro modo ficava sempre uma dívida de cêntimos por explicar.
 *
 * **As datas são estimativas e dizem-no.** O contrato diz a ordem das fases, não o calendário.
 * Reparte-se pelo período previsto da obra: o adiantamento no início, a última no fim, as do meio
 * espaçadas por igual. Sem início nem fim conhecidos, ficam por datar — melhor sem data do que com
 * uma data inventada, que faria a cobrança automática escrever ao cliente no dia errado.
 */

export interface TrancheDoContrato {
  descricao: string;
  valorCents: Cents;
  /** AAAA-MM-DD, ou null quando o período da obra ainda não é conhecido. */
  prevista: string | null;
}

export interface ContratoParaTranches {
  /** O que o cliente paga ao todo, com IVA: é sobre isto que as percentagens incidem. */
  totalCents: Cents;
  adiantamentoBps: number;
  fases: PaymentPhase[];
  /** Período previsto da obra, para datar as tranches. */
  inicio?: string | null;
  fim?: string | null;
}

export function tranchesDoContrato(c: ContratoParaTranches): TrancheDoContrato[] {
  const partes: { descricao: string; bps: number }[] = [
    ...(c.adiantamentoBps > 0 ? [{ descricao: 'Adiantamento', bps: c.adiantamentoBps }] : []),
    ...c.fases.filter((f) => f.bps > 0).map((f) => ({ descricao: f.nome.trim() || 'Fase', bps: f.bps })),
  ];
  if (partes.length === 0) return [];

  const valores = partes.map((p) => percentOf(c.totalCents, p.bps));
  const resto = c.totalCents - valores.reduce((n, v) => n + v, 0);
  valores[valores.length - 1] = valores[valores.length - 1]! + resto;

  const datas = repartirDatas(partes.length, c.inicio ?? null, c.fim ?? null);
  return partes.map((p, i) => ({ descricao: p.descricao, valorCents: valores[i]!, prevista: datas[i]! }));
}

/** Uma data por parte: a primeira no início, a última no fim, as do meio espaçadas por igual. */
function repartirDatas(quantas: number, inicio: string | null, fim: string | null): (string | null)[] {
  if (!inicio || !fim || fim < inicio) return Array(quantas).fill(null);
  if (quantas === 1) return [inicio];
  const d0 = Date.parse(`${inicio}T00:00:00Z`);
  const d1 = Date.parse(`${fim}T00:00:00Z`);
  if (Number.isNaN(d0) || Number.isNaN(d1)) return Array(quantas).fill(null);
  const dia = 86_400_000;
  return Array.from({ length: quantas }, (_, i) =>
    new Date(d0 + Math.round(((d1 - d0) / (quantas - 1)) * i) / dia * dia).toISOString().slice(0, 10),
  );
}

/** O plano em palavras, para o pintor ver o que vai ser criado antes de carregar no botão. */
export function resumoDoPlano(ts: TrancheDoContrato[]): string {
  if (ts.length === 0) return 'O contrato não tem plano de pagamentos.';
  return `${ts.length} ${ts.length === 1 ? 'tranche' : 'tranches'}, do adiantamento ao fim da obra.`;
}
