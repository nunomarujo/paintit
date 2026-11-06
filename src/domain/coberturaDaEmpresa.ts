// Os concelhos onde a empresa faz levantamentos (decisão do promotor, 06/11/2026).
//
// «Ninguém trabalha para o país todo, e se o fizer tem de ser explícito.» Até aqui, uma empresa sem zona
// gravada, ou com a lista vazia, recebia oportunidades de todo o país — a mesma convenção das entregas
// de produtos. Para os levantamentos deixa de ser assim:
//
// - **Sem zona escolhida, não chegam oportunidades** (nem convites por WhatsApp, nem reservas).
// - A zona é uma lista de concelhos (pelo menos um) **ou** «Todo o país», marcado de propósito, com a
//   confirmação escrita ao lado. Uma lista vazia nunca quer dizer «todo o país».
//
// A base faz a mesma conta em `private.supplier_covers` (migração `cobertura_explicita`); esta é a versão
// do lado da aplicação, para os ecrãs e para os convites.

import { DISTRITOS } from '@/lib/concelhos';

export interface Cobertura {
  todoOPais: boolean;
  concelhos: readonly string[];
}

const TODOS = new Set(DISTRITOS.flatMap((d) => d.concelhos));

/** A empresa escolheu a zona: pelo menos um concelho, ou «Todo o país» marcado. */
export const zonasDefinidas = (c: Cobertura | null | undefined): boolean => !!c && (c.todoOPais || c.concelhos.length > 0);

/** A empresa faz levantamentos neste concelho? Sem zona escolhida, não. */
export const cobre = (c: Cobertura | null | undefined, concelho: string): boolean =>
  !!c && (c.todoOPais || c.concelhos.includes(concelho));

/** «Todo o país», «3 concelhos», «Sem concelhos escolhidos». */
export function resumoDaCobertura(c: Cobertura | null | undefined): string {
  if (!zonasDefinidas(c)) return 'sem concelhos escolhidos';
  if (c!.todoOPais) return 'todo o país';
  const n = c!.concelhos.length;
  return `${n} ${n === 1 ? 'concelho coberto' : 'concelhos cobertos'}`;
}

/** O texto que acompanha a escolha «Todo o país»: é isto que a empresa confirma ao marcar. */
export const CONFIRMACAO_TODO_O_PAIS = 'A empresa faz levantamentos em qualquer concelho do país, do continente às ilhas.';

/**
 * O que chega do formulário, validado de novo no servidor (regra 10): só concelhos da lista dos CTT, sem
 * repetidos; «Todo o país» ignora a lista. Sem nenhum dos dois, é um erro, não «todo o país».
 */
export function lerCobertura(todoOPais: boolean, concelhos: readonly string[]): { value: Cobertura } | { erro: string } {
  if (todoOPais) return { value: { todoOPais: true, concelhos: [] } };
  const limpos = [...new Set(concelhos.map((c) => c.trim()).filter(Boolean))];
  const desconhecido = limpos.find((c) => !TODOS.has(c));
  if (desconhecido) return { erro: `Concelho desconhecido: «${desconhecido}».` };
  if (limpos.length === 0) return { erro: 'Escolher pelo menos um concelho, ou marcar «Todo o país».' };
  return { value: { todoOPais: false, concelhos: limpos } };
}
