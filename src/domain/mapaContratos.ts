import type { Cents } from './money';

/**
 * Mapa de Contratos Públicos: o que dizer ao pintor a partir dos contratos já celebrados.
 *
 * A pergunta a que este ecrã responde não é "que concursos estão abertos" — dois terços das
 * empreitadas de pintura do Estado não têm concurso nenhum. É **quem contrata pintura à minha volta,
 * quanto paga, e quem costuma chamar**. Isso lê-se no passado, não no futuro, e está publicado.
 *
 * Tudo aqui é função pura sobre as linhas já carregadas (`public_contracts`). A classificação do que
 * é pintura está em `contratosPublicos.ts`; o carregamento, em `src/lib/contratosBase.ts`.
 */

/** Uma linha do mapa, como vem da tabela. */
export interface LinhaDoMapa {
  idContrato: string;
  ano: number;
  objecto: string;
  entidadeNif: string | null;
  entidadeNome: string;
  porConvite: boolean;
  precoCents: Cents;
  distrito: string | null;
  concelho: string | null;
  dataCelebracao: string | null;
  adjudicatarioNif: string | null;
  adjudicatarioNome: string | null;
  convidados: { nif: string | null; nome: string }[];
}

export interface EntidadeDoMapa {
  /** O NIF quando existe; senão o nome, que é o que resta para agrupar. */
  chave: string;
  nif: string | null;
  nome: string;
  contratos: number;
  totalCents: Cents;
  /** O valor do meio, que diz mais sobre o que a entidade costuma pagar do que a média. */
  medianaCents: Cents;
  porConvite: number;
  /** Convites em que foi chamada uma empresa só: aí, estar na lista é ganhar a obra. */
  conviteUnico: number;
  /**
   * Convites cuja lista de convidados o portal não publica.
   *
   * Importa mostrar: sem isto, um `conviteUnico` baixo lê-se como "esta entidade abre o convite a
   * várias empresas", quando pode ser apenas que não se sabe quem foram. Em 2026 faltava a lista em
   * 113 dos 326 convites.
   */
  semLista: number;
  /** A data do contrato mais recente, que é o que diz se a entidade ainda está a contratar. */
  ultimo: string | null;
  concelhos: string[];
}

/** Quem é chamado, e com que frequência: para o pintor saber com quem está a competir. */
export interface ConvidadoDoMapa {
  chave: string;
  nif: string | null;
  nome: string;
  /** Vezes que foi convidado. */
  convites: number;
  /** Vezes que ficou com a obra, das que foi convidado. */
  ganhos: number;
}

/** O que o mapa sabe sobre a própria empresa do pintor. */
export interface PresencaDaEmpresa {
  convites: number;
  ganhos: number;
  /** As entidades que já a convidaram, pelo nome. */
  entidades: string[];
}

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const o = [...valores].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 === 1 ? o[m]! : Math.round((o[m - 1]! + o[m]!) / 2);
}

/** A chave de uma empresa ou entidade: o NIF se o houver, senão o nome em minúsculas. */
export function chaveDe(nif: string | null, nome: string): string {
  return nif ?? nome.trim().toLowerCase();
}

/**
 * As entidades que contratam, da que contrata mais para a que contrata menos.
 *
 * Ordena por número de contratos e, em empate, pelo total — não pelo valor só, que punha uma junta de
 * freguesia com uma obra grande à frente de uma câmara que contrata todos os meses. O pintor quer
 * saber a quem vale a pena bater à porta, e isso mede-se na frequência.
 */
export function entidadesDoMapa(linhas: LinhaDoMapa[]): EntidadeDoMapa[] {
  const por = new Map<string, LinhaDoMapa[]>();
  for (const l of linhas) {
    const k = chaveDe(l.entidadeNif, l.entidadeNome);
    const lista = por.get(k);
    if (lista) lista.push(l);
    else por.set(k, [l]);
  }

  const entidades = [...por].map(([chave, cs]) => {
    const convites = cs.filter((c) => c.porConvite);
    const datas = cs.map((c) => c.dataCelebracao).filter((d): d is string => !!d);
    return {
      chave,
      nif: cs[0]!.entidadeNif,
      nome: cs[0]!.entidadeNome,
      contratos: cs.length,
      totalCents: cs.reduce((n, c) => n + c.precoCents, 0),
      medianaCents: mediana(cs.map((c) => c.precoCents)),
      porConvite: convites.length,
      conviteUnico: convites.filter((c) => c.convidados.length === 1).length,
      semLista: convites.filter((c) => c.convidados.length === 0).length,
      ultimo: datas.length > 0 ? datas.sort().at(-1)! : null,
      concelhos: [...new Set(cs.map((c) => c.concelho).filter((c): c is string => !!c))].sort(),
    };
  });

  return entidades.sort((a, b) => b.contratos - a.contratos || b.totalCents - a.totalCents || a.nome.localeCompare(b.nome, 'pt'));
}

/**
 * As empresas mais convidadas, da mais chamada para a menos.
 *
 * Conta convites, não vitórias: é a lista de quem está no radar das entidades. Uma empresa que é
 * convidada dez vezes e ganha duas continua a ser quem o pintor tem de desalojar da lista.
 */
export function convidadosDoMapa(linhas: LinhaDoMapa[]): ConvidadoDoMapa[] {
  const por = new Map<string, ConvidadoDoMapa>();
  for (const l of linhas) {
    for (const c of l.convidados) {
      if (!c.nome.trim() && !c.nif) continue;
      const chave = chaveDe(c.nif, c.nome);
      const actual = por.get(chave) ?? { chave, nif: c.nif, nome: c.nome, convites: 0, ganhos: 0 };
      actual.convites++;
      // O adjudicatário é um dos convidados: compara-se pela mesma chave para não contar duas vezes.
      if (l.adjudicatarioNif || l.adjudicatarioNome) {
        if (chaveDe(l.adjudicatarioNif, l.adjudicatarioNome ?? '') === chave) actual.ganhos++;
      }
      por.set(chave, actual);
    }
  }
  return [...por.values()].sort((a, b) => b.convites - a.convites || b.ganhos - a.ganhos || a.nome.localeCompare(b.nome, 'pt'));
}

/**
 * A própria empresa no mapa, pelo NIF.
 *
 * É o achado que justifica o ecrã para quem já trabalha com o Estado: muitos pintores não sabem que
 * os convites que receberam estão publicados, nem quantos dos que perderam foram para quem já estava
 * na lista. Só pelo NIF — comparar nomes de empresa daria falsos positivos.
 */
export function presencaDaEmpresa(linhas: LinhaDoMapa[], nif: string | null): PresencaDaEmpresa {
  if (!nif) return { convites: 0, ganhos: 0, entidades: [] };
  let convites = 0;
  let ganhos = 0;
  const entidades = new Set<string>();
  for (const l of linhas) {
    if (!l.convidados.some((c) => c.nif === nif)) continue;
    convites++;
    entidades.add(l.entidadeNome);
    if (l.adjudicatarioNif === nif) ganhos++;
  }
  return { convites, ganhos, entidades: [...entidades].sort((a, b) => a.localeCompare(b, 'pt')) };
}

/** O cabeçalho do mapa: o que se diz em números antes de mostrar a lista. */
export function resumoDoMapa(linhas: LinhaDoMapa[]): {
  contratos: number;
  totalCents: Cents;
  entidades: number;
  porConvite: number;
  semLista: number;
  anos: number[];
} {
  const convites = linhas.filter((l) => l.porConvite);
  return {
    contratos: linhas.length,
    totalCents: linhas.reduce((n, l) => n + l.precoCents, 0),
    entidades: new Set(linhas.map((l) => chaveDe(l.entidadeNif, l.entidadeNome))).size,
    porConvite: convites.length,
    semLista: convites.filter((l) => l.convidados.length === 0).length,
    anos: [...new Set(linhas.map((l) => l.ano))].sort((a, b) => a - b),
  };
}
