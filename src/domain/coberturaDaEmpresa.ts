// Os concelhos onde a empresa faz levantamentos (decisões do promotor, 06/11/2026).
//
// «Ninguém trabalha para o país todo, e se o fizer tem de ser explícito.» E: «quando não indicados, devem
// ficar associados à morada registada da empresa.» Até aqui, uma empresa sem zona gravada, ou com a lista
// vazia, recebia oportunidades de todo o país. Agora:
//
// - A zona escolhida é uma lista de concelhos (pelo menos um) **ou** «Todo o país», marcado de propósito,
//   com a confirmação escrita ao lado. Uma lista vazia nunca quer dizer «todo o país».
// - **Sem zona escolhida, vale o concelho da morada da empresa** (`organizations.concelho`, tirado do
//   código postal). Sem zona e sem morada, não chega nada.
//
// A base faz a mesma conta em `private.supplier_covers` (migrações `cobertura_explicita` e
// `concelho_da_morada_da_empresa`); esta é a versão do lado da aplicação, para os ecrãs e para os convites.

import { DISTRITOS } from '@/lib/concelhos';

export interface Cobertura {
  todoOPais: boolean;
  concelhos: readonly string[];
}

const TODOS = new Set(DISTRITOS.flatMap((d) => d.concelhos));

/** A empresa escolheu a zona: pelo menos um concelho, ou «Todo o país» marcado. */
export const zonasDefinidas = (c: Cobertura | null | undefined): boolean => !!c && (c.todoOPais || c.concelhos.length > 0);

/**
 * A zona que vale: a escolhida; sem ela, o concelho da morada da empresa; sem os dois, nenhuma.
 * `origem` diz de onde vem, para o ecrã o dizer também.
 */
export function zonaEfetiva(
  c: Cobertura | null | undefined,
  concelhoDaEmpresa: string | null | undefined,
): { origem: 'escolhida' | 'morada' | 'nenhuma'; cobertura: Cobertura | null } {
  if (zonasDefinidas(c)) return { origem: 'escolhida', cobertura: c! };
  if (concelhoDaEmpresa) return { origem: 'morada', cobertura: { todoOPais: false, concelhos: [concelhoDaEmpresa] } };
  return { origem: 'nenhuma', cobertura: null };
}

/** A empresa faz levantamentos neste concelho? Pela zona escolhida ou, sem ela, pela morada. */
export const cobre = (c: Cobertura | null | undefined, concelho: string, concelhoDaEmpresa?: string | null): boolean => {
  const z = zonaEfetiva(c, concelhoDaEmpresa).cobertura;
  return !!z && (z.todoOPais || z.concelhos.includes(concelho));
};

/** «todo o país», «3 concelhos cobertos», «Viana do Castelo (morada da empresa)», «sem concelhos escolhidos». */
export function resumoDaCobertura(c: Cobertura | null | undefined, concelhoDaEmpresa?: string | null): string {
  const z = zonaEfetiva(c, concelhoDaEmpresa);
  if (z.origem === 'nenhuma') return 'sem concelhos escolhidos';
  if (z.origem === 'morada') return `${concelhoDaEmpresa} (morada da empresa)`;
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
 * repetidos; «Todo o país» ignora a lista. Sem nenhum dos dois, vale o concelho da morada da empresa; sem
 * ele também, é um erro — nunca «todo o país».
 */
export function lerCobertura(
  todoOPais: boolean,
  concelhos: readonly string[],
  concelhoDaEmpresa?: string | null,
): { value: Cobertura } | { erro: string } {
  if (todoOPais) return { value: { todoOPais: true, concelhos: [] } };
  const limpos = [...new Set(concelhos.map((c) => c.trim()).filter(Boolean))];
  const desconhecido = limpos.find((c) => !TODOS.has(c));
  if (desconhecido) return { erro: `Concelho desconhecido: «${desconhecido}».` };
  if (limpos.length === 0) {
    const daMorada = concelhoConhecido(concelhoDaEmpresa);
    if (daMorada) return { value: { todoOPais: false, concelhos: [daMorada] } };
    return { erro: 'Escolher pelo menos um concelho, ou marcar «Todo o país». A empresa ainda não tem morada com código postal.' };
  }
  return { value: { todoOPais: false, concelhos: limpos } };
}
