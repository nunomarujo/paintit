import { piorCerteza, type Certeza } from './geometria';
import type { WorkType } from './request';

// Medição do interior da habitação (pedido do promotor, 06/11/2026).
//
// Três modos, à escolha de quem preenche:
// 1. **desenho** — as divisões da obra (sala, quartos, cozinha, WC…) com as cotas escritas: comprimento e
//    largura (ou o perímetro, numa divisão irregular), pé-direito geral ou por divisão, e os vãos.
//    Cotas escritas → `declarada`.
// 2. **planta** — a planta da casa como fundo, com a escala dada por **uma** medida conhecida (dois toques e
//    os metros); cada divisão desenha-se por cima com dois toques. Medido assim → `estimada`, com a margem
//    de erro dita (como na ferramenta das fachadas). **A imagem nunca sai do aparelho** (regra 6: uma planta
//    traz morada, nomes, às vezes assinaturas): guardam-se só os números.
// 3. **manual** — a área de paredes divisão a divisão, ou só o total.
//
// Cálculo: paredes de uma divisão = perímetro × pé-direito − vãos; teto = comprimento × largura (à parte,
// só se se pinta). **Nunca inventar** (`geometria.ts`): o que ninguém deu fica «Por medir»; o pé-direito
// corrente só entra se a pessoa o aceitar, e então é `estimada`.
//
// Nomes das divisões: só da lista geral («Sala», «Quarto 1»…), sem texto livre que identifique pessoas.

export const MODOS_INTERIOR = ['desenho', 'planta', 'manual'] as const;
export type ModoInterior = (typeof MODOS_INTERIOR)[number];
export const MODO_INTERIOR_LABELS: Record<ModoInterior, string> = {
  desenho: 'Indicar as divisões e as medidas',
  planta: 'Desenhar sobre a planta da casa',
  manual: 'Escrever as áreas',
};

export const TIPOS_DE_DIVISAO = [
  'sala',
  'quarto',
  'cozinha',
  'wc',
  'corredor',
  'hall',
  'escritorio',
  'arrumos',
  'marquise',
  'outra',
  // Zonas comuns de um prédio (decisão do promotor, 06/11/2026): usam a mesma ferramenta, paredes e tetos.
  'atrio',
  'patamar',
  'corredor_comum',
  'escadas',
] as const;
/** As divisões das zonas comuns. As restantes são da habitação. */
export const DIVISOES_DAS_ZONAS_COMUNS: readonly string[] = ['atrio', 'patamar', 'corredor_comum', 'escadas'];
export type TipoDeDivisao = (typeof TIPOS_DE_DIVISAO)[number];
export const TIPO_DE_DIVISAO_LABELS: Record<TipoDeDivisao, string> = {
  sala: 'Sala',
  quarto: 'Quarto',
  cozinha: 'Cozinha',
  wc: 'WC',
  corredor: 'Corredor',
  hall: 'Hall de entrada',
  escritorio: 'Escritório',
  arrumos: 'Arrumos',
  marquise: 'Marquise',
  outra: 'Outra divisão',
  atrio: 'Átrio',
  patamar: 'Patamar',
  corredor_comum: 'Corredor comum',
  escadas: 'Escadas',
};
export const isTipoDeDivisao = (v: unknown): v is TipoDeDivisao => typeof v === 'string' && (TIPOS_DE_DIVISAO as readonly string[]).includes(v);

/**
 * Vãos que se descontam sozinhos: só os maiores do que isto (m²). **Decidido pelo promotor a 06/11/2026**:
 * o mesmo das fachadas (`AREA_MINIMA_VAO_M2` em `fachadaMedida.ts`), e quem preenche pode marcar à mão um
 * vão para descontar ou não (`Vao.descontar`). O valor usado guarda-se com cada divisão.
 */
export const VAO_MINIMO_INTERIOR_M2 = 1;

export interface Vao {
  larguraM: number;
  alturaM: number;
  quantidade: number;
  /**
   * Quem decide se este vão se desconta (decisão do promotor, 06/11/2026): `auto` segue a regra dos 1 m²;
   * `sim` e `nao` são a escolha à mão de quem preenche. Sem o campo (gravações antigas), `auto`.
   */
  descontar?: 'auto' | 'sim' | 'nao';
}

/** Este vão desconta-se? A escolha à mão manda; sem ela, só os maiores do que o mínimo. */
export function vaoDesconta(v: Vao, vaoMinimoM2: number = VAO_MINIMO_INTERIOR_M2): boolean {
  if (v.descontar === 'sim') return true;
  if (v.descontar === 'nao') return false;
  return v.larguraM * v.alturaM > vaoMinimoM2;
}

export interface Divisao {
  tipo: TipoDeDivisao;
  /** «Quarto 2»: o número dentro do tipo. */
  numero: number;
  /** Metros. `null` = por medir. */
  comprimentoM: number | null;
  larguraM: number | null;
  /** Divisão irregular: o perímetro direto, em vez de comprimento × largura. */
  perimetroM: number | null;
  /** O desta divisão; `null` = usa o geral. */
  peDireitoM: number | null;
  vaos: Vao[];
  pintarParedes: boolean;
  pintarTeto: boolean;
  /** Modo manual: a área de paredes escrita, em m². */
  areaParedesManualM2: number | null;
  /** Modo manual: a área de teto escrita, em m². */
  areaTetoManualM2: number | null;
}

export interface PeDireitoGeral {
  metros: number | null;
  /** Aceite como o corrente (2,8 m) sem o medir: entra como estimativa. */
  aceiteComoCorrente: boolean;
}

export const nomeDaDivisao = (d: Pick<Divisao, 'tipo' | 'numero'>, repetida: boolean) =>
  repetida || d.numero > 1 ? `${TIPO_DE_DIVISAO_LABELS[d.tipo]} ${d.numero}` : TIPO_DE_DIVISAO_LABELS[d.tipo];

/** O número seguinte para um tipo: o segundo quarto é o «Quarto 2». */
export const proximoNumero = (divisoes: readonly Pick<Divisao, 'tipo' | 'numero'>[], tipo: TipoDeDivisao) =>
  Math.max(0, ...divisoes.filter((d) => d.tipo === tipo).map((d) => d.numero)) + 1;

const positivo = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

export interface AreaCalculada {
  /** m², com duas casas; `null` = por medir. */
  paredesM2: number | null;
  tetoM2: number | null;
  certeza: Certeza;
  /** O que falta para calcular, em palavras. */
  falta: string[];
  /** A área de vãos que se descontou das paredes (m²), para se mostrar o que saiu. */
  vaosDescontadosM2: number;
}

const arred = (n: number) => Math.round(n * 100) / 100;

/**
 * As áreas de uma divisão. `certezaDasCotas` é `declarada` com cotas escritas e `estimada` com a planta à
 * escala. Pé-direito: o da divisão, ou o geral; o corrente só se foi aceite, e então é estimativa.
 */
export function areasDaDivisao(
  d: Divisao,
  geral: PeDireitoGeral,
  modo: ModoInterior,
  o: { vaoMinimoM2?: number; certezaDasCotas?: Certeza } = {},
): AreaCalculada {
  const vaoMinimo = o.vaoMinimoM2 ?? VAO_MINIMO_INTERIOR_M2;
  if (modo === 'manual') {
    return {
      paredesM2: d.pintarParedes && positivo(d.areaParedesManualM2) ? arred(d.areaParedesManualM2) : null,
      tetoM2: d.pintarTeto && positivo(d.areaTetoManualM2) ? arred(d.areaTetoManualM2) : null,
      // As escadas não têm regra de medição: a área escrita à mão é «a olho», e diz-se (promotor, 06/11/2026).
      certeza: d.tipo === 'escadas' ? 'estimada' : 'declarada',
      falta: [
        ...(d.pintarParedes && !positivo(d.areaParedesManualM2) ? ['área das paredes'] : []),
        ...(d.pintarTeto && !positivo(d.areaTetoManualM2) ? ['área do teto'] : []),
      ],
      vaosDescontadosM2: 0,
    };
  }
  // As escadas ficam por medir até haver regra própria (promotor, 06/11/2026): as paredes de uma caixa de
  // escadas não são perímetro × pé-direito, e uma conta errada é pior do que nenhuma.
  if (d.tipo === 'escadas') {
    return {
      paredesM2: null,
      tetoM2: null,
      certeza: 'desconhecida',
      falta: d.pintarParedes || d.pintarTeto ? ['regra de medição das escadas (por definir); em «Escrever as áreas» pode indicar-se uma estimativa'] : [],
      vaosDescontadosM2: 0,
    };
  }
  const cotas = o.certezaDasCotas ?? (modo === 'planta' ? 'estimada' : 'declarada');
  const falta: string[] = [];
  const perimetro = positivo(d.perimetroM) ? d.perimetroM : positivo(d.comprimentoM) && positivo(d.larguraM) ? 2 * (d.comprimentoM + d.larguraM) : null;
  if (perimetro === null) falta.push(positivo(d.comprimentoM) ? 'largura' : 'comprimento e largura');
  const peProprio = positivo(d.peDireitoM);
  const pe = peProprio ? d.peDireitoM! : positivo(geral.metros) ? geral.metros : null;
  if (pe === null) falta.push('pé-direito');
  const certezaPe: Certeza = peProprio ? 'declarada' : geral.aceiteComoCorrente ? 'estimada' : 'declarada';

  let paredes: number | null = null;
  let vaosDescontados = 0;
  if (d.pintarParedes && perimetro !== null && pe !== null) {
    vaosDescontados = arred(
      d.vaos
        .filter((v) => positivo(v.larguraM) && positivo(v.alturaM) && positivo(v.quantidade))
        .reduce((s, v) => s + (vaoDesconta(v, vaoMinimo) ? v.larguraM * v.alturaM * Math.round(v.quantidade) : 0), 0),
    );
    paredes = Math.max(0, arred(perimetro * pe - vaosDescontados));
  }
  const teto = d.pintarTeto && positivo(d.comprimentoM) && positivo(d.larguraM) ? arred(d.comprimentoM * d.larguraM) : null;
  if (d.pintarTeto && teto === null) falta.push(positivo(d.perimetroM) ? 'comprimento e largura (para o teto)' : 'medidas do teto');
  return {
    paredesM2: d.pintarParedes ? paredes : null,
    tetoM2: teto,
    certeza: piorCerteza(cotas, d.pintarParedes ? certezaPe : 'declarada'),
    falta: d.pintarParedes || d.pintarTeto ? falta : [],
    vaosDescontadosM2: vaosDescontados,
  };
}

export interface TotalDoInterior {
  paredesM2: number;
  tetosM2: number;
  /** Divisões a pintar a que ainda falta alguma medida. */
  porMedir: number;
  certeza: Certeza;
}

export function totalDoInterior(divisoes: readonly Divisao[], geral: PeDireitoGeral, modo: ModoInterior, o: { vaoMinimoM2?: number } = {}): TotalDoInterior {
  let paredes = 0;
  let tetos = 0;
  let porMedir = 0;
  const certezas: Certeza[] = [];
  for (const d of divisoes) {
    if (!d.pintarParedes && !d.pintarTeto) continue;
    const a = areasDaDivisao(d, geral, modo, o);
    if (a.falta.length > 0) porMedir++;
    if (a.paredesM2 !== null) paredes += a.paredesM2;
    if (a.tetoM2 !== null) tetos += a.tetoM2;
    certezas.push(a.certeza);
  }
  return { paredesM2: arred(paredes), tetosM2: arred(tetos), porMedir, certeza: certezas.length ? piorCerteza(...certezas) : 'desconhecida' };
}

// --- Planta à escala --------------------------------------------------------------

export interface PontoPx {
  x: number;
  y: number;
}

/** Erro de um toque na imagem, em pixels do ecrã de quem toca. O mesmo valor que se usa nas fachadas. */
export const ERRO_DE_TOQUE_PLANTA_PX = 3;

/** Metros por pixel, a partir de dois toques numa medida conhecida. `null` se a medida não serve. */
export function escalaDaPlanta(a: PontoPx, b: PontoPx, metros: number): number | null {
  const px = Math.hypot(b.x - a.x, b.y - a.y);
  if (!positivo(metros) || px < 20) return null;
  return metros / px;
}

/**
 * As cotas de uma divisão desenhada como retângulo por dois cantos opostos, e a margem relativa do que
 * daí sai: o erro do toque em cada ponta da referência e em cada lado da divisão, somados (pior caso).
 */
export function divisaoDaPlanta(c1: PontoPx, c2: PontoPx, escala: number, referenciaPx: number): { comprimentoM: number; larguraM: number; margem: number } | null {
  const w = Math.abs(c2.x - c1.x);
  const h = Math.abs(c2.y - c1.y);
  if (w < 5 || h < 5 || !positivo(escala) || !positivo(referenciaPx)) return null;
  const e = ERRO_DE_TOQUE_PLANTA_PX;
  const margem = (2 * e) / referenciaPx + (2 * e) / Math.min(w, h);
  const comprimento = Math.max(w, h) * escala;
  const largura = Math.min(w, h) * escala;
  return { comprimentoM: arred(comprimento), larguraM: arred(largura), margem: Math.round(margem * 1000) / 1000 };
}

// --- Quando aparecem os separadores no passo «Medidas e fotografias» ------------------

const EXTERIORES: readonly WorkType[] = ['fachadas', 'muros', 'moradia'];

export interface PassoDasMedidas {
  modo: 'so_zonas' | 'so_interior' | 'separadores';
  /** O nome do separador da lista de zonas. */
  primeiro?: string;
  /** O nome do separador (ou da área) da ferramenta do interior. */
  rotuloInterior?: string;
  /** Que divisões a ferramenta oferece: as da habitação, as das zonas comuns, ou ambas. */
  habitacao: boolean;
  comuns: boolean;
}

/**
 * - interior **e** algum exterior (fachadas, muros, moradia): «Alçados» e «Interior da habitação»;
 * - só interior: sem separadores, só a ferramenta do interior;
 * - zonas comuns (decisão do promotor, 06/11/2026): usam também a ferramenta do interior, para paredes e
 *   tetos, com divisões próprias (átrio, patamar, corredor comum, escadas). A lista de zonas mantém-se no
 *   outro separador, porque as zonas comuns já gravadas vivem lá;
 * - sem interior nem zonas comuns: como sempre (só as zonas).
 */
export function separadoresDoPasso(tipos: readonly WorkType[]): PassoDasMedidas {
  const habitacao = tipos.includes('interior');
  const comuns = tipos.includes('zonas_comuns');
  if (!habitacao && !comuns) return { modo: 'so_zonas', habitacao, comuns };
  const rotuloInterior = habitacao && comuns ? 'Interior e zonas comuns' : habitacao ? 'Interior da habitação' : 'Zonas comuns: paredes e tetos';
  const exterior = tipos.some((t) => EXTERIORES.includes(t));
  if (exterior) return { modo: 'separadores', primeiro: 'Alçados', rotuloInterior, habitacao, comuns };
  if (comuns) return { modo: 'separadores', primeiro: 'Zonas e medidas', rotuloInterior, habitacao, comuns };
  return { modo: 'so_interior', rotuloInterior, habitacao, comuns };
}

/** As divisões a oferecer no «Acrescentar divisão», conforme os tipos de obra do pedido. */
export function divisoesAOferecer(p: Pick<PassoDasMedidas, 'habitacao' | 'comuns'>): TipoDeDivisao[] {
  return TIPOS_DE_DIVISAO.filter((t) => (DIVISOES_DAS_ZONAS_COMUNS.includes(t) ? p.comuns : p.habitacao));
}

// --- Leitura do que o formulário envia ------------------------------------------------

/** «2,75» → 2.75; vazio → null; inválido → NaN. Até 100 m, duas casas. */
export function lerMetros(texto: unknown): number | null {
  const t = String(texto ?? '').trim().replace(',', '.');
  if (!t) return null;
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return Number.NaN;
  const n = Number(t);
  return n > 0 && n <= 100 ? n : Number.NaN;
}

/** O que o contrato e o pintor leem: divisões a pintar, pé-direito e áreas. */
export function declaracaoDoInterior(divisoes: readonly Divisao[], geral: PeDireitoGeral, modo: ModoInterior): string | null {
  const aPintar = divisoes.filter((d) => d.pintarParedes || d.pintarTeto);
  if (aPintar.length === 0) return null;
  const t = totalDoInterior(divisoes, geral, modo);
  const contagem = new Map<string, number>();
  for (const d of divisoes) contagem.set(d.tipo, (contagem.get(d.tipo) ?? 0) + 1);
  const nomes = aPintar.map((d) => nomeDaDivisao(d, (contagem.get(d.tipo) ?? 0) > 1)).join(', ');
  const pe = positivo(geral.metros) ? `pé-direito ${String(geral.metros).replace('.', ',')} m${geral.aceiteComoCorrente ? ' (estimado)' : ''}` : null;
  const m2 = (n: number) => `${n.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} m²`;
  return `Interior da habitação — ${nomes}${pe ? `; ${pe}` : ''}; paredes ${m2(t.paredesM2)}${t.tetosM2 > 0 ? `; tetos ${m2(t.tetosM2)}` : ''}${
    t.porMedir > 0 ? `; ${t.porMedir} ${t.porMedir === 1 ? 'divisão por medir' : 'divisões por medir'}` : ''
  }${t.certeza === 'estimada' ? ' (áreas estimadas)' : ''}.`;
}

// --- O que o ecrã envia, validado no servidor (regra 10) -------------------------------

export interface DivisaoEnviada extends Divisao {
  corReferencia: string | null;
  corHex: string | null;
  /** Só no modo planta: a margem relativa (0,02 = 2 %). */
  margem: number | null;
}

export interface InteriorEnviado {
  modo: ModoInterior;
  geral: PeDireitoGeral;
  divisoes: DivisaoEnviada[];
}

export const MAX_DIVISOES = 40;
export const MAX_VAOS = 20;

const numOuNull = (v: unknown, max: number): number | null | 'erro' => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n * 100) / 100 : 'erro';
};

/** Lê e valida o interior enviado (JSON). Nunca confia em nada: tipos, limites, listas fechadas. */
export function lerInterior(bruto: unknown): { value?: InteriorEnviado; erro?: string } {
  const o = (typeof bruto === 'object' && bruto) as Record<string, unknown> | false;
  if (!o) return { erro: 'Dados inválidos.' };
  const modo = o.modo;
  if (!(MODOS_INTERIOR as readonly unknown[]).includes(modo)) return { erro: 'Escolha como medir.' };
  const pe = numOuNull(o.peDireitoM, 10);
  if (pe === 'erro' || (pe !== null && pe < 1)) return { erro: 'O pé-direito geral tem de estar entre 1 e 10 m.' };
  const lista = Array.isArray(o.divisoes) ? o.divisoes : null;
  if (!lista || lista.length > MAX_DIVISOES) return { erro: `Indique até ${MAX_DIVISOES} divisões.` };
  const vistos = new Set<string>();
  const divisoes: DivisaoEnviada[] = [];
  for (const [i, x] of lista.entries()) {
    const d = (typeof x === 'object' && x) as Record<string, unknown> | false;
    if (!d || !isTipoDeDivisao(d.tipo)) return { erro: `Divisão ${i + 1}: tipo inválido.` };
    const numero = Number(d.numero);
    if (!Number.isInteger(numero) || numero < 1 || numero > 50) return { erro: `Divisão ${i + 1}: número inválido.` };
    const chave = `${d.tipo}.${numero}`;
    if (vistos.has(chave)) return { erro: `Há duas divisões com o mesmo nome (${TIPO_DE_DIVISAO_LABELS[d.tipo]} ${numero}).` };
    vistos.add(chave);
    const c = numOuNull(d.comprimentoM, 100);
    const l = numOuNull(d.larguraM, 100);
    const p = numOuNull(d.perimetroM, 400);
    const pd = numOuNull(d.peDireitoM, 10);
    const ap = numOuNull(d.areaParedesManualM2, 5000);
    const at = numOuNull(d.areaTetoManualM2, 5000);
    if ([c, l, p, pd, ap, at].includes('erro')) return { erro: `${nomeDaDivisao({ tipo: d.tipo, numero }, true)}: há uma medida fora dos limites.` };
    if (typeof pd === 'number' && pd < 1) return { erro: `${nomeDaDivisao({ tipo: d.tipo, numero }, true)}: pé-direito abaixo de 1 m.` };
    const vaosBrutos = Array.isArray(d.vaos) ? d.vaos : [];
    if (vaosBrutos.length > MAX_VAOS) return { erro: `Até ${MAX_VAOS} vãos por divisão.` };
    const vaos: Vao[] = [];
    for (const v of vaosBrutos) {
      const w = (typeof v === 'object' && v) as Record<string, unknown> | false;
      const lv = w ? numOuNull(w.larguraM, 20) : 'erro';
      const av = w ? numOuNull(w.alturaM, 10) : 'erro';
      const q = w ? Number(w.quantidade) : NaN;
      if (typeof lv !== 'number' || typeof av !== 'number' || !Number.isInteger(q) || q < 1 || q > 50) return { erro: 'Um vão tem medidas inválidas.' };
      const descontar = w && (w.descontar === 'sim' || w.descontar === 'nao') ? w.descontar : 'auto';
      vaos.push({ larguraM: lv, alturaM: av, quantidade: q, descontar });
    }
    const cor = typeof d.corReferencia === 'string' ? d.corReferencia.replace(/\s+/g, ' ').trim().slice(0, 120) || null : null;
    const hex = typeof d.corHex === 'string' && /^#[0-9a-f]{6}$/i.test(d.corHex) ? d.corHex.toLowerCase() : null;
    const margem = typeof d.margem === 'number' && Number.isFinite(d.margem) && d.margem >= 0 && d.margem <= 1 ? d.margem : null;
    divisoes.push({
      tipo: d.tipo,
      numero,
      comprimentoM: c as number | null,
      larguraM: l as number | null,
      perimetroM: p as number | null,
      peDireitoM: pd as number | null,
      vaos,
      pintarParedes: d.pintarParedes !== false,
      pintarTeto: d.pintarTeto === true,
      areaParedesManualM2: ap as number | null,
      areaTetoManualM2: at as number | null,
      corReferencia: cor,
      corHex: cor ? hex : null,
      margem: modo === 'planta' ? margem : null,
    });
  }
  return { value: { modo: modo as ModoInterior, geral: { metros: pe, aceiteComoCorrente: o.aceiteComoCorrente === true && pe !== null }, divisoes } };
}

/** Uma divisão como fica gravada (`request_rooms`): áreas em centésimos de m², já calculadas pelo servidor. */
export interface DivisaoGravada {
  tipo: string;
  numero: number;
  pintar_paredes: boolean;
  pintar_teto: boolean;
  area_paredes_cm2: number | null;
  area_teto_cm2: number | null;
  pe_direito_cm: number | null;
  cor_referencia: string | null;
  certeza: string;
}

/**
 * O que o pintor lê no anúncio e o contrato repete, a partir do que ficou gravado: as divisões a pintar,
 * as áreas (paredes e tetos à parte), o que está por medir, e as cores escolhidas com o aviso de que a cor
 * no ecrã é aproximada. `null` sem nada a pintar.
 */
export function declaracaoDasDivisoesGravadas(rows: readonly DivisaoGravada[], avisoDaCor: string): string[] {
  const aPintar = rows.filter((r) => isTipoDeDivisao(r.tipo) && (r.pintar_paredes || r.pintar_teto));
  if (aPintar.length === 0) return [];
  const contagem = new Map<string, number>();
  for (const r of rows) contagem.set(r.tipo, (contagem.get(r.tipo) ?? 0) + 1);
  const nome = (r: DivisaoGravada) => nomeDaDivisao({ tipo: r.tipo as TipoDeDivisao, numero: r.numero }, (contagem.get(r.tipo) ?? 0) > 1);
  const paredes = aPintar.reduce((s, r) => s + (r.pintar_paredes ? (r.area_paredes_cm2 ?? 0) : 0), 0) / 100;
  const tetos = aPintar.reduce((s, r) => s + (r.pintar_teto ? (r.area_teto_cm2 ?? 0) : 0), 0) / 100;
  const porMedir = aPintar.filter((r) => (r.pintar_paredes && r.area_paredes_cm2 === null) || (r.pintar_teto && r.area_teto_cm2 === null)).length;
  const estimada = aPintar.some((r) => r.certeza === 'estimada');
  const fmt = (n: number) => `${n.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} m²`;
  const comuns = aPintar.filter((r) => DIVISOES_DAS_ZONAS_COMUNS.includes(r.tipo)).length;
  const titulo = comuns === 0 ? 'Interior da habitação' : comuns === aPintar.length ? 'Zonas comuns' : 'Interior e zonas comuns';
  const frases = [
    `${titulo} — ${aPintar.map(nome).join(', ')}; paredes ${fmt(paredes)}${tetos > 0 ? `; tetos ${fmt(tetos)}` : ''}${
      porMedir > 0 ? `; ${porMedir} ${porMedir === 1 ? 'divisão por medir' : 'divisões por medir'}` : ''
    }${estimada ? ' (áreas estimadas)' : ''}.`,
  ];
  const cores = aPintar.filter((r) => r.cor_referencia).map((r) => `${nome(r)}: ${r.cor_referencia}`);
  if (cores.length > 0) frases.push(`Cores: ${cores.join('; ')}. ${avisoDaCor}`);
  return frases;
}
