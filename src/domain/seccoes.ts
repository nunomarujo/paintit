import type { Bloqueio } from './request';

/**
 * As secções do pedido, e o estado de cada uma.
 *
 * ## Porquê secções
 *
 * A página era um formulário contínuo com tudo à vista ao mesmo tempo: identificação, tipos de
 * obra, descrição, trabalhos, cor, ocupação da via pública, prazos, zonas, fotografias e a
 * publicação. O promotor mandou parti-la (30/10/2026), e com uma exigência que vale a pena citar:
 * **os separadores têm de trocar o conteúdo visível, não apenas saltar para pontos de uma página
 * interminável.**
 *
 * ## Os três estados, e o que não são
 *
 * Cada secção diz **Por preencher**, **Em preparação** ou **Revisto**. O que estes estados **não**
 * fazem é tratar um campo opcional vazio como uma falha — é instrução expressa, e é a diferença
 * entre uma lista de tarefas e uma lista de acusações. Uma secção só está «por preencher» quando
 * não tem nada; só fica «revisto» quando não falta lá nada **para publicar**. Entre as duas, está
 * em preparação, que é onde a maior parte do trabalho vive e não é defeito nenhum.
 *
 * ## O que decide o estado
 *
 * O mesmo que decide a publicação, e nunca uma regra à parte: os bloqueios têm dono e sabem a que
 * secção pertencem. Uma secção com um bloqueio seu não pode estar revista; uma secção sem
 * bloqueios e com conteúdo está.
 */

export const SECCOES = [
  { id: 'resumo', nome: 'Resumo' },
  { id: 'pretende', nome: 'O que pretende' },
  { id: 'zonas', nome: 'Zonas e medidas' },
  { id: 'fotografias', nome: 'Fotografias' },
  { id: 'preferencias', nome: 'Preferências e prazos' },
  { id: 'publicar', nome: 'Rever e publicar' },
] as const;

export type SeccaoId = (typeof SECCOES)[number]['id'];

export type EstadoDaSeccao = 'por_preencher' | 'em_preparacao' | 'revisto';

export const ESTADO_DA_SECCAO_LABELS: Record<EstadoDaSeccao, string> = {
  por_preencher: 'Por preencher',
  em_preparacao: 'Em preparação',
  revisto: 'Revisto',
};

export interface EntradaDasSeccoes {
  descricao: string;
  trabalhos: readonly string[];
  /** Quantas zonas existem, e quantas estão prontas (incluídas, com quantidade). */
  zonas: { total: number; prontas: number; pendentes: number };
  fotografias: number;
  prazoPropostas: string | null;
  /** Os bloqueios da publicação, tal como `bloqueiosDaPublicacao` os devolve. */
  bloqueios: readonly Bloqueio[];
}

/**
 * A que secção pertence cada coisa que falta. É assim que a revisão consegue pôr um **Completar**
 * ao lado de cada ponto e levar o cliente ao sítio certo, em vez de o deixar à procura.
 */
export function seccaoDoBloqueio(b: Bloqueio): SeccaoId {
  const t = b.texto.toLocaleLowerCase('pt-PT');
  if (t.includes('superfície') || t.includes('zona')) return 'zonas';
  if (t.includes('propostas') || t.includes('dias')) return 'preferencias';
  return 'pretende';
}

export function estadosDasSeccoes(e: EntradaDasSeccoes): Record<SeccaoId, EstadoDaSeccao> {
  const comBloqueio = (s: SeccaoId) => e.bloqueios.some((b) => seccaoDoBloqueio(b) === s);
  const estado = (vazio: boolean, seccao: SeccaoId): EstadoDaSeccao =>
    vazio ? 'por_preencher' : comBloqueio(seccao) ? 'em_preparacao' : 'revisto';

  return {
    // O resumo não se preenche: lê-se.
    resumo: 'revisto',
    pretende: estado(e.descricao.trim() === '' && e.trabalhos.length === 0, 'pretende'),
    zonas: estado(e.zonas.total === 0, 'zonas'),
    // As fotografias são opcionais e nunca têm bloqueio: sem nenhuma ficam por preencher, e isso é
    // um convite, não uma falha. Com alguma, está feito — não há mais nada a exigir-lhes.
    fotografias: e.fotografias === 0 ? 'por_preencher' : 'revisto',
    preferencias: estado(!e.prazoPropostas, 'preferencias'),
    publicar: e.bloqueios.length === 0 ? 'revisto' : 'em_preparacao',
  };
}

/** A secção que o cliente deve abrir a seguir: a primeira com alguma coisa por fazer. */
export function primeiraPendencia(estados: Record<SeccaoId, EstadoDaSeccao>): SeccaoId | null {
  const ordem: SeccaoId[] = ['pretende', 'zonas', 'preferencias', 'fotografias'];
  return ordem.find((s) => estados[s] !== 'revisto') ?? null;
}
