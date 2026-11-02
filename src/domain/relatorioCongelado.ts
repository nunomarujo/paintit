import type { Cents } from './money';
import type { TrabalhoNaProposta } from './comparador';

/**
 * O relatório de propostas para a assembleia (secção 8 de "Quem Pinta — a oferta").
 *
 * ## O problema que resolve
 *
 * Quem decide e paga (a assembleia do condomínio) depende de quem imprime e distribui as propostas
 * — normalmente o gestor de condomínio — para ver o quadro completo. Nada impedia, até agora, que
 * esse gestor "esquecesse" de entregar uma proposta à assembleia, ou que imprimisse só as que lhe
 * convinham.
 *
 * ## Fotografia imutável, não um cálculo ao vivo
 *
 * Ao contrário de `src/app/app/pedidos/[id]/propostas/relatorio/page.tsx` (recalculado a cada
 * visita, com síntese e matriz completas — fica para o gestor acompanhar ao vivo), este relatório
 * gera-se **uma só vez**, no momento em que as propostas são entregues (`propostas_entregues`,
 * `src/domain/entrega.ts`), e fica fixo. A ordem das linhas é aleatória **nesse momento** — nunca
 * recalculada depois — para que a proposta que aparece primeiro na lista do gestor não receba mais
 * atenção só por estar em primeiro lugar.
 *
 * As propostas continuam anónimas: nunca o nome da empresa, só o número de 1 a N (docs/MODELO.md,
 * CLAUDE.md regra 6).
 *
 * ## Porque é que o aleatório e os códigos entram por fora
 *
 * Esta função é pura e testável: recebe uma função `aleatorio()` (0 a 1, como `Math.random`) em vez
 * de a chamar ela própria. Quem gera o relatório a sério passa uma fonte criptográfica
 * (`crypto.getRandomValues`, em `src/lib/relatorioCongelado.ts`); os testes passam uma sequência
 * fixa. A mesma disciplina de `src/domain/fileSignature.ts` e de outras funções que precisam de
 * dados do mundo real sem deixar de ser puras.
 */

export interface DocumentoDoPintor {
  /** Aprovado e, se tiver validade, ainda válido à data em que o relatório foi gerado. */
  emDia: boolean;
  /** Validade do documento aprovado, se o tiver (ISO, AAAA-MM-DD). */
  validoAte: string | null;
}

/** Um documento de verificação (alvará, certificado, declaração de não dívida) e o seu estado, visto num instante. */
export function documentoEmDia(doc: { status: string; validoAte: string | null } | undefined, hoje: string): DocumentoDoPintor {
  if (!doc) return { emDia: false, validoAte: null };
  const aprovado = doc.status === 'aprovado';
  const dentroDaValidade = doc.validoAte === null || doc.validoAte >= hoje;
  return { emDia: aprovado && dentroDaValidade, validoAte: doc.validoAte };
}

/**
 * O material mais citado entre os trabalhos da proposta — o "material principal sugerido" da
 * tabela-resumo. Não há um campo próprio para isto nos dados de uma proposta (cada trabalho pode
 * nomear produtos diferentes); por isso conta-se quantas vezes cada nome aparece e fica o mais
 * frequente. Em empate, fica o primeiro encontrado — decisão de desenho, nunca testada pelo
 * promotor; ver ressalva no relatório final.
 */
export function materialPrincipalSugerido(trabalhos: readonly TrabalhoNaProposta[]): string | null {
  const contagem = new Map<string, number>();
  for (const t of trabalhos) {
    for (const produto of t.produtos) {
      const nome = produto.trim();
      if (!nome) continue;
      contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
    }
  }
  let melhor: string | null = null;
  let max = 0;
  for (const [nome, n] of contagem) {
    if (n > max) {
      max = n;
      melhor = nome;
    }
  }
  return melhor;
}

export interface DadosDaPropostaParaRelatorio {
  /** Identificador interno — nunca sai do servidor, serve só de chave para juntar os dados. */
  id: string;
  precoComIvaCents: Cents;
  /**
   * Anos de experiência do pintor. Sem campo próprio em lugar nenhum dos dados actuais (nem na
   * proposta, nem no perfil da entidade) — ver ressalva no relatório final. `null` enquanto essa
   * decisão não for tomada.
   */
  anosExperiencia: number | null;
  garantiaAnos: number | null;
  reputacao: { n: number; media: number | null } | null;
  prazoExecucaoDias: number | null;
  trabalhos: TrabalhoNaProposta[];
  /** Preço de referência (catálogo) do material principal sugerido, quando identificado. */
  precoReferenciaCents: Cents | null;
  alvara: DocumentoDoPintor;
  naoDividaAt: DocumentoDoPintor;
  naoDividaSs: DocumentoDoPintor;
  submetidaEm: string | null;
  validaAte: string | null;
}

export interface LinhaResumoCongelada {
  numero: number;
  precoComIvaCents: Cents;
  anosExperiencia: number | null;
  garantiaAnos: number | null;
  reputacao: { n: number; media: number | null } | null;
  prazoExecucaoDias: number | null;
  materialPrincipal: string | null;
  precoReferenciaCents: Cents | null;
}

export interface FichaCongelada extends LinhaResumoCongelada {
  trabalhos: TrabalhoNaProposta[];
  alvara: DocumentoDoPintor;
  naoDividaAt: DocumentoDoPintor;
  naoDividaSs: DocumentoDoPintor;
  submetidaEm: string | null;
  validaAte: string | null;
  /** Os 5 caracteres finais do código impresso nesta página (`AAAAA-BBBBB`). */
  codigoPagina: string;
}

export interface RelatorioCongelado {
  numeroDePropostas: number;
  /** Os 5 caracteres iniciais do código, iguais em todas as páginas deste relatório. */
  codigoObra: string;
  /** Os ids internos, pela ordem aleatória fixada nesta geração. Nunca se mostra ao utilizador. */
  ordem: string[];
  linhas: LinhaResumoCongelada[];
  fichas: FichaCongelada[];
  avisoDeIntegridade: string;
}

/**
 * O aviso fixo, igual no topo da tabela-resumo e de cada ficha. Tom deliberadamente neutro — não
 * acusa ninguém de má-fé (pode ser só um erro de impressão).
 */
export function avisoDeIntegridade(n: number): string {
  return (
    `Este relatório contém ${n} propostas, numeradas de 1 a ${n}. Se recebeu menos do que ${n} fichas, ` +
    'falta pelo menos uma — confirme através do código QR antes de aprovar qualquer decisão.'
  );
}

/** Sem I, O, 0, 1: fácil de ler e de dizer em voz alta, sem trocar letra com número. */
const ALFABETO_DO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Um código de 5 caracteres, tirado de `aleatorio()` (um valor em [0, 1) por chamada, como `Math.random`). */
export function gerarCodigo(aleatorio: () => number): string {
  let codigo = '';
  for (let i = 0; i < 5; i++) {
    codigo += ALFABETO_DO_CODIGO[Math.floor(aleatorio() * ALFABETO_DO_CODIGO.length)];
  }
  return codigo;
}

/** Fisher–Yates com uma fonte de aleatoriedade injetada: a mesma lista, por uma ordem ao acaso. */
export function embaralhar<T>(itens: readonly T[], aleatorio: () => number): T[] {
  const resultado = [...itens];
  for (let i = resultado.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [resultado[i], resultado[j]] = [resultado[j]!, resultado[i]!];
  }
  return resultado;
}

/**
 * Constrói a fotografia congelada: ordem aleatória fixada, numeração de 1 a N nessa ordem, um
 * código por página e o aviso de integridade com o N certo. Pura — quem chama arranja os dados
 * (incluindo o preço de referência do catálogo, que vem de uma tabela à parte) e a fonte aleatória.
 */
export function construirRelatorioCongelado(
  propostas: readonly DadosDaPropostaParaRelatorio[],
  aleatorio: () => number,
): RelatorioCongelado {
  const n = propostas.length;
  const porId = new Map(propostas.map((p) => [p.id, p] as const));
  const ordem = embaralhar(propostas.map((p) => p.id), aleatorio);
  const codigoObra = gerarCodigo(aleatorio);

  const fichas: FichaCongelada[] = ordem.map((id, i) => {
    const p = porId.get(id)!;
    return {
      numero: i + 1,
      precoComIvaCents: p.precoComIvaCents,
      anosExperiencia: p.anosExperiencia,
      garantiaAnos: p.garantiaAnos,
      reputacao: p.reputacao,
      prazoExecucaoDias: p.prazoExecucaoDias,
      materialPrincipal: materialPrincipalSugerido(p.trabalhos),
      precoReferenciaCents: p.precoReferenciaCents,
      trabalhos: p.trabalhos,
      alvara: p.alvara,
      naoDividaAt: p.naoDividaAt,
      naoDividaSs: p.naoDividaSs,
      submetidaEm: p.submetidaEm,
      validaAte: p.validaAte,
      codigoPagina: gerarCodigo(aleatorio),
    };
  });

  const linhas: LinhaResumoCongelada[] = fichas.map((f) => ({
    numero: f.numero,
    precoComIvaCents: f.precoComIvaCents,
    anosExperiencia: f.anosExperiencia,
    garantiaAnos: f.garantiaAnos,
    reputacao: f.reputacao,
    prazoExecucaoDias: f.prazoExecucaoDias,
    materialPrincipal: f.materialPrincipal,
    precoReferenciaCents: f.precoReferenciaCents,
  }));

  return { numeroDePropostas: n, codigoObra, ordem, linhas, fichas, avisoDeIntegridade: avisoDeIntegridade(n) };
}

/** O que fica guardado por página: o número e o código vêm em colunas próprias, o resto em jsonb. */
export type DadosDaFichaGuardada = Omit<FichaCongelada, 'numero' | 'codigoPagina'>;

/**
 * Junta de volta uma linha guardada (`relatorios_de_propostas_fichas`, ou a mesma forma devolvida
 * por `public.relatorio_publico`) na ficha completa que a página mostra. `numero` e `codigoPagina`
 * não se guardam dentro do jsonb — são colunas próprias — por isso juntam-se aqui outra vez.
 */
export function reconstroiFicha(linha: { numero: number; codigoPagina: string; dados: DadosDaFichaGuardada }): FichaCongelada {
  return { numero: linha.numero, codigoPagina: linha.codigoPagina, ...linha.dados };
}

/** A linha-resumo que corresponde a uma ficha — as mesmas colunas, sem o detalhe por trabalho. */
export function linhaDeFicha(f: FichaCongelada): LinhaResumoCongelada {
  return {
    numero: f.numero,
    precoComIvaCents: f.precoComIvaCents,
    anosExperiencia: f.anosExperiencia,
    garantiaAnos: f.garantiaAnos,
    reputacao: f.reputacao,
    prazoExecucaoDias: f.prazoExecucaoDias,
    materialPrincipal: f.materialPrincipal,
    precoReferenciaCents: f.precoReferenciaCents,
  };
}

/** O endereço público de verificação (QR e link), sempre o mesmo para todas as páginas deste relatório. */
export function enderecoPublico(dominio: string, token: string): string {
  return `https://${dominio}/relatorio-publico/${token}`;
}

/** O código completo impresso numa página: `AAAAA-BBBBB`. */
export function codigoCompleto(codigoObra: string, codigoPagina: string): string {
  return `${codigoObra}-${codigoPagina}`;
}
