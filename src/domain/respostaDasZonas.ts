import {
  SURFACE_KIND_LABELS,
  surfaceArea,
  type AreaCm2,
  type Confirmacao,
  type OrigemDaQuantidade,
  type Participacao,
  type SurfaceInput,
  type SurfaceKind,
  formatArea,
} from './request';

/**
 * O que o passo 2 do pedido diz em cima, antes de tudo: quanto se vai pintar, de onde vem esse
 * número e o que falta para ele estar certo.
 *
 * ## Contas que batem
 *
 * O juiz das duas maquetas (05/11/2026) apanhou duas frases que se contradiziam com o ecrã: «em 2
 * zonas» num pedido com quatro (duas estavam fora do total, e a frase não o dizia), e «Por levantar:
 * nenhuma zona» ao lado de um muro por levantar (estava excluído, e a lista do que falta não sabia).
 * Daí as duas regras desta função:
 *
 * - **a contagem diz de quantas**: «em 2 das 4 zonas» quando há zonas que não contam para o total —
 *   e só contam as que têm número: uma zona por levantar não soma (cético, 05/11/2026);
 * - **só se lista o que falta**, e nunca «nenhuma»: uma zona excluída não falta a ninguém, e uma
 *   lista que diz «nenhuma» ao lado de uma zona por levantar ensina a não ler a lista;
 * - **as frases são de português**: os nomes levam artigo («levantar o tardoz»), e uma lista cujos
 *   itens já têm um «e» separa-se com ponto e vírgula. A gramática vive aqui, testada, e o ecrã só
 *   transforma os nomes em botões (`fraseDoQueFalta`).
 *
 * Os totais saem das linhas, como em `resumoDasZonas` — nada se escreve à mão duas vezes.
 */

export interface ZonaParaResposta {
  id: string;
  kind: SurfaceKind;
  descricao: string | null;
  /** A área total da zona (já multiplicada pela quantidade), em centésimos de m². 0 = por levantar. */
  areaCm2: AreaCm2;
  participacao: Participacao;
  origemDaQuantidade: OrigemDaQuantidade | null;
  confirmacao: Confirmacao;
}

/** Uma coisa que falta, com as zonas a que se refere — para o ecrã fazer de cada nome um botão. */
export interface Falta {
  tipo: 'confirmar' | 'levantar' | 'decidir';
  /**
   * `nome` já na forma do sítio onde vai: com artigo em «levantar o tardoz» e «decidir as varandas»;
   * sem ele dentro dos parênteses de «confirmar 98 m² (empena lado norte)».
   */
  zonas: { id: string; nome: string }[];
  /** Só em «confirmar»: a área que está por confirmar. */
  areaCm2: AreaCm2;
}

export interface RespostaDasZonas {
  /** Só as incluídas. Uma zona por decidir ainda não é obra, e uma excluída não vai ser pintada. */
  totalCm2: AreaCm2;
  /** Parte do total que alguém mediu (confirmada). */
  medidaCm2: AreaCm2;
  /** Parte do total por confirmar: estimativas e documentos. */
  porConfirmarCm2: AreaCm2;
  /** Tudo o que está por confirmar é estimativa (nenhum número veio de um documento). */
  soEstimativas: boolean;
  /** Zonas incluídas, com ou sem número. */
  incluidas: number;
  /** Zonas incluídas com um número: as que somam no total. */
  comNumero: number;
  /** Zonas incluídas ainda sem número: contam para a obra, não para o total. */
  porLevantar: number;
  porDecidir: number;
  excluidas: number;
  /** Zonas no pedido, todas. */
  total: number;
  falta: Falta[];
}

/**
 * O nome de uma zona dentro de uma frase, com o artigo certo. Sem nome, o tipo com o seu artigo
 * («as varandas»). Com nome, o artigo vem da primeira palavra — «a empena lado norte», «o tardoz» —
 * e, quando a palavra não é do ofício e não se sabe o género, «a zona «Cozinha»»: um artigo errado
 * («a tardoz») lia-se pior do que nenhum, e nenhum («levantar tardoz») lia-se como telegrama (cético,
 * 05/11/2026).
 */
const NOME_NA_FRASE: Record<SurfaceKind, string> = {
  fachada: 'a fachada',
  empena: 'a empena',
  varandas: 'as varandas',
  muro: 'o muro',
  escadas_atrio: 'as escadas e o átrio',
  beirais_cobertura: 'os beirais e a cobertura',
  elementos_metalicos: 'as grades e os portões',
  paredes_interiores: 'as paredes interiores',
  tetos: 'os tetos',
  outro: 'a outra superfície',
};

/** O mesmo, sem artigos: para dentro de parênteses («(empena lado norte; escadas e átrio)»). */
const NOME_SEM_ARTIGO: Record<SurfaceKind, string> = {
  fachada: 'fachada',
  empena: 'empena',
  varandas: 'varandas',
  muro: 'muro',
  escadas_atrio: 'escadas e átrio',
  beirais_cobertura: 'beirais e cobertura',
  elementos_metalicos: 'grades e portões',
  paredes_interiores: 'paredes interiores',
  tetos: 'tetos',
  outro: 'outra superfície',
};

/** O artigo das palavras com que um cliente começa a chamar a uma zona. Fora daqui, «a zona «…»». */
const ARTIGO_DA_PALAVRA: Record<string, 'a' | 'o' | 'as' | 'os'> = {
  fachada: 'a',
  fachadas: 'as',
  empena: 'a',
  empenas: 'as',
  tardoz: 'o',
  traseiras: 'as',
  frente: 'a',
  lateral: 'a',
  alçado: 'o',
  muro: 'o',
  muros: 'os',
  varanda: 'a',
  varandas: 'as',
  marquise: 'a',
  marquises: 'as',
  terraço: 'o',
  escadas: 'as',
  escada: 'a',
  átrio: 'o',
  entrada: 'a',
  hall: 'o',
  patamar: 'o',
  patamares: 'os',
  corredor: 'o',
  garagem: 'a',
  cave: 'a',
  cobertura: 'a',
  telhado: 'o',
  beiral: 'o',
  beirais: 'os',
  platibanda: 'a',
  chaminé: 'a',
  grade: 'a',
  grades: 'as',
  gradeamento: 'o',
  portão: 'o',
  portões: 'os',
  caixilharia: 'a',
  parede: 'a',
  paredes: 'as',
  teto: 'o',
  tetos: 'os',
  zona: 'a',
  bloco: 'o',
  logradouro: 'o',
};

const ARTIGO_A_ABRIR = /^(a|o|as|os) /i;
const comMinuscula = (d: string) => d.charAt(0).toLocaleLowerCase('pt-PT') + d.slice(1);

export function nomeNaFrase(z: Pick<ZonaParaResposta, 'kind' | 'descricao'>): string {
  const d = z.descricao?.trim();
  if (!d) return NOME_NA_FRASE[z.kind];
  if (ARTIGO_A_ABRIR.test(d)) return comMinuscula(d);
  const primeira = d.split(/[\s,.;:()]+/)[0]!.toLocaleLowerCase('pt-PT');
  const artigo = ARTIGO_DA_PALAVRA[primeira];
  return artigo ? `${artigo} ${comMinuscula(d)}` : `a zona «${d}»`;
}

/** O nome dentro de parênteses: sem artigo nenhum («empena lado norte», «escadas e átrio»). */
export function nomeSemArtigo(z: Pick<ZonaParaResposta, 'kind' | 'descricao'>): string {
  const d = z.descricao?.trim();
  if (!d) return NOME_SEM_ARTIGO[z.kind];
  return comMinuscula(d.replace(ARTIGO_A_ABRIR, ''));
}

/** O nome de uma zona numa lista ou num cartão: o que o cliente lhe chamou, ou o tipo. */
export const nomeDaZona = (z: Pick<ZonaParaResposta, 'kind' | 'descricao'>): string => z.descricao?.trim() || SURFACE_KIND_LABELS[z.kind];

export function respostaDasZonas(zonas: readonly ZonaParaResposta[]): RespostaDasZonas {
  const incluidas = zonas.filter((z) => z.participacao === 'incluida');
  const comArea = incluidas.filter((z) => z.areaCm2 > 0);
  const porConfirmar = comArea.filter((z) => z.confirmacao === 'por_confirmar');
  const porLevantar = incluidas.filter((z) => z.areaCm2 <= 0);
  const porDecidir = zonas.filter((z) => z.participacao === 'por_decidir');
  const soma = (zs: readonly ZonaParaResposta[]) => zs.reduce((n, z) => n + z.areaCm2, 0);
  const totalCm2 = soma(incluidas);
  const porConfirmarCm2 = soma(porConfirmar);

  const falta: Falta[] = [];
  if (porConfirmar.length > 0) {
    falta.push({
      tipo: 'confirmar',
      areaCm2: porConfirmarCm2,
      zonas: porConfirmar.map((z) => ({ id: z.id, nome: nomeSemArtigo(z) })),
    });
  }
  if (porLevantar.length > 0) {
    falta.push({ tipo: 'levantar', areaCm2: 0, zonas: porLevantar.map((z) => ({ id: z.id, nome: nomeNaFrase(z) })) });
  }
  if (porDecidir.length > 0) {
    falta.push({ tipo: 'decidir', areaCm2: 0, zonas: porDecidir.map((z) => ({ id: z.id, nome: nomeNaFrase(z) })) });
  }

  return {
    totalCm2,
    medidaCm2: totalCm2 - porConfirmarCm2,
    porConfirmarCm2,
    soEstimativas: porConfirmar.every((z) => z.origemDaQuantidade === 'estimativa'),
    incluidas: incluidas.length,
    comNumero: comArea.length,
    porLevantar: porLevantar.length,
    porDecidir: porDecidir.length,
    excluidas: zonas.filter((z) => z.participacao === 'excluida').length,
    total: zonas.length,
    falta,
  };
}

// --- O título do passo ----------------------------------------------------------------------------

export interface TituloDaResposta {
  /** O que se lê primeiro, em grande: a área, ou «Por levantar» quando ainda não há número nenhum. */
  destaque: string;
  /** O destaque é um número (a 34 px, a tinta cheia); senão é texto, a cinzento. */
  numero: boolean;
  /** A frase ao lado: de quantas zonas vem o número. */
  frase: string;
}

const zonas = (n: number) => `${n} ${n === 1 ? 'zona' : 'zonas'}`;

/**
 * O título da resposta, com a contagem que bate com o ecrã (juiz e cético, 05/11/2026):
 *
 * - o número conta **as zonas que somam**: «216 m² a pintar, em 2 das 4 zonas»; uma zona por
 *   levantar não soma, e «118 m² em 3 zonas» com duas sem medida nenhuma dizia que estava tudo medido;
 * - sem número nenhum, o título não inventa um: «Por levantar · 1 zona a pintar, ainda sem medidas»;
 * - sem nada incluído, diz porquê: «0 m² a pintar: 1 zona por decidir», nunca «em 0 das 1 zona».
 */
export function tituloDaResposta(r: RespostaDasZonas): TituloDaResposta {
  if (r.totalCm2 > 0) {
    const frase = r.comNumero === r.total ? `a pintar, em ${zonas(r.total)}` : `a pintar, em ${r.comNumero} das ${r.total} zonas`;
    return { destaque: formatArea(r.totalCm2), numero: true, frase };
  }
  if (r.porLevantar > 0) {
    const quantas = r.porLevantar === r.total ? zonas(r.total) : `${r.porLevantar} das ${r.total} zonas`;
    return { destaque: 'Por levantar', numero: false, frase: `${quantas} a pintar, ainda sem medidas` };
  }
  if (r.total === 0) return { destaque: 'Área por levantar', numero: false, frase: '' };
  if (r.porDecidir > 0) {
    const fora = r.excluidas > 0 ? ` e ${r.excluidas} fora do pedido` : '';
    return { destaque: formatArea(0), numero: true, frase: `a pintar: ${zonas(r.porDecidir)} por decidir${fora}` };
  }
  return {
    destaque: formatArea(0),
    numero: true,
    frase: r.total === 1 ? 'a pintar: a zona está fora do pedido' : `a pintar: as ${r.total} zonas estão fora do pedido`,
  };
}

/** O título numa frase só, para onde não há sítio para o destaque (o pedido com visita marcada). */
export function tituloNumaFrase(r: RespostaDasZonas): string {
  const t = tituloDaResposta(r);
  return t.numero ? `${t.destaque} ${t.frase}` : t.frase;
}

// --- O que falta, como frase ----------------------------------------------------------------------

/** Um pedaço da frase do que falta: texto corrido, ou o nome de uma zona (que o ecrã faz botão). */
export type Pedaco = { tipo: 'texto'; texto: string; numero?: boolean } | { tipo: 'zona'; id: string; texto: string; falta: Falta['tipo'] };

const texto = (t: string, numero = false): Pedaco => ({ tipo: 'texto', texto: t, ...(numero ? { numero } : {}) });

/**
 * Junta itens de uma lista: «a, b e c». Quando um item já leva um «e» por dentro («as escadas e o
 * átrio»), separa-os com ponto e vírgula: «a empena; as escadas e o átrio» — dois «e» seguidos («a
 * empena e as escadas e o átrio») liam-se como três zonas (cético, 05/11/2026).
 */
function juntar(itens: Pedaco[][], temE: (i: Pedaco[]) => boolean): Pedaco[] {
  const composto = itens.length > 1 && itens.some(temE);
  return itens.flatMap((it, i) => {
    if (i === 0) return it;
    const sep = composto ? '; ' : i === itens.length - 1 ? ' e ' : ', ';
    return [texto(sep), ...it];
  });
}

const textoDe = (ps: readonly Pedaco[]) => ps.map((p) => p.texto).join('');
const temEFora = (ps: readonly Pedaco[]) => / e /.test(textoDe(ps).replace(/\([^)]*\)/g, ''));

/**
 * A frase do que falta, em pedaços: «Falta confirmar 98 m² (empena lado norte) e decidir as
 * varandas.» Vazia quando não falta nada — nunca «nenhuma».
 */
export function fraseDoQueFalta(falta: readonly Falta[]): Pedaco[] {
  if (falta.length === 0) return [];
  const nomes = (f: Falta) =>
    juntar(
      f.zonas.map((z) => [{ tipo: 'zona', id: z.id, texto: z.nome, falta: f.tipo }]),
      (i) => / e /.test(textoDe(i)),
    );
  const partes = falta.map((f): Pedaco[] =>
    f.tipo === 'confirmar'
      ? [texto('confirmar '), texto(formatArea(f.areaCm2), true), texto(' ('), ...nomes(f), texto(')')]
      : [texto(f.tipo === 'levantar' ? 'levantar ' : 'decidir '), ...nomes(f)],
  );
  return [texto('Falta '), ...juntar(partes, temEFora), texto('.')];
}

/** A frase toda, em texto: para os testes e para quem não precisa dos botões. */
export const textoDaFrase = textoDe;

// --- A conta de uma zona -----------------------------------------------------------------------

/**
 * A conta de uma zona nos números que o cliente escreveu: «10 × 11,2 − 14», «6 × 1».
 *
 * Vem da proposta A (05/11/2026): a conta ao vivo no editor, para quem escreve três números ver logo
 * o que eles dão. O resultado é **sempre** o de `surfaceArea` — esta função só escreve a conta que
 * `surfaceArea` faz, e o teste confirma que as duas dão o mesmo para todos os casos. Por isso as
 * varandas são «6 × 1 m²» (seis iguais de 1 m² cada) e nunca «× 6, 6 m²».
 *
 * Com `unidades`, é a forma do cartão («12 × 11,5 m − 20 m²»); sem elas, a do editor, que acaba em
 * «= 98 m²». Nula quando não há medidas nenhumas (zona por levantar).
 */
export interface ContaDaZona {
  /** A conta escrita; nula quando é só um número (uma área sem quantidade). */
  expressao: string | null;
  resultadoCm2: AreaCm2;
}

type Medidas = Pick<SurfaceInput, 'areaDireta' | 'larguraCm' | 'alturaCm' | 'vaosCm2' | 'quantidade'>;

const numero = (centesimos: number) => (centesimos / 100).toLocaleString('pt-PT', { maximumFractionDigits: 2 });

export function contaDaZona(m: Medidas, { unidades = false }: { unidades?: boolean } = {}): ContaDaZona | null {
  const resultadoCm2 = surfaceArea({
    ...m,
    kind: 'fachada',
    descricao: null,
    origem: 'estimativa',
    origemQuantidade: null,
    trabalhos: null,
  });
  const q = m.quantidade > 1 ? m.quantidade : 1;
  if (m.areaDireta !== null) {
    const area = `${numero(m.areaDireta)}${unidades ? ' m²' : ''}`;
    // Uma área sozinha não tem conta: o número já está ao lado, no cartão e no editor.
    return { expressao: q > 1 ? `${q} × ${area}` : null, resultadoCm2 };
  }
  if (m.larguraCm === null || m.alturaCm === null) return null;
  const base = `${numero(m.larguraCm)} × ${numero(m.alturaCm)}${unidades ? ' m' : ''}`;
  const vaos = m.vaosCm2 && m.vaosCm2 > 0 ? ` − ${numero(m.vaosCm2)}${unidades ? ' m²' : ''}` : '';
  const uma = `${base}${vaos}`;
  return { expressao: q > 1 ? `${q} × (${uma})` : uma, resultadoCm2 };
}
