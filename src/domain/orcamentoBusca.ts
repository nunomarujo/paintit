import { normalizar } from './mapaFiltros';

/**
 * Procurar nos orçamentos da empresa (pedido do promotor, 28/10/2026).
 *
 * «Mesmo que para já esteja vazia, o separador deve contemplar pesquisa por localização, nome do
 * cliente, NIPC ou ano, auxiliando com a pesquisa pela base de dados quando já existente.»
 *
 * Duas decisões vêm daí:
 *
 * 1. **A caixa aparece sempre**, com lista vazia ou não. Um pintor que faz dez orçamentos por mês
 *    tem cento e vinte ao fim do ano; quem só descobre a procura quando já não consegue encontrar
 *    nada aprendeu a desistir antes disso.
 * 2. **As sugestões saem do que já lá está** — as localidades, os clientes e os anos que existem
 *    mesmo nos orçamentos desta empresa. É isso que «auxiliar pela base de dados» quer dizer aqui:
 *    nunca se sugere um termo que não dê resultados, e quem não sabe o que pode escrever vê-o.
 *
 * Tudo isto é memória, não SQL: são os orçamentos de uma empresa, não de todo o país, e a procura
 * tolerante a acentos não se faz bem numa consulta. «Viana» encontra «Viana do Castelo»; «condominio»
 * encontra «Condomínio».
 */

export interface OrcamentoProcuravel {
  numero: number;
  clienteNome: string;
  clienteNif: string | null;
  local: string | null;
  titulo: string | null;
  /** Data de criação, AAAA-MM-DD ou ISO completo. */
  criadoEm: string;
}

export const ano = (iso: string): string => iso.slice(0, 4);

/** Só dígitos: um NIPC escrito «501 964 843» ou «PT501964843» tem de encontrar «501964843». */
const digitos = (s: string) => s.replace(/\D+/g, '');

/**
 * O orçamento responde ao termo escrito?
 *
 * Cada palavra do termo tem de aparecer em alguma parte do orçamento — não todas na mesma parte.
 * Assim «viana condominio» encontra o condomínio de Viana sem obrigar a saber por que ordem as
 * coisas estão guardadas. Um termo que seja só números compara-se também ao NIPC e ao número do
 * orçamento, pelos dígitos: é como as pessoas os escrevem e como os copiam de outro sítio.
 */
export function corresponde(o: OrcamentoProcuravel, termo: string): boolean {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return true;
  const texto = normalizar([o.clienteNome, o.local ?? '', o.titulo ?? '', ano(o.criadoEm)].join(' '));
  const numeros = [digitos(o.clienteNif ?? ''), String(o.numero)].filter(Boolean);
  return palavras.every((p) => {
    if (texto.includes(p)) return true;
    const d = digitos(p);
    return d.length > 0 && numeros.some((n) => n.includes(d));
  });
}

export interface Filtro {
  termo?: string;
  /** Ano de criação, «2026». Vazio ou ausente: todos. */
  ano?: string;
}

export function filtrar<T extends OrcamentoProcuravel>(os: readonly T[], f: Filtro): T[] {
  return os.filter((o) => (!f.ano || ano(o.criadoEm) === f.ano) && corresponde(o, f.termo ?? ''));
}

export interface Sugestoes {
  /** Localidades e nomes de cliente que existem mesmo, para a lista de sugestões da caixa. */
  termos: string[];
  /** Anos com pelo menos um orçamento, do mais recente para o mais antigo. */
  anos: string[];
}

/**
 * O que se pode escrever, tirado do que já existe.
 *
 * Locais e clientes vão à mesma lista porque a caixa é uma só: quem escreve não está a pensar em
 * que campo o que sabe foi guardado. Os NIPC ficam de fora de propósito — ninguém escolhe um NIPC
 * numa lista, escreve-o; e uma lista de números não diz nada a quem a lê.
 */
export function sugestoes(os: readonly OrcamentoProcuravel[]): Sugestoes {
  const termos = new Map<string, string>();
  for (const o of os) {
    for (const v of [o.local, o.clienteNome]) {
      const limpo = v?.trim();
      if (limpo) termos.set(normalizar(limpo), limpo);
    }
  }
  return {
    termos: [...termos.values()].sort((a, b) => a.localeCompare(b, 'pt')),
    anos: [...new Set(os.map((o) => ano(o.criadoEm)))].sort().reverse(),
  };
}

/** O que dizer quando a procura não devolve nada — distinto de não haver nada. */
export function semResultados(f: Filtro): string {
  const partes = [f.termo?.trim() ? `«${f.termo.trim()}»` : '', f.ano ? `em ${f.ano}` : ''].filter(Boolean);
  return partes.length > 0
    ? `Nenhum orçamento encontrado ${partes.join(' ')}.`
    : 'Nenhum orçamento.';
}
