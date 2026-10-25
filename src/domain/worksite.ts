import type { Cents } from './money';
import { custoDoDia, suplementaresDe, type TipoDia } from './overtime';

// Ferramentas de obra do pintor (opcionais, depois da contratação): equipa,
// fases, custos, horas e tranches. São dados internos do pintor; o cliente não
// os vê. A plataforma não intervém na execução (docs/MODELO.md).

export const MEMBER_ROLES = ['chefe_equipa', 'pintor', 'ajudante', 'subempreiteiro'] as const;
export type CrewRole = (typeof MEMBER_ROLES)[number];
export const CREW_ROLE_LABELS: Record<CrewRole, string> = {
  chefe_equipa: 'Chefe de equipa',
  pintor: 'Pintor',
  ajudante: 'Ajudante',
  subempreiteiro: 'Subempreiteiro',
};

export const COST_CATEGORIES = ['material', 'equipamento', 'andaime', 'transporte', 'licencas', 'mao_obra_externa', 'outro'] as const;
export type CostCategory = (typeof COST_CATEGORIES)[number];
export const COST_LABELS: Record<CostCategory, string> = {
  material: 'Material',
  equipamento: 'Equipamento',
  andaime: 'Andaimes e plataformas',
  transporte: 'Transporte',
  licencas: 'Licenças e taxas',
  mao_obra_externa: 'Mão de obra externa',
  outro: 'Outro',
};

export const PAYMENT_METHODS = ['transferencia', 'mbway', 'multibanco', 'cheque', 'numerario', 'outro'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  transferencia: 'Transferência',
  mbway: 'MB WAY',
  multibanco: 'Multibanco',
  cheque: 'Cheque',
  numerario: 'Numerário',
  outro: 'Outro',
};

export const PHASE_STATES = ['por_iniciar', 'em_curso', 'concluida'] as const;
export type PhaseState = (typeof PHASE_STATES)[number];

export interface Tranche {
  valor: Cents;
  prevista: string | null;
  recebidaEm: string | null;
}
export interface Cost {
  categoria: CostCategory;
  valor: Cents;
}
export interface Hours {
  /** Horas em centésimos (7,5 h = 750). */
  horas: number;
  custoHora: Cents | null;
  /** Quem as fez, para o limiar anual de trabalho suplementar ser por pessoa. */
  memberId?: string | null;
  /** AAAA-MM-DD: o ano decide em que contagem anual o dia entra. */
  data?: string | null;
  /** Dia útil ou dia de descanso/feriado. Ausente conta como dia útil. */
  tipoDia?: TipoDia | null;
}

export interface WorksiteSummary {
  contrato: Cents;
  recebido: Cents;
  porReceber: Cents;
  /** Tranches com data prevista ultrapassada e ainda não recebidas. */
  emAtraso: Cents;
  custos: Cents;
  porCategoria: Partial<Record<CostCategory, Cents>>;
  maoDeObra: Cents;
  horas: number;
  /** Horas suplementares da obra, em centésimos — as que custam acréscimo. */
  suplementares: number;
  margem: Cents;
  /** Margem sobre o contrato, em pontos-base (null sem contrato). */
  margemBps: number | null;
  /** Tranches planeadas que não cobrem o contrato (positivo = falta planear). */
  semPlano: Cents;
}

/**
 * O custo da mão de obra conta o trabalho suplementar: dez horas ao preço de oito mentiriam na
 * margem, e a margem é a única razão por que estas horas se registam (25/10/2026).
 *
 * As horas chegam já ordenadas por data, para o limiar anual das 100 horas ser aplicado pela ordem em
 * que as horas aconteceram — quem passou o limiar a meio do ano paga o dobro só de lá para a frente.
 */
export function summarize(p: { contrato: Cents; tranches: Tranche[]; costs: Cost[]; hours: Hours[]; today: string }): WorksiteSummary {
  const recebido = p.tranches.filter((t) => t.recebidaEm).reduce((n, t) => n + t.valor, 0);
  const planeado = p.tranches.reduce((n, t) => n + t.valor, 0);
  const emAtraso = p.tranches.filter((t) => !t.recebidaEm && t.prevista && t.prevista < p.today).reduce((n, t) => n + t.valor, 0);
  const porCategoria: Partial<Record<CostCategory, Cents>> = {};
  for (const c of p.costs) porCategoria[c.categoria] = (porCategoria[c.categoria] ?? 0) + c.valor;
  const custosDiretos = p.costs.reduce((n, c) => n + c.valor, 0);
  // Acumulado anual por pessoa, para o limiar das 100 horas (src/domain/overtime.ts).
  const acumulado = new Map<string, number>();
  let maoDeObra = 0;
  let suplementares = 0;
  for (const h of p.hours) {
    const chave = `${h.memberId ?? 'sem-pessoa'}|${(h.data ?? '').slice(0, 4)}`;
    const antes = acumulado.get(chave) ?? 0;
    const dia = { horas: h.horas, tipoDia: h.tipoDia ?? ('util' as const) };
    maoDeObra += custoDoDia(dia, h.custoHora ?? 0, antes).custoTotal;
    const extra = suplementaresDe(dia);
    suplementares += extra;
    acumulado.set(chave, antes + extra);
  }
  const horas = p.hours.reduce((n, h) => n + h.horas, 0);
  const custos = custosDiretos + maoDeObra;
  const margem = p.contrato - custos;
  return {
    contrato: p.contrato,
    recebido,
    porReceber: Math.max(0, p.contrato - recebido),
    emAtraso,
    custos,
    porCategoria,
    maoDeObra,
    horas,
    suplementares,
    margem,
    margemBps: p.contrato > 0 ? Math.round((margem * 10000) / p.contrato) : null,
    semPlano: p.contrato - planeado,
  };
}
