import type { FieldErrors } from './organization';

// Caleiras como tipo de obra orçamentável (pedido do promotor, 06/11/2026).
//
// Até aqui as caleiras só se **registavam** na ficha do prédio (`buildingNeeds.ts`, leitura
// conservadora de 24/10/2026: a plataforma é de pintura). O capoto foi o precedente de uma
// especialidade que passou a orçamentável; as caleiras seguem o mesmo caminho: um tipo de obra em
// «O que pretende fazer?» e um campo próprio que só aparece quando o tipo está marcado.
//
// O cliente declara o estado e o que pretende; o pintor vê o que foi declarado e orçamenta em metros
// lineares (`ml`, que já é uma unidade de `proposal.ts`). O que o cliente declarou não se altera no
// orçamento: é o pedido, não a proposta.

/**
 * O estado das caleiras. **Proposta, por confirmar pelo promotor** (06/11/2026): ele não deu as
 * opções. «Não sei» existe de propósito — o cliente não tem de subir ao telhado para pedir orçamento.
 */
export const ESTADOS_CALEIRA = ['bom', 'desgaste', 'ferrugem', 'furos', 'nao_sei'] as const;
export type EstadoCaleira = (typeof ESTADOS_CALEIRA)[number];
export const ESTADO_CALEIRA_LABELS: Record<EstadoCaleira, string> = {
  bom: 'Bom estado',
  desgaste: 'Desgaste ou tinta a descascar',
  ferrugem: 'Ferrugem',
  furos: 'Furos ou partes partidas',
  nao_sei: 'Não sei',
};

/** O que se pretende fazer — as quatro opções do promotor, pela ordem dele. */
export const INTERVENCOES_CALEIRA = ['renovar', 'substituir_partes', 'apenas_limpar', 'limpar_e_pintar'] as const;
export type IntervencaoCaleira = (typeof INTERVENCOES_CALEIRA)[number];
export const INTERVENCAO_CALEIRA_LABELS: Record<IntervencaoCaleira, string> = {
  renovar: 'Renovar (limpeza, lixar e pintar)',
  substituir_partes: 'Substituir partes',
  apenas_limpar: 'Apenas limpar',
  limpar_e_pintar: 'Limpar e pintar',
};

/** Metros guardados em centésimos de metro (centímetros), inteiros, como as quantidades das propostas. */
export interface Caleiras {
  estado: EstadoCaleira | null;
  intervencao: IntervencaoCaleira | null;
  /** Só com «Substituir partes», e aí obrigatório. */
  metrosSubstituirCm: number | null;
  /** Facultativo: o comprimento total, base de um preço por metro linear. */
  comprimentoCm: number | null;
}

export const SEM_CALEIRAS: Caleiras = { estado: null, intervencao: null, metrosSubstituirCm: null, comprimentoCm: null };

/** Um limite de bom senso: 2 km de caleira num pedido é um erro de escrita, não uma obra. */
export const METROS_MAX = 2_000;

/**
 * «12,5» ou «12.5» em centímetros. Devolve `undefined` para vazio e `null` para inválido — o
 * servidor valida sempre (regra 10): o número vem de um campo que o navegador pode alterar.
 */
export function metrosParaCm(texto: string): number | null | undefined {
  const t = texto.trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return undefined;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const cm = Math.round(Number(t) * 100);
  if (!Number.isFinite(cm) || cm <= 0 || cm > METROS_MAX * 100) return null;
  return cm;
}

const isOneOf = <T extends string>(lista: readonly T[], v: string): v is T => (lista as readonly string[]).includes(v);

/**
 * Lê o campo das caleiras. Só se lê com o tipo «Caleiras» marcado: sem ele, tudo fica vazio,
 * mesmo que o navegador mande valores (um campo escondido não pode deixar dados no pedido).
 */
export function parseCaleiras(get: (k: string) => string, marcado: boolean): { value: Caleiras; errors: FieldErrors } {
  const errors: FieldErrors = {};
  if (!marcado) return { value: SEM_CALEIRAS, errors };
  const estado = get('caleirasEstado');
  const intervencao = get('caleirasIntervencao');
  if (estado && !isOneOf(ESTADOS_CALEIRA, estado)) errors.caleirasEstado = 'Escolha uma opção.';
  if (!intervencao) errors.caleirasIntervencao = 'Indique o que pretende fazer às caleiras.';
  else if (!isOneOf(INTERVENCOES_CALEIRA, intervencao)) errors.caleirasIntervencao = 'Escolha uma opção.';

  const substituir = metrosParaCm(get('caleirasMetrosSubstituir'));
  const comprimento = metrosParaCm(get('caleirasComprimento'));
  const precisaMetros = intervencao === 'substituir_partes';
  if (precisaMetros && substituir === undefined) errors.caleirasMetrosSubstituir = 'Indique quantos metros se substituem.';
  if (precisaMetros && substituir === null) errors.caleirasMetrosSubstituir = `Indique um número de metros entre 0,01 e ${METROS_MAX}.`;
  if (comprimento === null) errors.caleirasComprimento = `Indique um número de metros entre 0,01 e ${METROS_MAX}.`;
  if (precisaMetros && typeof substituir === 'number' && typeof comprimento === 'number' && substituir > comprimento) {
    errors.caleirasMetrosSubstituir = 'Não pode ser mais do que o comprimento total.';
  }
  return {
    errors,
    value: {
      estado: estado && isOneOf(ESTADOS_CALEIRA, estado) ? estado : null,
      intervencao: intervencao && isOneOf(INTERVENCOES_CALEIRA, intervencao) ? intervencao : null,
      metrosSubstituirCm: precisaMetros && typeof substituir === 'number' ? substituir : null,
      comprimentoCm: typeof comprimento === 'number' ? comprimento : null,
    },
  };
}

/** «12,5 m» */
export const metrosPt = (cm: number) => `${(cm / 100).toLocaleString('pt-PT', { maximumFractionDigits: 2 })} m`;

/**
 * O que o cliente declarou, numa frase — a mesma para o anúncio do pintor e para o contrato.
 * `null` quando não há nada declarado.
 */
export function declaracaoDasCaleiras(c: Caleiras): string | null {
  if (!c.intervencao) return null;
  const partes = [INTERVENCAO_CALEIRA_LABELS[c.intervencao]];
  if (c.intervencao === 'substituir_partes' && c.metrosSubstituirCm) partes[0] += `: ${metrosPt(c.metrosSubstituirCm)}`;
  if (c.estado) partes.push(`estado declarado: ${ESTADO_CALEIRA_LABELS[c.estado].toLowerCase()}`);
  if (c.comprimentoCm) partes.push(`comprimento total declarado: ${metrosPt(c.comprimentoCm)}`);
  return `Caleiras — ${partes.join('; ')}.`;
}

/** Linha de uma base de dados (pedido ou anúncio) para o domínio. */
export function caleirasDaLinha(r: {
  caleiras_estado?: string | null;
  caleiras_intervencao?: string | null;
  caleiras_metros_substituir_cm?: number | null;
  caleiras_comprimento_cm?: number | null;
}): Caleiras {
  return {
    estado: r.caleiras_estado && isOneOf(ESTADOS_CALEIRA, r.caleiras_estado) ? r.caleiras_estado : null,
    intervencao: r.caleiras_intervencao && isOneOf(INTERVENCOES_CALEIRA, r.caleiras_intervencao) ? r.caleiras_intervencao : null,
    metrosSubstituirCm: r.caleiras_metros_substituir_cm ?? null,
    comprimentoCm: r.caleiras_comprimento_cm ?? null,
  };
}

/** As colunas, para gravar. */
export const colunasDasCaleiras = (c: Caleiras) => ({
  caleiras_estado: c.estado,
  caleiras_intervencao: c.intervencao,
  caleiras_metros_substituir_cm: c.metrosSubstituirCm,
  caleiras_comprimento_cm: c.comprimentoCm,
});
