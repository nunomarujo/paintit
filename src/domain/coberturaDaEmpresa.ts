// Os concelhos onde a empresa faz levantamentos (decisões do promotor, 06/11/2026).
//
// «Ninguém trabalha para o país todo, e se o fizer tem de ser explícito.» E: «quando não indicados, devem
// ficar associados à morada registada da empresa.» Até aqui, uma empresa sem zona gravada, ou com a lista
// vazia, recebia oportunidades de todo o país. Agora:
//
// - A zona escolhida é uma lista de concelhos (pelo menos um) **ou** «Todo o país», marcado de propósito,
//   com a confirmação escrita ao lado. Uma lista vazia nunca quer dizer «todo o país».
// - **Sem zona escolhida, valem o concelho da morada da empresa** (`organizations.concelho`, tirado do
//   código postal) **e os das suas lojas** (`supplier_stores`, desde 06/11/2026). Sem zona, sem morada e sem
//   lojas, não chega nada.
//
// A base faz a mesma conta em `private.supplier_covers` (migrações `cobertura_explicita` e
// `concelho_da_morada_da_empresa`); esta é a versão do lado da aplicação, para os ecrãs e para os convites.

import { DISTRITOS } from '@/lib/concelhos';

export interface Cobertura {
  todoOPais: boolean;
  concelhos: readonly string[];
}

const TODOS = new Set(DISTRITOS.flatMap((d) => d.concelhos));

/** De onde vêm os concelhos por omissão: a morada da empresa e as lojas. Uma `string` é só a morada. */
export type PorOmissao = { morada: string | null; lojas: readonly (string | null)[] } | string | null | undefined;

/** Os concelhos por omissão, sem repetidos e sem vazios: primeiro o da morada, depois os das lojas. */
export function concelhosPorOmissao(p: PorOmissao): string[] {
  const o = typeof p === 'string' || p == null ? { morada: p ?? null, lojas: [] } : p;
  return [...new Set([o.morada, ...o.lojas].filter((c): c is string => !!c))];
}
const temLojas = (p: PorOmissao) => typeof p === 'object' && p !== null && p.lojas.some(Boolean);

/** A empresa escolheu a zona: pelo menos um concelho, ou «Todo o país» marcado. */
export const zonasDefinidas = (c: Cobertura | null | undefined): boolean => !!c && (c.todoOPais || c.concelhos.length > 0);

/**
 * A zona que vale: a escolhida; sem ela, os concelhos da morada e das lojas da empresa; sem nada, nenhuma.
 * `origem` diz de onde vem, para o ecrã o dizer também.
 */
export function zonaEfetiva(c: Cobertura | null | undefined, porOmissao: PorOmissao): { origem: 'escolhida' | 'morada' | 'nenhuma'; cobertura: Cobertura | null } {
  if (zonasDefinidas(c)) return { origem: 'escolhida', cobertura: c! };
  const lista = concelhosPorOmissao(porOmissao);
  if (lista.length > 0) return { origem: 'morada', cobertura: { todoOPais: false, concelhos: lista } };
  return { origem: 'nenhuma', cobertura: null };
}

/** A empresa faz levantamentos neste concelho? Pela zona escolhida ou, sem ela, pela morada e pelas lojas. */
export const cobre = (c: Cobertura | null | undefined, concelho: string, porOmissao?: PorOmissao): boolean => {
  const z = zonaEfetiva(c, porOmissao).cobertura;
  return !!z && (z.todoOPais || z.concelhos.includes(concelho));
};

/** «Viana do Castelo», «Viana do Castelo e Braga», «Viana do Castelo, Braga e Porto». */
const emLista = (xs: readonly string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} e ${xs.at(-1)}`);

/** Os concelhos por omissão em palavras: «Viana do Castelo (morada da empresa)», «… (morada e lojas da empresa)». */
export function descricaoPorOmissao(p: PorOmissao): string {
  const lista = concelhosPorOmissao(p);
  return `${emLista(lista)} (${temLojas(p) ? 'morada e lojas da empresa' : 'morada da empresa'})`;
}

/** «todo o país», «3 concelhos cobertos», «Viana do Castelo (morada da empresa)», «sem concelhos escolhidos». */
export function resumoDaCobertura(c: Cobertura | null | undefined, porOmissao?: PorOmissao): string {
  const z = zonaEfetiva(c, porOmissao);
  if (z.origem === 'nenhuma') return 'sem concelhos escolhidos';
  if (z.origem === 'morada') return descricaoPorOmissao(porOmissao);
  if (z.cobertura!.todoOPais) return 'todo o país';
  const n = z.cobertura!.concelhos.length;
  return `${n} ${n === 1 ? 'concelho coberto' : 'concelhos cobertos'}`;
}

/** O concelho, se for um dos dos CTT (o que se grava em `organizations.concelho`). */
export const concelhoConhecido = (c: string | null | undefined): string | null => (c && TODOS.has(c.trim()) ? c.trim() : null);

/** O texto que acompanha a escolha «Todo o país»: é isto que a empresa confirma ao marcar. */
export const CONFIRMACAO_TODO_O_PAIS = 'A empresa faz levantamentos em qualquer concelho do país, do continente às ilhas.';

/**
 * O que chega do formulário, validado de novo no servidor (regra 10): só concelhos da lista dos CTT, sem
 * repetidos; «Todo o país» ignora a lista. Sem nenhum dos dois, valem os concelhos da morada e das lojas
 * da empresa; sem eles também, é um erro — nunca «todo o país».
 */
export function lerCobertura(
  todoOPais: boolean,
  concelhos: readonly string[],
  porOmissao?: PorOmissao,
): { value: Cobertura } | { erro: string } {
  if (todoOPais) return { value: { todoOPais: true, concelhos: [] } };
  const limpos = [...new Set(concelhos.map((c) => c.trim()).filter(Boolean))];
  const desconhecido = limpos.find((c) => !TODOS.has(c));
  if (desconhecido) return { erro: `Concelho desconhecido: «${desconhecido}».` };
  if (limpos.length === 0) {
    const daMorada = concelhosPorOmissao(porOmissao).map(concelhoConhecido).filter((c): c is string => !!c);
    if (daMorada.length > 0) return { value: { todoOPais: false, concelhos: daMorada } };
    return { erro: 'Escolher pelo menos um concelho, ou marcar «Todo o país». A empresa ainda não tem morada nem lojas com código postal.' };
  }
  return { value: { todoOPais: false, concelhos: limpos } };
}
