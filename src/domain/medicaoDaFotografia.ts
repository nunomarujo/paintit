import {
  CONFIRMACAO_LABELS,
  ORIGEM_DA_QUANTIDADE_LABELS,
  formatArea,
  type Confirmacao,
  type OrigemDaQuantidade,
  type Participacao,
  type SurfaceKind,
} from './request';

/**
 * A medição de uma fachada pela fotografia, convertida para uma zona do pedido (06/11/2026).
 *
 * Decisão do promotor (05/11/2026): o cliente também mede, na ferramenta de fotografia; a zona fica com a
 * origem «medida pelo cliente» e com a margem de erro da medição, e **nunca confirmada** — confirma-a quem
 * mede no local. A base garante as duas coisas (migração 20261106083508); aqui decide-se o que se grava.
 *
 * Grava-se a área a pintar e a margem. **Nunca a fotografia**, nem a geometria desenhada sobre ela: o pintor
 * lê as zonas de um anúncio aberto, e a fotografia original não lhe pode chegar antes da apresentação
 * (regra 6). A área já desconta os vãos e soma as paredes das marquises, por isso vai como área direta, sem
 * largura nem altura.
 *
 * Unidades (regra 1): a área em centésimos de m² (`area_direta_cm2`, apesar do nome), a margem em
 * pontos-base. A margem arredonda-se **para cima** — nunca se promete menos erro do que o calculado.
 */

/** O que a ferramenta tem no passo 4 de uma fachada, e que interessa ao pedido. */
export interface MedicaoDaFotografia {
  /** Há contorno desenhado (sem ele não há fachada medida). */
  temContorno: boolean;
  /** Área a pintar, em m², como a ferramenta a mostra (`ResultadoFachada.pintavelM2`). */
  pintavelM2: number;
  /** O que ainda falta medir e quem mede pode medir (a saliência das marquises, por exemplo): impede gravar. */
  porMedir: readonly string[];
  /** O que fica de fora à espera de uma decisão da plataforma (as faces de dentro das varandas, 8.2): não
   * impede gravar — a área da fachada está completa sem isso —, mas diz-se ao gravar. */
  porDecidir?: readonly string[];
  /** Margem relativa da área a pintar (0,021 = ± 2,1 %), ou `null` quando a ferramenta não a sabe. */
  margemRelativa: number | null;
}

export type ZonaDaMedicao = { ok: true; areaDiretaCm2: number; margemBps: number } | { ok: false; motivo: string };

/** Acima disto a área deixa de caber numa coluna inteira: não é uma fachada, é um erro. */
const AREA_MAXIMA_CM2 = 100_000_000; // 1 000 000 m²

export function zonaDaMedicao(m: MedicaoDaFotografia): ZonaDaMedicao {
  if (!m.temContorno) return { ok: false, motivo: 'Falta desenhar o contorno da fachada.' };
  if (m.porMedir.length > 0) {
    // Uma área com partes por medir é uma área incompleta: gravada, o pintor contava com ela inteira.
    return { ok: false, motivo: `Falta medir: ${m.porMedir.join('; ')}.` };
  }
  if (!Number.isFinite(m.pintavelM2) || m.pintavelM2 <= 0) return { ok: false, motivo: 'A área a pintar tem de ser maior do que zero.' };
  const areaDiretaCm2 = Math.round(m.pintavelM2 * 100);
  if (areaDiretaCm2 < 1 || areaDiretaCm2 > AREA_MAXIMA_CM2) return { ok: false, motivo: 'A área a pintar não é plausível.' };
  if (m.margemRelativa === null || !Number.isFinite(m.margemRelativa) || m.margemRelativa < 0) {
    // Sem margem, a medição do cliente não se distingue de uma medida verificada — e a decisão é que ela
    // vá sempre com a sua margem. Melhor não gravar do que gravar sem ela.
    return {
      ok: false,
      motivo: 'A ferramenta não conseguiu calcular a margem de erro desta medição: acerte a referência e tente de novo.',
    };
  }
  // Para cima, e nunca zero: uma medição pela fotografia tem sempre alguma margem.
  const margemBps = Math.max(1, Math.ceil(m.margemRelativa * 10_000 - 1e-9));
  if (margemBps > 10_000) return { ok: false, motivo: 'A margem de erro passa dos 100 %: a medição não serve como está.' };
  return { ok: true, areaDiretaCm2, margemBps };
}

/**
 * «± 6,0 %», «± 1,7 %» — como a margem se lê no cartão da zona e no anúncio. Arredonda à décima como a
 * ferramenta mostra no passo 4 (`umaCasa`), para o número gravado e o visto serem o mesmo; os pontos-base
 * guardados já vêm arredondados para cima.
 */
export function margemEmTexto(bps: number): string {
  // Uma casa, e nunca abaixo de 0,1: «± 0,0 %» diria que não há erro nenhum (a mesma regra de `umaCasa`).
  const pct = Math.max(0.1, Math.round(bps / 10) / 10);
  // Espaços inquebráveis: «± 1,7 %» nunca se parte em duas linhas, com o «%» sozinho na de baixo (06/11/2026).
  return `±\u00a0${pct.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}\u00a0%`;
}

/**
 * A origem de uma zona como se lê no cartão, na janela da ferramenta e no anúncio: o rótulo da origem e,
 * numa zona medida pelo cliente, a margem que vai com ela — «Medida pelo cliente ± 1,7 %». A margem nunca
 * se separa do número (decisão de 05/11/2026): sem ela, a medição pela fotografia lia-se como uma medida
 * verificada. Uma zona destas que chegue sem margem (não devia: a base exige-a) diz só a origem.
 */
export function origemEmTexto(origem: OrigemDaQuantidade, margemBps?: number | null): string {
  const rotulo = ORIGEM_DA_QUANTIDADE_LABELS[origem];
  return origem === 'medida_pelo_cliente' && typeof margemBps === 'number' && margemBps > 0 ? `${rotulo} ${margemEmTexto(margemBps)}` : rotulo;
}

/**
 * Pode esta zona receber uma medição da fotografia? Uma zona **confirmada** não: trocar a medida de quem
 * mediu no local por uma tirada da fotografia era perder certeza sem ninguém o decidir. A janela não a
 * oferece, e a ação do servidor volta a perguntar — o pedido e a zona chegam do navegador (regra 10).
 */
export const CONFIRMADA_NAO_SE_TROCA = 'Esta zona já está confirmada no local: a medição da fotografia não substitui a de quem lá mediu.';
export const aceitaMedicaoDaFotografia = (confirmacao: Confirmacao | null | undefined): boolean => confirmacao !== 'confirmada';

/**
 * Os tipos de zona que a ferramenta mede: paredes exteriores planas, fotografadas de frente, com vãos —
 * a fachada, a empena e o muro. As varandas (tetos e guardas), as escadas, os tetos ou os elementos
 * metálicos não se medem assim: a ferramenta desenha o contorno de uma parede. «Para que zona» e o tipo
 * da zona nova ficam por estes.
 */
export const TIPOS_MEDIVEIS_NA_FOTOGRAFIA: readonly SurfaceKind[] = ['fachada', 'empena', 'muro'];
export const NAO_SE_MEDE_NA_FOTOGRAFIA = 'Este tipo de zona não se mede na fotografia: a ferramenta mede fachadas, empenas e muros.';
export const medeSeNaFotografia = (kind: SurfaceKind): boolean => TIPOS_MEDIVEIS_NA_FOTOGRAFIA.includes(kind);

/** Como a zona aparece em «Para que zona»: o que a distingue, depois do nome. */
export function estadoNaFerramenta(z: { confirmacao: Confirmacao; participacao: Participacao; areaCm2: number }): string {
  if (!aceitaMedicaoDaFotografia(z.confirmacao)) return 'confirmada no local';
  const partes: string[] = [];
  if (z.participacao === 'excluida') partes.push('fora do pedido');
  if (z.participacao === 'por_decidir') partes.push('por decidir se entra');
  if (z.areaCm2 <= 0) partes.push('sem medidas');
  return partes.join(', ');
}

/**
 * A frase do rodapé da ferramenta: o que «Usar esta medição» faz, antes de se carregar. Numa zona que já
 * tem número diz que o **substitui** (e por qual), e quando a quantidade passa a 1 diz isso também — a
 * ação grava a área desta fachada uma vez e apaga largura, altura e vãos.
 */
export function fraseDaGravacao(
  medida: { areaDiretaCm2: number; margemBps: number },
  zona: {
    nome: string;
    areaCm2: number;
    quantidade: number;
    origemDaQuantidade: OrigemDaQuantidade | null;
    margemBps?: number | null;
  } | null,
  nomeNovo = '',
): string {
  const nova = `${formatArea(medida.areaDiretaCm2)}, ${origemEmTexto('medida_pelo_cliente', medida.margemBps).toLowerCase()}, por confirmar no local`;
  if (!zona) {
    const nome = nomeNovo.trim();
    return `Grava ${nova}, ${nome ? `numa zona nova, «${nome}»` : 'numa zona nova'}.`;
  }
  if (zona.areaCm2 <= 0) return `Grava ${nova}, em ${zona.nome}.`;
  const antes = `${formatArea(zona.areaCm2)}${zona.origemDaQuantidade ? ` (${origemEmTexto(zona.origemDaQuantidade, zona.margemBps).toLowerCase()})` : ''}`;
  const vezes = zona.quantidade > 1 ? ` A quantidade passa de ${zona.quantidade} para 1: a medição é a desta fachada, uma vez.` : '';
  return `Em ${zona.nome}, substitui ${antes} por ${nova}.${vezes}`;
}

/**
 * O que acompanha a área de cada zona no anúncio, para o pintor: de onde vem e se está confirmada —
 * «Estimativa · por confirmar», «Medida pelo cliente ± 1,7 % · por confirmar», «Medição · confirmada».
 * Todas as zonas levam a origem, e não só a do cliente: uma estimativa sem rótulo parecia ao pintor mais
 * fiável do que a medição com margem (revisão de 06/11/2026). Uma zona antiga sem origem não diz nada.
 */
export function origemParaOPintor(
  origem: OrigemDaQuantidade | null | undefined,
  margemBps: number | null | undefined,
  confirmacao: Confirmacao | null | undefined,
): string | null {
  if (!origem) return null;
  const estado = confirmacao ? ` · ${CONFIRMACAO_LABELS[confirmacao].toLowerCase()}` : '';
  return `${origemEmTexto(origem, margemBps)}${estado}`;
}
