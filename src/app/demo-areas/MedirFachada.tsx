'use client';

import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  aplicar,
  avisoDasHorizontais,
  calibrar,
  camaraDaHomografia,
  DESVIO_MAXIMO_DO_CONTROLO,
  desvioDoControlo,
  medirNoPlano,
  problemaDaReferencia,
  type Calibracao,
  type Matriz3,
  type Ponto,
  type ReferenciaRetangular,
} from '@/domain/homografia';
import {
  AREA_MINIMA_VAO_M2,
  areaDaZona,
  arestasPerto,
  deslocarArestas,
  areasDaFachada,
  contagemSugerida,
  corrigirSaliencias,
  LADO_MINIMO_M,
  TIPO_ZONA_LABELS,
  ENTRE_PISOS_HABITUAL_M,
  leituraDeAlturas,
  verticesDaZona,
  zonaContem,
  zonaDeDoisCantos,
  zonasEmSerie,
  type Aresta,
  type CantoReto,
  type ResultadoFachada,
  type TipoZona,
  type Zona,
} from '@/domain/fachadaMedida';
import { calibracoesMexidas, margemCombinada, margemNasCalibracoes, type MargemDaArea } from '@/domain/margemDaArea';
import { Dica } from '@/components/Dica';
import type { MedicaoDaFotografia } from '@/domain/medicaoDaFotografia';
import {
  concordancia,
  fraseDaInclinacao,
  fraseDasArestas,
  oQueFalta,
  proporArestas,
  type ArestaProposta,
  type ArestasExistentes,
  type Inclinacao,
  type ResultadoDasArestas,
  type RetasDaFotografia,
} from './arestasPropostas';
import { cantoMaisProximo } from './cantos';
import { detetarJanelas, type JanelaDetetada } from './deteccao';
import { Lupa } from './Lupa';
import { Modelo3D } from './Modelo3D';
import type { FaceMedida, Lado } from './modelo3d';
import {
  endireitar,
  enquadrarNoContorno,
  extensaoDoPlano,
  levarZonas,
  mesmaMatriz,
  pixeisPorMetro,
  type Extensao,
  type OrigensDasZonas,
} from './endireitar';
import {
  centroNaCalibracao,
  comoReduzirAMargem,
  contornoNaCalibracao,
  margemRelativa,
  pintavelNaCalibracao,
  textoDaMargem,
  zonasNaCalibracao,
  type ArestasMarcadas,
  type MargemEArea,
} from './margem';

/**
 * Medir uma fachada a partir de uma fotografia (04/11/2026). Quatro passos, um de cada vez:
 *
 * 1. Fotografia.
 * 2. Referência — os quatro cantos de algo retangular que se mediu com fita (uma porta) e, de
 *    preferência, uma aresta vertical comprida do prédio. Com isto, `calibrar` (`homografia.ts`)
 *    fica a saber transformar qualquer ponto da fotografia em metros no plano da fachada.
 * 3. Desenhar — a fotografia aparece endireitada e à escala; primeiro o contorno da fachada (os
 *    outros tipos só abrem depois dele), depois vãos, marquises, varandas, R/C — um a um ou em série
 *    (o primeiro e o último de uma coluna, e quantos são). Cada retângulo já está em metros reais e
 *    acerta-se arrastando a aresta.
 * 4. Áreas e volume — `areasDaFachada` (`fachadaMedida.ts`) dá as áreas; o volume 3D usa a frente e
 *    a altura medidas.
 *
 * Tudo em estado local do browser: nada é gravado, nada sai do aparelho. Quem a abre dentro do pedido
 * (`aoMudarMedicao`, 06/11/2026) recebe só o resultado do passo 4 — a área a pintar, o que falta medir e
 * a margem —, nunca a fotografia nem o desenho: é isso que se grava na zona (`zonaDaMedicao`).
 */

/** Lado maior da imagem de trabalho: fotografias maiores reduzem-se (memória e velocidade). */
const LADO_MAXIMO = 2000;

interface Foto {
  url: string;
  canvas: HTMLCanvasElement;
  pixeis: ImageData;
  largura: number;
  altura: number;
}

async function carregarFoto(file: File): Promise<Foto> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
  const largura = Math.round(img.naturalWidth * escala);
  const altura = Math.round(img.naturalHeight * escala);
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, largura, altura);
  return {
    url,
    canvas,
    pixeis: ctx.getImageData(0, 0, largura, altura),
    largura,
    altura,
  };
}

/** Uma medida de controlo: dois pontos da fotografia e a distância medida à fita, em cm (como se escreve). */
interface Controlo {
  a: Ponto;
  b: Ponto;
  cm: string;
}

/** De onde veio cada zona levada a outra calibração (`levarZonas`): por objeto de zona, para todas as fachadas. */
const ORIGENS_DAS_ZONAS: OrigensDasZonas = new WeakMap();

/** Arestas marcadas na vista endireitada para a acertar (em píxeis da fotografia). */
interface Acertos {
  verticais: [Ponto, Ponto][];
  horizontais: [Ponto, Ponto][];
}
const SEM_ACERTOS: Acertos = { verticais: [], horizontais: [] };

const ORDEM_DOS_CANTOS = ['inferior esquerdo', 'inferior direito', 'superior direito', 'superior esquerdo'];

const COR: Record<TipoZona, { fill: string; stroke: string; bg: string }> = {
  fachada: {
    fill: 'fill-tinta-500/10',
    stroke: 'stroke-tinta-600',
    bg: 'bg-tinta-600',
  },
  vao: {
    fill: 'fill-violet-500/25',
    stroke: 'stroke-violet-600',
    bg: 'bg-violet-600',
  },
  marquise: {
    fill: 'fill-sky-400/30',
    stroke: 'stroke-sky-600',
    bg: 'bg-sky-500',
  },
  varanda: {
    fill: 'fill-emerald-500/25',
    stroke: 'stroke-emerald-700',
    bg: 'bg-emerald-600',
  },
  rc: {
    fill: 'fill-slate-500/25',
    stroke: 'stroke-slate-700',
    bg: 'bg-slate-500',
  },
};
const ORDEM_DOS_TIPOS: TipoZona[] = ['fachada', 'vao', 'marquise', 'varanda', 'rc'];

const NOMES_DE_FACHADA = ['Fachada principal', 'Lateral esquerda', 'Lateral direita', 'Tardoz', 'Outra'] as const;
const LADO_DO_NOME: Partial<Record<string, Lado>> = {
  'Fachada principal': 'frente',
  'Lateral esquerda': 'esquerda',
  'Lateral direita': 'direita',
  Tardoz: 'tras',
};

const m = (n: number) =>
  n.toLocaleString('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const numero = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Uma camada SVG por cima de uma imagem, nas coordenadas dessa imagem. Toque = carregar, arrastar
 * para apontar (com lupa) e largar no ponto certo. Cada toque é seguido pelo seu `pointerId`: um
 * segundo `pointerup` sem `pointerdown` antes não conta, por isso um toque nunca marca dois pontos.
 */
function CamadaDeToque({
  largura,
  altura,
  ativo,
  lupa,
  onToque,
  onCancelar,
  focoLupa,
  onArrastar,
  children,
}: {
  largura: number;
  altura: number;
  ativo: boolean;
  lupa?: CanvasImageSource;
  onToque?: (p: Ponto) => void;
  onCancelar?: () => void;
  /** Onde a lupa aponta, quando não é o dedo: o ponto que vai ficar (íman) ou o que se está a mover. */
  focoLupa?: Ponto | null;
  /** `unidades` = unidades do SVG por píxel de ecrã, para tolerâncias "a um dedo" de distância. */
  onArrastar?: (de: Ponto, ate: Ponto, fim: boolean, unidades: number) => void;
  children?: ReactNode;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const caixaRef = useRef<HTMLDivElement>(null);
  const toque = useRef<{ id: number; de: Ponto } | null>(null);
  const [cursor, setCursor] = useState<{ p: Ponto; css: Ponto } | null>(null);

  const local = (e: { clientX: number; clientY: number }): Ponto | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const l = pt.matrixTransform(ctm.inverse());
    return {
      x: Math.min(largura, Math.max(0, l.x)),
      y: Math.min(altura, Math.max(0, l.y)),
    };
  };
  const unidadesPorPx = () => {
    const a = svgRef.current?.getScreenCTM()?.a;
    return a ? 1 / a : 1;
  };
  const seguir = (e: React.PointerEvent) => {
    const p = local(e);
    const r = caixaRef.current?.getBoundingClientRect();
    if (p && r) setCursor({ p, css: { x: e.clientX - r.left, y: e.clientY - r.top } });
    return p;
  };

  return (
    <div ref={caixaRef} className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${largura} ${altura}`}
        className={`absolute inset-0 h-full w-full ${ativo ? 'cursor-crosshair touch-none select-none' : ''}`}
        onPointerDown={(e) => {
          if (!ativo) return;
          const p = seguir(e);
          if (!p) return;
          // Sem isto, arrastar seleciona texto da página e o arrasto seguinte, se começar sobre a
          // seleção, vira arrastar-e-largar do browser — que cancela o toque sem aviso.
          e.preventDefault();
          toque.current = { id: e.pointerId, de: p };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!ativo) return;
          const p = seguir(e);
          if (p && toque.current && e.pointerId === toque.current.id) onArrastar?.(toque.current.de, p, false, unidadesPorPx());
        }}
        onPointerUp={(e) => {
          const t = toque.current;
          if (!t || t.id !== e.pointerId) return;
          toque.current = null;
          const p = local(e);
          if (!p) return;
          if (onArrastar) onArrastar(t.de, p, true, unidadesPorPx());
          else onToque?.(p);
        }}
        onPointerCancel={() => {
          const t = toque.current;
          toque.current = null;
          setCursor(null);
          // Um gesto cancelado pelo sistema não desenha nada, mas tem de largar o que estava a meio.
          if (t) onCancelar?.();
        }}
        onPointerLeave={() => {
          if (!toque.current) setCursor(null);
        }}
      >
        {children}
      </svg>
      {ativo && lupa && cursor && <Lupa fonte={lupa} ponto={focoLupa ?? cursor.p} cursorCss={cursor.css} />}
    </div>
  );
}

/** Imagem com uma camada de toque exatamente por cima, nunca mais alta do que 70 % do ecrã. */
function Moldura({ children, fundo }: { children: ReactNode; fundo: ReactNode }) {
  return (
    <div className="flex justify-center rounded-lg border border-slate-200 bg-slate-100">
      <div className="relative inline-block max-w-full">
        {fundo}
        <div className="absolute inset-0">{children}</div>
      </div>
    </div>
  );
}

function Passos({ atual }: { atual: number }) {
  const nomes = ['Fotografia', 'Referência', 'Desenhar', 'Áreas e volume'];
  return (
    <ol className="flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
      {nomes.map((n, i) => (
        <li key={n} className={i + 1 === atual ? 'font-semibold text-slate-900' : 'text-slate-500'}>
          {i + 1}. {n}
        </li>
      ))}
    </ol>
  );
}

function Marcador({ p, rotulo, escala, cor = 'fill-slate-900' }: { p: Ponto; rotulo?: string; escala: number; cor?: string }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      <circle cx={p.x} cy={p.y} r={6 * escala} className={`${cor} stroke-white`} strokeWidth={2 * escala} />
      {rotulo && (
        <text
          x={p.x + 9 * escala}
          y={p.y - 9 * escala}
          fontSize={16 * escala}
          className="fill-slate-900 stroke-white"
          strokeWidth={4 * escala}
          paintOrder="stroke"
        >
          {rotulo}
        </text>
      )}
    </g>
  );
}

interface FachadaGuardada {
  id: number;
  nome: string;
  resultado: ResultadoFachada;
  zonas: Zona[];
  /** A saliência das marquises desta fachada (cada fachada tem as suas — revisão de 04/11/2026). */
  salienciaM: number | null;
  /** A saliência das varandas desta fachada. */
  salienciaVarandaM: number | null;
  /** A margem de erro da área a pintar (`margemDaArea`), ± em m²; nula se não se pôde calcular. */
  margemM2: number | null;
}

/** Como se trata a cobertura de um corpo saliente sem telha (promotor, 04/11/2026). */
const IMPERMEABILIZACAO = ['Só pintura', 'Membrana líquida', 'Tela asfáltica', 'Outra, a definir com o pintor'] as const;

export function MedirFachada({
  aoMudarMedicao,
}: {
  /** O resultado do passo 4 da fachada aberta, para quem a grava no pedido; `null` fora do passo 4 ou
   * enquanto a margem se recalcula (um número a meio não se grava). */
  aoMudarMedicao?: (m: MedicaoDaFotografia | null) => void;
} = {}) {
  const [passo, setPasso] = useState(1);
  const [foto, setFoto] = useState<Foto | null>(null);
  const [aCarregar, setACarregar] = useState(false);
  const [confirmaInteira, setConfirmaInteira] = useState(false);

  const [cantos, setCantos] = useState<Ponto[]>([]);
  const [larguraCm, setLarguraCm] = useState('');
  const [alturaCm, setAlturaCm] = useState('');
  const [arestas, setArestas] = useState<[Ponto, Ponto][]>([]);
  const [arestaPendente, setArestaPendente] = useState<Ponto | null>(null);
  const [aMarcarAresta, setAMarcarAresta] = useState(false);
  const [controlos, setControlos] = useState<Controlo[]>([]);
  const [controloPendente, setControloPendente] = useState<Ponto | null>(null);
  const [aMarcarControlo, setAMarcarControlo] = useState(false);

  // As zonas, os acertos do endireitamento e a calibração em que as zonas estão escritas (`base`), com
  // as versões anteriores dos três juntas. As zonas guardam-se em metros; quando a calibração muda — um
  // acerto, um canto da referência movido, uma medida corrigida —, levam-se para a nova através da
  // fotografia (`levarZonas`, sempre a partir de como foram desenhadas) e continuam em cima das mesmas
  // janelas. Antes só os acertos o faziam: corrigir a referência depois de desenhar deixava as zonas
  // com os metros antigos (avaliação do método "Levantamento v7", 04/11/2026: "a fotografia manda").
  type Instantaneo = { zonas: Zona[]; acertos: Acertos; base: Matriz3 | null };
  const [desenho, setDesenho] = useState<Instantaneo & { anteriores: Instantaneo[] }>({
    zonas: [],
    acertos: SEM_ACERTOS,
    base: null,
    anteriores: [],
  });
  const zonas = desenho.zonas;
  const instantaneo = (d: Instantaneo): Instantaneo => ({ zonas: d.zonas, acertos: d.acertos, base: d.base });
  const mudarZonas = (f: (zs: Zona[]) => Zona[]) =>
    setDesenho((d) => ({ ...d, zonas: f(d.zonas), anteriores: [...d.anteriores.slice(-99), instantaneo(d)] }));
  const desfazer = () =>
    setDesenho((d) => {
      const ultimo = d.anteriores[d.anteriores.length - 1];
      return ultimo ? { ...ultimo, anteriores: d.anteriores.slice(0, -1) } : d;
    });
  const limparZonas = () => setDesenho({ zonas: [], acertos: SEM_ACERTOS, base: null, anteriores: [] });

  // O R/C pinta-se por omissão (promotor, 04/11/2026); a saliência das marquises é medida à fita.
  const [incluirRC, setIncluirRC] = useState(true);
  const [saliencia, setSaliencia] = useState('');
  const [vidrosLaterais, setVidrosLaterais] = useState('');
  const [salienciaVaranda, setSalienciaVaranda] = useState('');
  const [impermeabilizacao, setImpermeabilizacao] = useState<string | null>(null);
  const [nome, setNome] = useState<string>(NOMES_DE_FACHADA[0]);
  const [frente, setFrente] = useState('');
  const [fundo, setFundo] = useState('');
  const [guardadas, setGuardadas] = useState<FachadaGuardada[]>([]);

  const referencia: ReferenciaRetangular | null = useMemo(() => {
    const l = numero(larguraCm);
    const a = numero(alturaCm);
    if (cantos.length < 4 || !l || !a) return null;
    return {
      cantos: cantos.slice(0, 4) as ReferenciaRetangular['cantos'],
      larguraM: l / 100,
      alturaM: a / 100,
    };
  }, [cantos, larguraCm, alturaCm]);

  const problema = referencia ? problemaDaReferencia(referencia) : null;
  const calibrarCom = (acertos: Acertos): Calibracao | null => {
    if (!referencia || problemaDaReferencia(referencia)) return null;
    try {
      return calibrar(referencia, [...arestas, ...acertos.verticais], acertos.horizontais);
    } catch {
      return null;
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calibracao: Calibracao | null = useMemo(() => calibrarCom(desenho.acertos), [referencia, arestas, desenho.acertos]);
  // A câmara, tirada da própria fotografia: dá a correção da perspetiva das frentes salientes.
  const camara = useMemo(
    () => (calibracao && foto && referencia ? camaraDaHomografia(calibracao.planoParaImagem, foto.largura, foto.altura, referencia) : null),
    [calibracao, foto, referencia],
  );

  // As medidas de controlo, para o passo 4: o maior desvio, ou o aviso de que a escala depende só da referência.
  const resumoControlo = useMemo(() => {
    const desvios = calibracao
      ? controlos.map((c) => {
          const cm = numero(c.cm);
          return cm ? desvioDoControlo(calibracao, c.a, c.b, cm / 100) : null;
        })
      : [];
    const validos = desvios.filter((d): d is number => d !== null);
    if (validos.length === 0) return { texto: 'Sem medida de controlo: a escala depende só da referência (passo 2).', alerta: false };
    const pior = validos.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a));
    const pct = `${pior >= 0 ? '+' : '−'}${String(Math.abs(Math.round(pior * 1000) / 10)).replace('.', ',')} %`;
    const alerta = Math.abs(pior) > DESVIO_MAXIMO_DO_CONTROLO;
    return {
      texto: `Conferido com ${validos.length === 1 ? '1 medida' : `${validos.length} medidas`} à fita: desvio ${validos.length === 1 ? '' : 'máximo '}${pct}${alerta ? ' — acima de 3 %: rever a referência' : ''}.`,
      alerta,
    };
  }, [controlos, calibracao]);

  // Sempre que a calibração muda, as zonas vão para ela pela fotografia (antes de se desenhar: sem saltos).
  useLayoutEffect(() => {
    if (!calibracao) return;
    setDesenho((d) => {
      if (d.base === calibracao.planoParaImagem) return d;
      if (!d.base || d.zonas.length === 0 || mesmaMatriz(d.base, calibracao.planoParaImagem))
        return { ...d, base: calibracao.planoParaImagem };
      return { ...d, zonas: levarZonas(d.zonas, d.base, calibracao, ORIGENS_DAS_ZONAS), base: calibracao.planoParaImagem };
    });
  }, [calibracao]);

  /**
   * Muda os acertos, num passo de «Desfazer». As zonas seguem pela calibração nova já aqui, no mesmo
   * passo, e não no efeito acima: senão a vista endireitada desenhava-se duas vezes — uma com a
   * calibração nova e as zonas antigas, outra com o enquadramento das zonas levadas (avaliação de
   * 04/11/2026: aceitar três arestas parava o ecrã 1,3 s num telemóvel lento). `marca` é o instantâneo
   * que fica no topo dos anteriores (por omissão, o de agora). Falso se os acertos não derem calibração.
   */
  const mudarAcertos = (novos: Acertos, marca?: Instantaneo): boolean => {
    const nova = calibrarCom(novos);
    if (!nova) return false;
    setDesenho((d) => {
      const levar = !!d.base && d.zonas.length > 0;
      return {
        ...d,
        acertos: novos,
        zonas: levar ? levarZonas(d.zonas, d.base!, nova, ORIGENS_DAS_ZONAS) : d.zonas,
        base: levar ? nova.planoParaImagem : d.base,
        anteriores: [...d.anteriores.slice(-99), marca ?? instantaneo(d)],
      };
    });
    return true;
  };
  const acertar = (a: Ponto, b: Ponto) => {
    if (!calibracao) return;
    const [ia, ib] = [aplicar(calibracao.planoParaImagem, a), aplicar(calibracao.planoParaImagem, b)];
    if (!ia || !ib) return;
    const vertical = Math.abs(b.y - a.y) >= Math.abs(b.x - a.x);
    const { verticais, horizontais } = desenho.acertos;
    mudarAcertos(vertical ? { verticais: [...verticais, [ia, ib]], horizontais } : { verticais, horizontais: [...horizontais, [ia, ib]] });
  };

  const salienciaM = numero(saliencia);
  const salienciaVarandaM = numero(salienciaVaranda);
  // As marquises e os vidros delas, no tamanho verdadeiro (desenhados à frente da parede, na vista
  // endireitada aparecem maiores): é isto que entra nas contas, no 3D e na leitura das alturas.
  const zonasParaContas = useMemo(
    () => corrigirSaliencias(zonas, camara?.centro ?? null, { marquise: salienciaM, varanda: salienciaVarandaM }),
    [zonas, camara, salienciaM, salienciaVarandaM],
  );
  const vidrosLateraisM2 = numero(vidrosLaterais);
  const opcoesDaFachada = useMemo(
    () => ({ incluirRC, salienciaMarquisesM: salienciaM, vidrosLateraisMarquisesM2: vidrosLateraisM2 }),
    [incluirRC, salienciaM, vidrosLateraisM2],
  );
  const resultado = useMemo(() => areasDaFachada(zonasParaContas, opcoesDaFachada), [zonasParaContas, opcoesDaFachada]);

  // A margem de erro da área (`margemDaArea`): a do contorno no passo 3, a do que se pinta no passo 4,
  // pelo mesmo caminho que dá a área do ecrã (`margem.ts`). Três partes guardadas à parte, para que
  // cada mudança só refaça o que lhe toca: as calibrações mexidas (só mudam com os toques da referência
  // e das arestas), as zonas levadas a cada uma e a câmara de cada uma (`zonasNaCalibracao`,
  // `centroNaCalibracao`), e as contas, as únicas que uma saliência, os vidros laterais ou o R/C mudam.
  // Durante um arrasto as zonas não mudam, e nada se refaz. Medido em Node (04/11/2026, este
  // computador), com a referência, uma vertical e duas horizontais: as calibrações, ~3 ms; uma tecla no
  // passo 4, ~8 ms com 18 zonas e ~85–105 ms com 123 (antes, 50 e 270 ms). E a tecla não espera por
  // elas: a margem do passo 4 segue as opções com `useDeferredValue` — escreve-se o número, e a margem
  // refaz-se a seguir, numa renderização que o React larga se vier outra tecla; até lá, aparece esbatida.
  // O que as arestas marcadas fixam (`oQueFalta`): duas verticais compridas e afastadas, e uma horizontal
  // em baixo e outra em cima. É o que a sugestão da margem conta (`comoReduzirAMargem`).
  const arestasMarcadas: ArestasMarcadas = useMemo(() => {
    if (!calibracao || !foto) return { duasVerticais: false, duasHorizontais: false };
    const falta = oQueFalta(
      calibracao,
      zonas.filter((z) => z.tipo === 'fachada'),
      { verticais: [...arestas, ...desenho.acertos.verticais], horizontais: desenho.acertos.horizontais },
      { width: foto.largura, height: foto.altura },
    );
    return { duasVerticais: !falta.vertical, duasHorizontais: !falta.baixo && !falta.cima };
  }, [calibracao, foto, zonas, arestas, desenho.acertos]);
  const margemVisivel = passo === 3 || passo === 4;
  const temContornoDesenhado = zonas.some((z) => z.tipo === 'fachada');
  const mexidas = useMemo(
    () =>
      margemVisivel && referencia && calibracao
        ? calibracoesMexidas(referencia, [...arestas, ...desenho.acertos.verticais], desenho.acertos.horizontais)
        : null,
    [margemVisivel, referencia, calibracao, arestas, desenho.acertos],
  );
  const baseDasZonas = desenho.base ?? calibracao?.planoParaImagem ?? null;
  const contornosEm = useMemo(
    () =>
      baseDasZonas
        ? zonasNaCalibracao(
            zonas.filter((z) => z.tipo === 'fachada'),
            baseDasZonas,
          )
        : null,
    [zonas, baseDasZonas],
  );
  const zonasEm = useMemo(() => (baseDasZonas ? zonasNaCalibracao(zonas, baseDasZonas) : null), [zonas, baseDasZonas]);
  const centroEm = useMemo(() => (foto && referencia ? centroNaCalibracao(foto, referencia) : null), [foto, referencia]);
  const margemDoContorno = useMemo(
    () =>
      passo === 3 && mexidas && contornosEm && temContornoDesenhado
        ? margemNasCalibracoes(mexidas, contornoNaCalibracao(contornosEm))
        : null,
    [passo, mexidas, contornosEm, temContornoDesenhado],
  );
  // As arestas propostas (`proporArestas`): o que já entra na calibração, e a margem do contorno se
  // forem aceites — pelo mesmo caminho que dá a margem do ecrã.
  const arestasExistentes: ArestasExistentes = {
    verticais: [...arestas, ...desenho.acertos.verticais],
    horizontais: desenho.acertos.horizontais,
  };
  const margemComMaisAcertos = (mais: Acertos): MargemDaArea | null => {
    if (!referencia || !baseDasZonas || !temContornoDesenhado) return null;
    const cals = calibracoesMexidas(
      referencia,
      [...arestas, ...desenho.acertos.verticais, ...mais.verticais],
      [...desenho.acertos.horizontais, ...mais.horizontais],
    );
    if (!cals) return null;
    // O contorno como fica depois de aceitar (levado pela fotografia, `levarZonas`, como no ecrã): a área
    // e a margem que a previsão mostra são as que aparecem a seguir.
    const contornos = levarZonas(
      zonas.filter((z) => z.tipo === 'fachada'),
      baseDasZonas,
      cals.base,
      ORIGENS_DAS_ZONAS,
    );
    return margemNasCalibracoes(cals, contornoNaCalibracao(zonasNaCalibracao(contornos, cals.base.planoParaImagem)));
  };
  // A calibração com mais arestas juntas aos acertos: a procura das arestas propõe de uma vez as que
  // fazem a calibração concordar com a fotografia (`proporArestas`, `calibrarCom`).
  const calibrarComMais = (vs: [Ponto, Ponto][], hs: [Ponto, Ponto][]) =>
    calibrarCom({ verticais: [...desenho.acertos.verticais, ...vs], horizontais: [...desenho.acertos.horizontais, ...hs] });
  // Depois de aceitar arestas que mudaram a área do contorno mais do que a margem que ela tinha: o aviso
  // fica enquanto o último passo for esse aceite (`marca` no topo dos anteriores) — o conselho dele,
  // «Desfazer o último passo», só é verdade aí, e os números só valem para esse contorno — e enquanto a
  // referência e a vertical do passo 2 forem as mesmas. Desenhar um vão ou mexer no contorno tira-o;
  // desfazer esse passo devolve-o. Guardam-se todos (um por aceite): com dois aceites seguidos, desfazer o
  // segundo devolvia o estado que o primeiro aviso dava como errado, sem aviso nenhum (avaliação de
  // 05/11/2026); e ir ao passo 2 e voltar sem mudar nada tirava-o.
  const [avisosDoAcerto, setAvisosDoAcerto] = useState<AvisoGuardado[]>([]);
  const topoDosAnteriores = desenho.anteriores[desenho.anteriores.length - 1];
  const avisoDoAcerto =
    avisosDoAcerto.find((a) => a.marca === topoDosAnteriores && a.referencia === referencia && a.arestas === arestas) ?? null;
  const aceitarArestas = (mais: Acertos) => {
    const antes = margemDoContorno;
    const depois = margemComMaisAcertos(mais);
    const novos: Acertos = {
      verticais: [...desenho.acertos.verticais, ...mais.verticais],
      horizontais: [...desenho.acertos.horizontais, ...mais.horizontais],
    };
    const marca = instantaneo(desenho);
    if (!mudarAcertos(novos, marca)) return;
    if (referencia && antes && depois && Math.abs(depois.areaM2 - antes.areaM2) > antes.margemM2)
      setAvisosDoAcerto((as) => [...as.slice(-99), { marca, referencia, arestas, antes, depois }]);
  };

  // O que a última procura viu na fotografia (`RetasDaFotografia`): com ela, o ecrã confere qualquer
  // calibração — depois de aceitar, de traçar à mão, de desfazer — e diz se a vista ainda sai torta, e
  // onde. Na avaliação de 05/11/2026, sem a vertical do passo 2, a primeira procura já sabia que, aceites
  // as quatro arestas, a vista ficava 15 cm torta em 12 m do lado direito, e o ecrã só o dizia se se
  // voltasse a procurar.
  const [retasDaFotografia, setRetasDaFotografia] = useState<{ foto: Foto; retas: RetasDaFotografia } | null>(null);
  const contornosDesenhados = zonas.filter((z) => z.tipo === 'fachada');
  /**
   * Com mais estas arestas, onde a vista ainda sai torta — só se isso mudar a área do contorno mais do que
   * a margem que ela teria (`TortaQueConta`): com a aresta que a fotografia pede ali (a reta que vai ao
   * ponto de fuga dela), a área com e sem. Uma inclinação que não mexe na área não se avisa: a distorção
   * da lente deixa sempre alguma, e não há aresta que a tire.
   */
  const tortaCom = (mais: Acertos): TortaQueConta | null => {
    if (!retasDaFotografia || retasDaFotografia.foto !== foto || !foto || !baseDasZonas || !temContornoDesenhado) return null;
    const nova = mais.verticais.length + mais.horizontais.length > 0 ? calibrarComMais(mais.verticais, mais.horizontais) : calibracao;
    if (!nova) return null;
    const contornos = levarZonas(contornosDesenhados, baseDasZonas, nova, ORIGENS_DAS_ZONAS);
    const c = concordancia(retasDaFotografia.retas, nova, contornos, { width: foto.largura, height: foto.altura });
    if (!c.torta) return null;
    const reta: [Ponto, Ponto] = [c.torta.reta.a, c.torta.reta.b];
    const antes = margemComMaisAcertos(mais);
    const depois = margemComMaisAcertos(
      c.torta.tipo === 'vertical'
        ? { verticais: [...mais.verticais, reta], horizontais: mais.horizontais }
        : { verticais: mais.verticais, horizontais: [...mais.horizontais, reta] },
    );
    if (!antes || !depois || !(Math.abs(depois.areaM2 - antes.areaM2) > antes.margemM2)) return null;
    return { torta: c.torta, antes, depois };
  };

  const opcoesDaMargem = useDeferredValue(opcoesDaFachada);
  const salienciaDaMargem = useDeferredValue(salienciaM);
  const salienciaVarandaDaMargem = useDeferredValue(salienciaVarandaM);
  const margemAtrasada =
    opcoesDaMargem !== opcoesDaFachada || salienciaDaMargem !== salienciaM || salienciaVarandaDaMargem !== salienciaVarandaM;
  const margemAPintar = useMemo(
    () =>
      passo === 4 && mexidas && zonasEm && centroEm && temContornoDesenhado
        ? margemNasCalibracoes(
            mexidas,
            pintavelNaCalibracao({
              zonas: zonasEm,
              centro: centroEm,
              saliencias: { marquise: salienciaDaMargem, varanda: salienciaVarandaDaMargem },
              opcoes: opcoesDaMargem,
            }),
          )
        : null,
    [passo, mexidas, zonasEm, centroEm, temContornoDesenhado, salienciaDaMargem, salienciaVarandaDaMargem, opcoesDaMargem],
  );

  // A medição para o pedido. A margem é a mesma que o ecrã mostra (`margemRelativa` sobre a área à vista).
  useEffect(() => {
    if (!aoMudarMedicao) return;
    if (passo !== 4 || margemAtrasada) {
      aoMudarMedicao(null);
      return;
    }
    aoMudarMedicao({
      temContorno: resultado.temContorno,
      pintavelM2: resultado.pintavelM2,
      porMedir: resultado.porMedir,
      margemRelativa: margemAPintar ? margemRelativa(margemAPintar) : null,
    });
  }, [aoMudarMedicao, passo, margemAtrasada, resultado, margemAPintar]);

  const recomecar = () => {
    setPasso(1);
    setFoto(null);
    setConfirmaInteira(false);
    setCantos([]);
    setLarguraCm('');
    setAlturaCm('');
    setArestas([]);
    setArestaPendente(null);
    setAMarcarAresta(false);
    setControlos([]);
    setControloPendente(null);
    setAMarcarControlo(false);
    limparZonas();
    setIncluirRC(true);
    // A saliência e os vidros laterais são desta fachada: a seguinte mede os seus.
    setSaliencia('');
    setVidrosLaterais('');
    setSalienciaVaranda('');
  };

  return (
    <div className="space-y-4">
      <Passos atual={passo} />

      {passo === 1 && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-[17px] font-semibold text-slate-900">Fotografia da fachada</h2>
          <p className="max-w-[54ch] text-[15px] text-slate-600">
            Uma fotografia de frente, com a fachada inteira. Não fotografe placas, montras, números de porta nem nada que identifique o
            prédio.
          </p>
          <label className="flex min-h-[44px] items-center gap-2 text-[15px] text-slate-700">
            <input type="checkbox" className="h-5 w-5" checked={confirmaInteira} onChange={(e) => setConfirmaInteira(e.target.checked)} />A
            fachada está inteira e sem obstruções
          </label>
          {foto && (
            <div className="flex justify-center rounded-lg border border-slate-200 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.url} alt="Fotografia importada" className="block max-h-[40vh] w-auto max-w-full" />
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <label className="btn-secondary btn-sm cursor-pointer">
              {aCarregar ? 'A carregar…' : foto ? 'Trocar foto' : 'Importar foto'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setACarregar(true);
                  try {
                    const nova = await carregarFoto(f);
                    setFoto(nova);
                    setCantos([]);
                    setArestas([]);
                    setArestaPendente(null);
                    setControlos([]);
                    setControloPendente(null);
                    setAMarcarControlo(false);
                    limparZonas();
                  } finally {
                    setACarregar(false);
                  }
                }}
              />
            </label>
            <button type="button" className="btn-primary btn-sm" disabled={!foto || !confirmaInteira} onClick={() => setPasso(2)}>
              Continuar
            </button>
          </div>
        </section>
      )}

      {passo === 2 && foto && (
        <PassoReferencia
          foto={foto}
          cantos={cantos}
          setCantos={setCantos}
          larguraCm={larguraCm}
          setLarguraCm={setLarguraCm}
          alturaCm={alturaCm}
          setAlturaCm={setAlturaCm}
          arestas={arestas}
          setArestas={setArestas}
          arestaPendente={arestaPendente}
          setArestaPendente={setArestaPendente}
          aMarcarAresta={aMarcarAresta}
          setAMarcarAresta={(v) => {
            setAMarcarAresta(v);
            if (v) setAMarcarControlo(false);
          }}
          controlos={controlos}
          setControlos={setControlos}
          controloPendente={controloPendente}
          setControloPendente={setControloPendente}
          aMarcarControlo={aMarcarControlo}
          setAMarcarControlo={(v) => {
            setAMarcarControlo(v);
            if (v) setAMarcarAresta(false);
          }}
          calibracao={calibracao}
          problema={problema}
          pronta={!!calibracao}
          onVoltar={() => setPasso(1)}
          onContinuar={() => setPasso(3)}
        />
      )}

      {passo === 3 && foto && calibracao && referencia && (
        <PassoDesenhar
          foto={foto}
          calibracao={calibracao}
          referencia={referencia}
          zonas={zonas}
          mudarZonas={mudarZonas}
          podeDesfazer={desenho.anteriores.length > 0}
          desfazer={desfazer}
          acertos={desenho.acertos.verticais.length + desenho.acertos.horizontais.length}
          avisoAcertos={avisoDasHorizontais(desenho.acertos.horizontais)}
          margem={margemDoContorno}
          arestasMarcadas={arestasMarcadas}
          arestasExistentes={arestasExistentes}
          margemComMaisAcertos={margemComMaisAcertos}
          onAceitarArestas={aceitarArestas}
          avisoDoAcerto={avisoDoAcerto}
          calibrarComMais={calibrarComMais}
          tortaCom={tortaCom}
          onRetasDaFotografia={(retas) => setRetasDaFotografia({ foto, retas })}
          onAcertar={acertar}
          onAnularAcertos={() => mudarAcertos(SEM_ACERTOS)}
          onVoltar={() => setPasso(2)}
          onContinuar={() => setPasso(4)}
        />
      )}

      {passo === 4 && (
        <PassoResultado
          controlo={resumoControlo.texto}
          resultado={resultado}
          margem={margemAPintar}
          margemACalcular={margemAtrasada}
          arestasMarcadas={arestasMarcadas}
          zonas={zonasParaContas}
          correcao={
            salienciaM || salienciaVarandaM
              ? camara
                ? {
                    distanciaM: camara.centro.z,
                    oQue:
                      salienciaM && salienciaVarandaM
                        ? 'Marquises, os vidros delas e varandas'
                        : salienciaM
                          ? 'Marquises e os vidros delas'
                          : 'Varandas',
                  }
                : null
              : undefined
          }
          incluirRC={incluirRC}
          setIncluirRC={setIncluirRC}
          saliencia={saliencia}
          setSaliencia={setSaliencia}
          vidrosLaterais={vidrosLaterais}
          setVidrosLaterais={setVidrosLaterais}
          salienciaVaranda={salienciaVaranda}
          setSalienciaVaranda={setSalienciaVaranda}
          conferir={foto && calibracao && referencia ? { foto, calibracao, referencia, zonas } : null}
          impermeabilizacao={impermeabilizacao}
          setImpermeabilizacao={setImpermeabilizacao}
          nome={nome}
          setNome={setNome}
          frente={frente}
          setFrente={setFrente}
          fundo={fundo}
          setFundo={setFundo}
          guardadas={guardadas}
          onVoltar={() => setPasso(3)}
          onOutraFachada={() => {
            const usados = new Set([...guardadas.map((g) => g.nome), nome]);
            // A mesma fachada guardada duas vezes substitui a anterior — nunca soma duas vezes
            // (avaliação do método "Levantamento v7", 04/11/2026). Só "Outra" se pode repetir.
            setGuardadas((gs) => [
              ...gs.filter((g) => g.nome !== nome || nome === 'Outra'),
              {
                id: Date.now(),
                nome,
                resultado,
                zonas: zonasParaContas,
                salienciaM,
                salienciaVarandaM,
                // Guardada logo a seguir a uma tecla, a margem ainda seria a das opções de antes: refaz-se agora.
                margemM2:
                  (margemAtrasada && mexidas && zonasEm && centroEm
                    ? margemNasCalibracoes(
                        mexidas,
                        pintavelNaCalibracao({
                          zonas: zonasEm,
                          centro: centroEm,
                          saliencias: { marquise: salienciaM, varanda: salienciaVarandaM },
                          opcoes: opcoesDaFachada,
                        }),
                      )
                    : margemAPintar
                  )?.margemM2 ?? null,
              },
            ]);
            setNome(NOMES_DE_FACHADA.find((n) => !usados.has(n)) ?? 'Outra');
            recomecar();
          }}
        />
      )}
    </div>
  );
}

const FORMAS: { canto: CantoReto | null; rotulo: string }[] = [
  { canto: null, rotulo: 'Retângulo' },
  { canto: 'sup-esq', rotulo: 'Triângulo com o ângulo reto em cima, à esquerda' },
  { canto: 'sup-dir', rotulo: 'Triângulo com o ângulo reto em cima, à direita' },
  { canto: 'inf-esq', rotulo: 'Triângulo com o ângulo reto em baixo, à esquerda' },
  { canto: 'inf-dir', rotulo: 'Triângulo com o ângulo reto em baixo, à direita' },
];

/** O desenho da forma num quadrado de 16 × 16 (y para baixo), para o botão que a escolhe. */
function IconeForma({ canto }: { canto: CantoReto | null }) {
  const pontos = verticesDaZona({ id: '', tipo: 'fachada', x: 2, y: 2, largura: 12, altura: 12, ...(canto ? { triangulo: canto } : {}) })
    .map((p) => `${p.x},${16 - p.y}`)
    .join(' ');
  return (
    <svg viewBox="0 0 16 16" className="h-5 w-5" aria-hidden>
      <polygon points={pontos} className="fill-current stroke-current" fillOpacity={0.3} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Como se diz cada tipo numa frase, com o género certo ("a primeira marquise", "Quantas são?"), e o
 * que desenhar para cada um — a resposta à pergunta do promotor (04/11/2026) "deve medir só a frente?".
 */
const FRASES: Record<TipoZona, { um: string; primeiro: string; ultimo: string; quantos: string; como: string }> = {
  fachada: {
    um: 'outro contorno (um recuo, um triângulo)',
    primeiro: 'o primeiro contorno',
    ultimo: 'o último contorno',
    quantos: 'Quantos',
    como: 'A parede toda, do chão ao telhado. Por cima de um telhado vizinho inclinado, juntar um triângulo.',
  },
  vao: {
    um: 'um vão',
    primeiro: 'o primeiro vão',
    ultimo: 'o último vão',
    quantos: 'Quantos',
    como: 'Janelas, portas, montras — e também os vidros das marquises. Numa coluna de janelas iguais, «Em série» é mais rápido.',
  },
  marquise: {
    um: 'uma marquise',
    primeiro: 'a primeira marquise',
    ultimo: 'a última marquise',
    quantos: 'Quantas',
    como: 'A frente inteira, tal como se vê — uma coluna de marquises de baixo a cima, de uma vez. Os vidros desenham-se depois, como vãos.',
  },
  varanda: {
    um: 'uma varanda',
    primeiro: 'a primeira varanda',
    ultimo: 'a última varanda',
    quantos: 'Quantas',
    como: 'A coluna de varandas inteira, de baixo a cima, tal como se vê.',
  },
  rc: {
    um: 'o R/C',
    primeiro: 'o primeiro R/C',
    ultimo: 'o último R/C',
    quantos: 'Quantos',
    como: 'De ponta a ponta, do chão à laje do 1.º andar. As montras e a porta desenham-se depois, como vãos.',
  },
};

/** Folga de um toque, em píxeis de ecrã: um dedo mexe-se uns px ao pousar (revisão de 04/11/2026). */
const FOLGA_TOQUE_PX = 10;

/** Quanto de `b` está dentro de `a` (0 a 1), pelas caixas — para não propor uma janela já desenhada. */
function sobreposicaoRelativa(
  a: { x: number; y: number; largura: number; altura: number },
  b: { x: number; y: number; largura: number; altura: number },
) {
  const l = Math.min(a.x + a.largura, b.x + b.largura) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.altura, b.y + b.altura) - Math.max(a.y, b.y);
  return l > 0 && h > 0 ? (l * h) / Math.max(1e-9, b.largura * b.altura) : 0;
}

/** Uma série nunca passa disto — um número escrito por engano (600 em vez de 6) não congela o ecrã. */
const SERIE_MAXIMA = 60;

const novoId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

interface SeriePendente {
  primeira: Zona;
  ultima: Zona | null;
  total: string;
}

function PassoDesenhar({
  foto,
  calibracao,
  referencia,
  zonas,
  mudarZonas,
  podeDesfazer,
  desfazer,
  acertos,
  avisoAcertos,
  margem,
  arestasMarcadas,
  arestasExistentes,
  margemComMaisAcertos,
  onAceitarArestas,
  avisoDoAcerto,
  calibrarComMais,
  tortaCom,
  onRetasDaFotografia,
  onAcertar,
  onAnularAcertos,
  onVoltar,
  onContinuar,
}: {
  foto: Foto;
  calibracao: Calibracao;
  referencia: ReferenciaRetangular;
  zonas: Zona[];
  mudarZonas: (f: (zs: Zona[]) => Zona[]) => void;
  podeDesfazer: boolean;
  desfazer: () => void;
  /** Quantas arestas já se marcaram na vista endireitada para a acertar. */
  acertos: number;
  /** Uma só horizontal pode piorar longe dela (`avisoDasHorizontais`): diz-se ao avaliador. */
  avisoAcertos: string | null;
  /** A margem de erro da área do contorno (`margemDaArea`); nula sem contorno ou quando não se pode calcular. */
  margem: MargemDaArea | null;
  /** As arestas que já entram na calibração: as verticais do passo 2 e dos acertos, e as horizontais dos acertos. */
  arestasMarcadas: ArestasMarcadas;
  /** As mesmas, em píxeis da fotografia: o que `proporArestas` conta como já marcado. */
  arestasExistentes: ArestasExistentes;
  /** A margem do contorno se estas arestas se juntassem aos acertos. */
  margemComMaisAcertos: (mais: Acertos) => MargemDaArea | null;
  /** Junta as arestas aos acertos, num só passo de «Desfazer». */
  onAceitarArestas: (mais: Acertos) => void;
  /** Depois de aceitar arestas que mudaram a área mais do que a margem: o aviso, em âmbar. */
  avisoDoAcerto: AvisoDoAcerto | null;
  /** A calibração com estas arestas juntas às que já entram nela (nula se não der). */
  calibrarComMais: (verticais: [Ponto, Ponto][], horizontais: [Ponto, Ponto][]) => Calibracao | null;
  /** Com mais estas arestas, onde a vista ainda sai torta, se isso mudar a área mais do que a margem (`TortaQueConta`). */
  tortaCom: (mais: Acertos) => TortaQueConta | null;
  /** O que a procura viu na fotografia, para o ecrã conferir as calibrações seguintes. */
  onRetasDaFotografia: (retas: RetasDaFotografia) => void;
  onAcertar: (a: Ponto, b: Ponto) => void;
  onAnularAcertos: () => void;
  onVoltar: () => void;
  onContinuar: () => void;
}) {
  const temContorno = zonas.some((z) => z.tipo === 'fachada');
  const [tipo, setTipo] = useState<TipoZona>(temContorno ? 'vao' : 'fachada');
  const [modo, setModo] = useState<'um' | 'serie'>('um');
  // Retângulo, ou um dos quatro triângulos. Volta a retângulo depois de cada triângulo desenhado:
  // triângulos são a exceção (um empena, a parede por cima do telhado do vizinho).
  const [canto, setCanto] = useState<CantoReto | null>(null);
  // A zona escolhida com um toque: só as arestas dela se arrastam. Sem isto, começar a desenhar
  // encostado a uma zona (um triângulo por cima do contorno, um recuo ao lado) agarrava a aresta dela.
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  // Janelas propostas pela deteção automática (no próprio aparelho), à espera de confirmação: o
  // avaliador tira as que não são e aceita as outras de uma vez (promotor, 04/11/2026: "dispensar
  // identificar onde estão cada janela… poupam-se minutos longos").
  const [propostas, setPropostas] = useState<Zona[] | null>(null);
  const [pedidoDeteccao, setPedidoDeteccao] = useState(0);
  const [serie, setSerie] = useState<SeriePendente | null>(null);
  // Arestas propostas para acertar o endireitamento (`proporArestas`, no próprio aparelho), à espera de
  // confirmação, como as janelas: o avaliador vê-as sobre a fachada, tira as que não assentam numa
  // aresta do prédio e aceita as outras de uma vez.
  const [arestasPropostas, setArestasPropostas] = useState<{
    lista: (ArestaProposta & { id: string })[];
    /** Quantas a procura propôs (as que faltam na lista tirou-as quem mede). */
    encontradas: number;
    faltavam: ResultadoDasArestas['faltavam'];
    desacerto: ResultadoDasArestas['desacerto'];
  } | null>(null);
  const [aProcurarArestas, setAProcurarArestas] = useState(false);
  const [aAceitarArestas, setAAceitarArestas] = useState(false);
  const pendente = !!serie || !!propostas || !!arestasPropostas || aProcurarArestas;
  // A deteção de janelas já respondida: a vista endireitada desmonta-se ao ver a fotografia original e,
  // ao voltar, não a deve refazer (avaliação de 04/11/2026: voltar refazia-a, e as propostas aceites
  // davam lugar a «Não se encontraram janelas claras»).
  const [deteccaoFeita, setDeteccaoFeita] = useState(0);
  const [verOriginal, setVerOriginal] = useState(false);
  // Acertar o endireitamento (promotor, 04/11/2026: "o erro levou a ligeira inclinação do prédio"):
  // arrasta-se ao longo de uma aresta que devia estar direita e o prédio endireita-se por ela.
  const [modoAcerto, setModoAcerto] = useState(false);
  // Retirar o acerto pede confirmação (promotor, 04/11/2026: carregou em «Anular os acertos» a
  // pensar que desfazia a última janela, e o prédio voltou a ficar inclinado).
  const [confirmarRetirar, setConfirmarRetirar] = useState(false);

  // Sem contorno só se desenha contorno (o promotor desenhou 35 zonas sem ele e não conseguia
  // avançar, 04/11/2026): o contorno é a base de todas as contas e do enquadramento da vista.
  const tipoAtivo: TipoZona = temContorno ? tipo : 'fachada';
  const emSerie = modo === 'serie' && tipoAtivo !== 'fachada';
  const frase = FRASES[tipoAtivo];
  const selecionada = zonas.find((z) => z.id === selecionadaId && z.tipo === tipoAtivo) ?? null;

  const escolherTipo = (t: TipoZona) => {
    setTipo(t);
    setSerie(null);
    setSelecionadaId(null);
  };
  const escolherModo = (m: 'um' | 'serie') => {
    setModo(m);
    setSerie(null);
  };

  const proporAsArestas = () => {
    setSelecionadaId(null);
    setModoAcerto(false);
    setAProcurarArestas(true);
    // Primeiro o botão mostra «A procurar…» (`depoisDePintar`): a procura ocupa o telemóvel uns décimos de segundo.
    depoisDePintar(() => {
      try {
        const r = proporArestas(foto.pixeis, calibracao, {
          contornos: zonas.filter((z) => z.tipo === 'fachada'),
          existentes: arestasExistentes,
          calibrarCom: calibrarComMais,
        });
        onRetasDaFotografia(r.fotografia);
        setArestasPropostas({
          lista: r.propostas.map((p, i) => ({ ...p, id: `aresta-${i}` })),
          encontradas: r.propostas.length,
          faltavam: r.faltavam,
          desacerto: r.desacerto,
        });
      } finally {
        setAProcurarArestas(false);
      }
    });
  };
  const acertosPropostos = (lista: ArestaProposta[]): Acertos => ({
    verticais: lista.filter((a) => a.tipo === 'vertical').map((a): [Ponto, Ponto] => [a.a, a.b]),
    horizontais: lista.filter((a) => a.tipo === 'horizontal').map((a): [Ponto, Ponto] => [a.a, a.b]),
  });
  // A margem do contorno com as arestas que ainda estão propostas: muda quando se tira uma, e quando
  // muda o contorno (a margem de agora, `margem`, muda com ele; os acertos não mudam com propostas pendentes).
  const margemProposta = useMemo(
    () => (arestasPropostas && arestasPropostas.lista.length > 0 ? margemComMaisAcertos(acertosPropostos(arestasPropostas.lista)) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [arestasPropostas, margem],
  );
  // Onde a vista ainda sai torta, se isso mexer na área mais do que a margem: com as propostas que ficam
  // (dito ao propor), ou com o que já está aceite (dito depois de aceitar, de traçar à mão, de desfazer).
  const tortaPendente = useMemo(
    () => (arestasPropostas && arestasPropostas.lista.length > 0 ? tortaCom(acertosPropostos(arestasPropostas.lista)) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [arestasPropostas, margem],
  );
  const tortaAgora = useMemo(
    () => (arestasPropostas && arestasPropostas.lista.length > 0 ? null : tortaCom({ verticais: [], horizontais: [] })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [arestasPropostas, margem, calibracao],
  );
  const propostasPendentes = !!propostas || !!arestasPropostas || aProcurarArestas;

  const aoDesenhar = (a: Ponto, b: Ponto) => {
    const z = zonaDeDoisCantos(novoId(), tipoAtivo, a, b, canto ?? undefined);
    // Numa série, a forma fica até ao último; fora dela, volta logo a retângulo.
    if (!emSerie || (serie && !serie.ultima)) setCanto(null);
    if (!emSerie) {
      mudarZonas((zs) => [...zs, z]);
      // Feito o primeiro contorno, o mais comum a seguir são os vãos.
      if (tipoAtivo === 'fachada' && !temContorno) setTipo('vao');
      return;
    }
    if (serie && !serie.ultima) setSerie({ ...serie, ultima: z, total: String(contagemSugerida(serie.primeira, z)) });
    else setSerie({ primeira: z, ultima: null, total: '' });
  };

  const nSerie = serie?.ultima ? numero(serie.total) : null;
  const totalSerie = nSerie ? Math.min(SERIE_MAXIMA, Math.max(2, Math.round(nSerie))) : null;
  const previas: Zona[] = !serie
    ? []
    : serie.ultima && totalSerie
      ? zonasEmSerie(serie.primeira, serie.ultima, totalSerie, (i) => `previa-${i}`)
      : [serie.primeira, ...(serie.ultima ? [serie.ultima] : [])];

  const criarSerie = () => {
    if (!serie?.ultima || !totalSerie) return;
    const novas = zonasEmSerie(serie.primeira, serie.ultima, totalSerie, () => novoId());
    mudarZonas((zs) => [...zs, ...novas]);
    setSerie(null);
  };

  let instrucao: ReactNode;
  let como: ReactNode = frase.como;
  if (arestasPropostas) {
    const f = fraseDasArestas({
      ...arestasPropostas,
      ficam: arestasPropostas.lista.length,
      // A inclinação que fica só se diz se mexer na área mais do que a margem (`tortaCom`).
      desacerto: { ...arestasPropostas.desacerto, torta: tortaAgora?.torta ?? null },
      tortaDepois: tortaPendente?.torta ?? null,
    });
    instrucao = <>{f.titulo}</>;
    como = f.frase;
  } else if (propostas) {
    instrucao =
      propostas.length === 0 ? (
        <>Não se encontraram janelas claras</>
      ) : (
        <>Confirmar {propostas.length === 1 ? 'a janela proposta' : `as ${propostas.length} janelas propostas`}</>
      );
    como =
      propostas.length === 0
        ? 'Desenhar à mão, ou em série (a primeira e a última de uma coluna).'
        : 'Tocar numa proposta para a tirar. As que ficarem passam a vãos; depois acertam-se como as outras, tocando nelas.';
  } else if (modoAcerto) {
    instrucao = <>Arrastar ao longo de uma aresta que devia estar direita</>;
    como =
      'De preferência uma vertical comprida (canto do prédio, aresta de uma coluna de janelas), de uma ponta à outra. Horizontais, só duas a alturas diferentes (a cimalha e a linha das janelas de um piso): uma sozinha pode piorar longe dela.';
  } else if (!temContorno) instrucao = <>Primeiro, o contorno da fachada</>;
  else if (emSerie && !serie) {
    instrucao = <>Desenhar {frase.primeiro} da série</>;
    como = 'Por exemplo, o do piso de baixo. Depois, o último; os do meio ficam feitos.';
  } else if (emSerie && serie && !serie.ultima) {
    instrucao = <>Agora {frase.ultimo} da série</>;
    como = 'O do piso de cima na mesma coluna, ou o da outra ponta da linha.';
  } else if (emSerie) {
    instrucao = <>{frase.quantos} são ao todo?</>;
    como = 'Contando com o primeiro e o último. Depois, «Criar».';
  } else if (selecionada) {
    instrucao = <>Arrastar uma aresta ou um canto para acertar</>;
    como = 'Tocar fora da zona escolhida para a largar.';
  } else instrucao = <>Arrastar para desenhar {frase.um}</>;

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-[17px] font-semibold text-slate-900">
        Desenhar o prédio
        <Dica rotulo="Como desenhar">
          A fotografia já está endireitada e à escala — cada quadrado da grelha é 1 m. Confirmar que as arestas verticais do prédio ficaram
          verticais; se não ficaram, «Propor as arestas» (a ferramenta procura-as na fotografia) ou «Acertar o endireitamento». Marquises e
          varandas desenham-se pela frente, tal como se veem: saem da parede e por isso aparecem maiores, e com a saliência medida (no passo
          4) a ferramenta corrige o tamanho das marquises. Os vidros das marquises e as montras do R/C desenham-se como vãos — é assim que
          se descontam. Janelas repetidas de piso para piso desenham-se depressa em série: o primeiro, o último, e quantos são.
        </Dica>
      </h2>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo da zona a desenhar">
        {ORDEM_DOS_TIPOS.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={tipoAtivo === t}
            disabled={(t !== 'fachada' && !temContorno) || propostasPendentes}
            className={tipoAtivo === t ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
            onClick={() => escolherTipo(t)}
          >
            <span className={`mr-2 inline-block h-3 w-3 rounded-full ${COR[t].bg}`} />
            {TIPO_ZONA_LABELS[t]}
          </button>
        ))}
      </div>

      {tipoAtivo !== 'fachada' && (
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Como desenhar">
          <button
            type="button"
            role="radio"
            aria-checked={modo === 'um'}
            className={modo === 'um' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
            onClick={() => escolherModo('um')}
          >
            Um a um
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={modo === 'serie'}
            className={modo === 'serie' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
            onClick={() => escolherModo('serie')}
          >
            Em série
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Forma">
        <span className="text-[15px] text-slate-600">Forma</span>
        {FORMAS.map((f) => (
          <button
            key={f.canto ?? 'retangulo'}
            type="button"
            role="radio"
            aria-checked={canto === f.canto}
            aria-label={f.rotulo}
            title={f.rotulo}
            className={canto === f.canto ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
            onClick={() => setCanto(f.canto)}
          >
            <IconeForma canto={f.canto} />
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 p-4" aria-live="polite">
        <p className="text-[13px] font-medium text-slate-500">Agora</p>
        <p className="text-[20px] font-semibold leading-snug text-slate-900">{instrucao}</p>
        <p className="mt-1 max-w-[60ch] text-[15px] text-slate-600">{como}</p>
        {arestasPropostas && arestasPropostas.lista.length > 0 && <PrevisaoDasArestas antes={margem} depois={margemProposta} />}
        {avisoDoAcerto && !arestasPropostas && <TextoDoAvisoDoAcerto aviso={avisoDoAcerto} />}
        {arestasPropostas && arestasPropostas.lista.length > 0 && tortaPendente && <TextoDaTortaNaArea t={tortaPendente} />}
        {arestasPropostas && arestasPropostas.lista.length === 0 && tortaAgora && <TextoDaTortaNaArea t={tortaAgora} />}
        {!arestasPropostas && tortaAgora && (
          <>
            <p className="mt-1 max-w-[60ch] text-[15px] font-medium text-amber-800">{fraseDaInclinacao(tortaAgora.torta)}</p>
            <TextoDaTortaNaArea t={tortaAgora} />
          </>
        )}
        {avisoAcertos && !modoAcerto && <p className="mt-1 text-[15px] font-medium text-amber-800">{avisoAcertos}</p>}
        {temContorno && !selecionada && !emSerie && !arestasPropostas && (
          <p className="mt-1 text-[13px] text-slate-500">
            Enganou-se? «Desfazer o último passo» volta um passo atrás; para acertar uma zona já desenhada, tocar nela.
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {propostas && propostas.length > 0 && (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => {
                const novas = propostas.map((z) => ({ ...z, id: novoId() }));
                mudarZonas((zs) => [...zs, ...novas]);
                setPropostas(null);
              }}
            >
              {propostas.length === 1 ? 'Aceitar a janela' : `Aceitar as ${propostas.length}`}
            </button>
          )}
          {propostas && (
            <button type="button" className="btn-quiet btn-sm" onClick={() => setPropostas(null)}>
              {propostas.length === 0 ? 'Fechar' : 'Descartar'}
            </button>
          )}
          {arestasPropostas && arestasPropostas.lista.length > 0 && (
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={aAceitarArestas}
              onClick={() => {
                const lista = arestasPropostas.lista;
                setAAceitarArestas(true);
                // Primeiro o botão mostra «A aplicar…»: a vista endireitada refaz-se com a calibração
                // nova, e isso ocupa o telemóvel uns décimos de segundo (0,6 a 0,8 s com o CPU 4× mais lento).
                depoisDePintar(() => {
                  try {
                    onAceitarArestas(acertosPropostos(lista));
                    setArestasPropostas(null);
                  } finally {
                    setAAceitarArestas(false);
                  }
                });
              }}
            >
              {aAceitarArestas
                ? 'A aplicar…'
                : arestasPropostas.lista.length === 1
                  ? 'Aceitar a aresta'
                  : `Aceitar as ${arestasPropostas.lista.length}`}
            </button>
          )}
          {arestasPropostas && (
            <button type="button" className="btn-quiet btn-sm" disabled={aAceitarArestas} onClick={() => setArestasPropostas(null)}>
              {arestasPropostas.lista.length === 0 ? 'Fechar' : 'Descartar'}
            </button>
          )}
          {temContorno && !propostas && !arestasPropostas && !aProcurarArestas && !serie && !modoAcerto && (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                setSelecionadaId(null);
                setPedidoDeteccao((n) => n + 1);
              }}
            >
              Detetar as janelas
            </button>
          )}
          <button
            type="button"
            className="btn-quiet btn-sm"
            disabled={(!podeDesfazer && !serie) || !!propostas || !!arestasPropostas || aProcurarArestas}
            onClick={() => (serie ? setSerie(null) : desfazer())}
          >
            Desfazer o último passo
          </button>
          <button
            type="button"
            className={modoAcerto ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
            disabled={pendente}
            onClick={() => {
              setModoAcerto((v) => !v);
              setSelecionadaId(null);
            }}
          >
            {modoAcerto ? 'Cancelar o acerto' : 'Acertar o endireitamento'}
          </button>
          {temContorno && !propostas && !arestasPropostas && !serie && !modoAcerto && (
            <button type="button" className="btn-secondary btn-sm" disabled={aProcurarArestas} onClick={proporAsArestas}>
              {aProcurarArestas ? 'A procurar…' : 'Propor as arestas'}
            </button>
          )}
          {selecionada && !propostasPendentes && (
            <button
              type="button"
              className="btn-quiet btn-sm"
              onClick={() => {
                mudarZonas((zs) => zs.filter((x) => x.id !== selecionada.id));
                setSelecionadaId(null);
              }}
            >
              Apagar a escolhida
            </button>
          )}
        </div>
      </div>

      {emSerie && serie?.ultima && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 p-3">
          <label className="block">
            <span className="mb-1 block text-[15px] font-medium text-slate-700">{frase.quantos} ao todo, com o primeiro e o último</span>
            <input
              className="campo w-28"
              inputMode="numeric"
              autoFocus
              value={serie.total}
              onChange={(e) => setSerie({ ...serie, total: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') criarSerie();
              }}
            />
          </label>
          <button type="button" className="btn-primary btn-sm" disabled={!totalSerie} onClick={criarSerie}>
            {totalSerie ? `Criar ${totalSerie}` : 'Criar'}
          </button>
          <button type="button" className="btn-quiet btn-sm" onClick={() => setSerie(null)}>
            Cancelar
          </button>
        </div>
      )}

      {acertos > 0 && !modoAcerto && (
        <div className="flex flex-wrap items-center gap-3 text-[15px] text-slate-600">
          {confirmarRetirar ? (
            <>
              <span>O prédio volta a ficar como antes do acerto, e as zonas acompanham.</span>
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={propostasPendentes}
                onClick={() => {
                  setConfirmarRetirar(false);
                  onAnularAcertos();
                }}
              >
                Retirar o acerto
              </button>
              <button type="button" className="btn-quiet btn-sm" onClick={() => setConfirmarRetirar(false)}>
                Manter
              </button>
            </>
          ) : (
            <>
              <span>{acertos === 1 ? 'Endireitamento acertado por 1 aresta.' : `Endireitamento acertado por ${acertos} arestas.`}</span>
              <button type="button" className="btn-quiet btn-sm" disabled={propostasPendentes} onClick={() => setConfirmarRetirar(true)}>
                Retirar o acerto…
              </button>
            </>
          )}
        </div>
      )}

      {temContorno && (
        <MargemDoContorno
          margem={margem}
          arestas={arestasMarcadas}
          // Enquanto procura, fica no mesmo sítio, desativado: um segundo toque impaciente caía no que
          // subisse para o lugar dele (avaliação de 05/11/2026, a 390 px: «Ver a fotografia inteira»).
          proporArestas={
            !modoAcerto && (!pendente || aProcurarArestas) ? { aProcurar: aProcurarArestas, onClick: proporAsArestas } : undefined
          }
        />
      )}

      {verOriginal ? (
        <div className="space-y-2">
          <VistaOriginal foto={foto} calibracao={calibracao} zonas={zonas} arestas={arestasPropostas?.lista ?? []} />
          {arestasPropostas && arestasPropostas.lista.length > 0 && (
            <p className="text-[13px] text-slate-600">As arestas propostas tiram-se na vista endireitada.</p>
          )}
        </div>
      ) : (
        <FachadaEndireitada
          foto={foto}
          calibracao={calibracao}
          referencia={referencia}
          zonas={zonas}
          tipo={tipoAtivo}
          canto={canto}
          selecionada={selecionada}
          onSelecionar={setSelecionadaId}
          modoAcerto={modoAcerto}
          onAcerto={(a, b) => {
            setModoAcerto(false);
            onAcertar(a, b);
          }}
          pedidoDeteccao={pedidoDeteccao > deteccaoFeita ? pedidoDeteccao : 0}
          onDetetadas={(ds) => {
            setDeteccaoFeita(pedidoDeteccao);
            // Uma proposta em cima de um vão já desenhado não se repete.
            const existentes = zonas.filter((z) => z.tipo === 'vao');
            const novas = ds
              .filter((d) => !existentes.some((e) => sobreposicaoRelativa(e, d) > 0.3))
              .map((d, i): Zona => ({ id: `proposta-${i}`, tipo: 'vao', x: d.x, y: d.y, largura: d.largura, altura: d.altura }));
            setPropostas(novas);
          }}
          propostas={propostas ?? []}
          onTirarProposta={(id) => setPropostas((ps) => (ps ? ps.filter((p) => p.id !== id) : ps))}
          arestasPropostas={arestasPropostas?.lista ?? []}
          onTirarAresta={(id) => setArestasPropostas((ap) => (ap ? { ...ap, lista: ap.lista.filter((a) => a.id !== id) } : ap))}
          soToques={!!propostas || !!arestasPropostas}
          previas={previas}
          onDesenho={aoDesenhar}
          onAlterarZona={(nova) => mudarZonas((zs) => zs.map((z) => (z.id === nova.id ? nova : z)))}
        />
      )}

      <label className="flex min-h-[44px] items-center gap-2 text-[15px] text-slate-700">
        <input type="checkbox" className="h-5 w-5" checked={verOriginal} onChange={(e) => setVerOriginal(e.target.checked)} />
        Ver o desenho sobre a fotografia original
      </label>

      <ListaDeZonas zonas={zonas} bloqueada={propostasPendentes} onApagar={(id) => mudarZonas((zs) => zs.filter((x) => x.id !== id))} />

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-quiet btn-sm" disabled={pendente} onClick={onVoltar}>
          Voltar à referência
        </button>
        <button type="button" className="btn-primary btn-sm" disabled={!temContorno || pendente} onClick={onContinuar}>
          Ver áreas e volume
        </button>
        {serie && <p className="text-[13px] text-slate-500">Criar ou cancelar a série primeiro.</p>}
        {propostas && <p className="text-[13px] text-slate-500">Aceitar ou descartar as janelas propostas primeiro.</p>}
        {arestasPropostas && <p className="text-[13px] text-slate-500">Aceitar ou descartar as arestas propostas primeiro.</p>}
      </div>
    </section>
  );
}

/**
 * «± 2,1 % (± 4,6 m²)», em algarismos tabulares (`textoDaMargem`); sem área, só os m²; sem margem, «—».
 * Num ecrã estreito parte entre as duas, nunca a meio de uma.
 */
function TextoDaMargem({ margem }: { margem: MargemEArea }) {
  const t = textoDaMargem(margem);
  return (
    <span className="font-mono tabular-nums">
      {!t ? (
        '—'
      ) : t.percentagem ? (
        <>
          <span className="whitespace-nowrap">{t.percentagem}</span> <span className="whitespace-nowrap">({t.m2})</span>
        </>
      ) : (
        <span className="whitespace-nowrap">{t.m2}</span>
      )}
    </span>
  );
}

/**
 * A margem de erro por baixo do total a que se refere, com o número à direita e o que cobre atrás do
 * (i). Sem margem, «indisponível». Enquanto se refaz a seguir a uma tecla (`aCalcular`), o número que
 * ainda lá está aparece esbatido: é o das opções de antes.
 */
function LinhaDaMargem({
  margem,
  aCalcular = false,
  rotulo,
  children,
}: {
  margem: MargemEArea | null;
  aCalcular?: boolean;
  rotulo: string;
  children: ReactNode;
}) {
  return (
    // O balão da Dica abre a partir da linha inteira, e não do (i): a meio do ecrã, com 80 % da largura
    // do telemóvel, saía cortado pela direita. O nowrap fica só no rótulo — herdado pela Dica, o texto
    // do balão saía numa linha só.
    <div className="relative mt-1 flex items-center justify-between gap-3 text-[15px] text-slate-600 [&_details>span]:top-full [&_details>span]:mt-1 [&_details]:static">
      <span className="flex shrink-0 items-center gap-2">
        <span className="whitespace-nowrap">Margem de erro</span>
        <Dica rotulo={rotulo}>{children}</Dica>
      </span>
      <span aria-busy={aCalcular} className={`min-w-0 text-right transition-opacity ${aCalcular ? 'opacity-50' : ''}`}>
        {margem ? <TextoDaMargem margem={margem} /> : 'indisponível'}
      </span>
    </div>
  );
}

/**
 * A margem de erro da área do contorno, numa linha discreta por cima da vista; acima de
 * `MARGEM_A_REDUZIR`, o que a reduz (`comoReduzirAMargem`). Ver `margemDaArea`.
 */
function MargemDoContorno({
  margem,
  arestas,
  proporArestas,
}: {
  margem: MargemDaArea | null;
  arestas: ArestasMarcadas;
  /** Ao lado da sugestão, quando ainda faltam arestas: o mesmo que o botão «Propor as arestas» (desativado enquanto procura). */
  proporArestas?: { aProcurar: boolean; onClick: () => void };
}) {
  if (!margem) {
    return (
      <p className="text-[15px] font-medium text-amber-800">
        Margem de erro da área indisponível: com um píxel de diferença num canto, a referência deixa de dar uma calibração. Rever os cantos
        no passo 2.
      </p>
    );
  }
  const sugestao = comoReduzirAMargem(margem, arestas, 3);
  return (
    <div className="space-y-1">
      <p className="text-[13px] text-slate-500">
        Margem de erro da área do contorno: <TextoDaMargem margem={margem} />.
      </p>
      {sugestao && <p className="text-[15px] font-medium text-amber-800">{sugestao}</p>}
      {sugestao && proporArestas && !(arestas.duasVerticais && arestas.duasHorizontais) && (
        <button type="button" className="btn-secondary btn-sm" disabled={proporArestas.aProcurar} onClick={proporArestas.onClick}>
          {proporArestas.aProcurar ? 'A procurar…' : 'Propor as arestas'}
        </button>
      )}
    </div>
  );
}

/**
 * Corre `f` depois de o ecrã pintar o que já mudou — um «A procurar…» ou «A aplicar…» no botão antes de
 * um cálculo que ocupa o telemóvel. O `requestAnimationFrame` corre antes da pintura seguinte e o
 * `setTimeout` lá de dentro só depois dela; um `setTimeout` sozinho podia correr antes de pintar, e num
 * telemóvel lento o botão nunca chegava a mostrar a frase (medido com o CPU 4× mais lento, 04/11/2026).
 */
function depoisDePintar(f: () => void) {
  window.requestAnimationFrame(() => window.setTimeout(f, 0));
}

/** Um número da margem ou da área, que nunca se parte no fim de uma linha («±» sozinho, «m²» na seguinte). */
function Inteiro({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>;
}

/**
 * Com as arestas propostas, a margem do contorno antes e depois; e, se a área do contorno mudar mais
 * do que a margem que tinha, o aviso em âmbar — uma das duas calibrações está errada (o aviso de
 * `MedirFachada` repete-o depois de aceitar, `TextoDoAvisoDoAcerto`).
 */
function PrevisaoDasArestas({ antes, depois }: { antes: MargemDaArea | null; depois: MargemDaArea | null }) {
  if (!antes || !depois) return null;
  const ta = textoDaMargem(antes);
  const td = textoDaMargem(depois);
  const mudaDeMais = Math.abs(depois.areaM2 - antes.areaM2) > antes.margemM2;
  return (
    <>
      {ta && td && (
        <p className="mt-1 max-w-[60ch] text-[15px] text-slate-600">
          Com estas arestas, a margem do contorno passa de{' '}
          <span className="whitespace-nowrap font-mono tabular-nums text-slate-900">{ta.percentagem ?? ta.m2}</span> para{' '}
          <span className="whitespace-nowrap font-mono tabular-nums text-slate-900">{td.percentagem ?? td.m2}</span>.
        </p>
      )}
      {mudaDeMais && (
        <p className="mt-1 max-w-[60ch] text-[15px] font-medium text-amber-800">
          Ao aceitar, a área do contorno passa de <Inteiro>{m(antes.areaM2)} m²</Inteiro> para <Inteiro>{m(depois.areaM2)} m²</Inteiro>,
          mais do que a margem de <Inteiro>{ta?.m2 ?? '—'}</Inteiro>: uma das duas calibrações está errada. Conferir na vista se as retas
          assentam nas arestas do prédio.
        </p>
      )}
    </>
  );
}

/** A área do contorno antes e depois de aceitar arestas que a mudaram mais do que a margem que tinha. */
interface AvisoDoAcerto {
  antes: MargemDaArea;
  depois: MargemDaArea;
}

/** Um aviso guardado com o passo que o deu (`marca`) e a referência e a vertical do passo 2 de então. */
interface AvisoGuardado extends AvisoDoAcerto {
  marca: unknown;
  referencia: ReferenciaRetangular;
  arestas: [Ponto, Ponto][];
}

/**
 * Onde a vista ainda sai torta (`Concordancia.torta`), quando isso muda a área do contorno mais do que a
 * margem: a área antes e com a aresta que a fotografia pede ali.
 */
interface TortaQueConta {
  torta: Inclinacao;
  antes: MargemDaArea;
  depois: MargemDaArea;
}

/** O aviso depois de aceitar (ver `avisoDoAcerto` em `MedirFachada`): só aparece enquanto o último passo for o aceite. */
function TextoDoAvisoDoAcerto({ aviso }: { aviso: AvisoDoAcerto }) {
  return (
    <p className="mt-1 max-w-[60ch] text-[15px] font-medium text-amber-800">
      A área do contorno passou de <Inteiro>{m(aviso.antes.areaM2)} m²</Inteiro> para <Inteiro>{m(aviso.depois.areaM2)} m²</Inteiro>, mais
      do que a margem de <Inteiro>{textoDaMargem(aviso.antes)?.m2 ?? '—'}</Inteiro> que tinha: uma das duas calibrações estava errada.
      Conferir na vista se o prédio ficou direito; senão, «Desfazer o último passo».
    </p>
  );
}

/**
 * Quanto a inclinação que a vista ainda tem mexe na área do contorno (`TortaQueConta`): a margem não a
 * conta, e só se diz quando passa dela.
 */
function TextoDaTortaNaArea({ t }: { t: TortaQueConta }) {
  return (
    <p className="mt-1 max-w-[60ch] text-[15px] font-medium text-amber-800">
      Acertada essa inclinação, a área do contorno passaria de <Inteiro>{m(t.antes.areaM2)} m²</Inteiro> para cerca de{' '}
      <Inteiro>{m(t.depois.areaM2)} m²</Inteiro> — mais do que a margem de <Inteiro>{textoDaMargem(t.antes)?.m2 ?? '—'}</Inteiro>, que não a
      conta.
    </p>
  );
}

/**
 * As zonas agrupadas por tipo: quantas e quanto somam, à vista; o detalhe (e o "Apagar") abre-se.
 * Com 35 zonas numa lista corrida, o promotor tinha de descer o ecrã inteiro para chegar ao botão.
 */
function ListaDeZonas({
  zonas,
  bloqueada = false,
  onApagar,
}: {
  zonas: Zona[];
  /** Com propostas pendentes, nada se apaga: «Desfazer» está bloqueado até as aceitar ou descartar. */
  bloqueada?: boolean;
  onApagar: (id: string) => void;
}) {
  if (zonas.length === 0) return null;
  return (
    <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
      {ORDEM_DOS_TIPOS.map((t) => {
        const doTipo = zonas.filter((z) => z.tipo === t);
        if (doTipo.length === 0) return null;
        const soma = doTipo.reduce((s, z) => s + areaDaZona(z), 0);
        return (
          <details key={t} className="group">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 px-3 text-[15px] [&::-webkit-details-marker]:hidden">
              <span className={`inline-block h-3 w-3 shrink-0 rounded-full ${COR[t].bg}`} />
              <span className="min-w-0 flex-1 text-slate-700">
                {TIPO_ZONA_LABELS[t]} <span className="whitespace-nowrap text-slate-500">· {doTipo.length}</span>
              </span>
              <span className="ml-auto whitespace-nowrap font-mono tabular-nums text-slate-900">{m(soma)} m²</span>
              <span className="w-4 text-slate-500 group-open:rotate-90" aria-hidden>
                ›
              </span>
            </summary>
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {doTipo.map((z) => (
                <li key={z.id} className="flex items-center justify-between gap-3 pl-8 pr-3 text-[15px]">
                  <span className="ml-auto font-mono tabular-nums text-slate-900">
                    {z.triangulo ? 'triângulo ' : ''}
                    {m(z.largura)} × {m(z.altura)} m = {m(areaDaZona(z))} m²
                  </span>
                  <button type="button" className="btn-quiet btn-sm" disabled={bloqueada} onClick={() => onApagar(z.id)}>
                    Apagar
                  </button>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}

function PassoReferencia(props: {
  foto: Foto;
  cantos: Ponto[];
  setCantos: (f: (c: Ponto[]) => Ponto[]) => void;
  larguraCm: string;
  setLarguraCm: (v: string) => void;
  alturaCm: string;
  setAlturaCm: (v: string) => void;
  arestas: [Ponto, Ponto][];
  setArestas: (f: (a: [Ponto, Ponto][]) => [Ponto, Ponto][]) => void;
  arestaPendente: Ponto | null;
  setArestaPendente: (p: Ponto | null) => void;
  aMarcarAresta: boolean;
  setAMarcarAresta: (v: boolean) => void;
  controlos: Controlo[];
  setControlos: (f: (c: Controlo[]) => Controlo[]) => void;
  controloPendente: Ponto | null;
  setControloPendente: (p: Ponto | null) => void;
  aMarcarControlo: boolean;
  setAMarcarControlo: (v: boolean) => void;
  calibracao: Calibracao | null;
  problema: string | null;
  pronta: boolean;
  onVoltar: () => void;
  onContinuar: () => void;
}) {
  const { foto, cantos, arestas, arestaPendente, aMarcarAresta, controlos, controloPendente, aMarcarControlo } = props;
  const escala = Math.max(foto.largura, foto.altura) / 900;
  const aMarcarCantos = cantos.length < 4;
  const ativo = aMarcarCantos || aMarcarAresta || aMarcarControlo;

  // Precisão (promotor, 04/11/2026: "aumentar a precisão do rato"): carregar num ponto já marcado e
  // arrastar move-o a um quarto da velocidade do dedo, com a lupa em cima dele.
  type Alvo =
    | { k: 'canto'; i: number }
    | { k: 'aresta'; i: number; j: 0 | 1 }
    | { k: 'pendente' }
    | { k: 'controlo'; i: number; j: 0 | 1 }
    | { k: 'controloPendente' };
  const gesto = useRef<{ mover: Alvo; origem: Ponto } | { colocar: true } | null>(null);
  const [foco, setFoco] = useState<Ponto | null>(null);
  // Íman nos cantos, como no Photoshop: ao marcar um canto da referência, o ponto salta para o canto
  // da imagem mais próximo (`cantos.ts`); sem canto claro por perto, fica onde se apontou.
  const [ima, setIma] = useState(true);
  // Também nas medidas de controlo: as pontas costumam ser cantos (de uma montra, do prédio).
  const ajustar = (p: Ponto): Ponto => (ima && (aMarcarCantos || aMarcarControlo) ? (cantoMaisProximo(foto.pixeis, p, 16) ?? p) : p);
  const posicao = (a: Alvo): Ponto | null => {
    switch (a.k) {
      case 'canto':
        return cantos[a.i] ?? null;
      case 'aresta':
        return arestas[a.i]?.[a.j] ?? null;
      case 'pendente':
        return arestaPendente;
      case 'controlo': {
        const c = controlos[a.i];
        return c ? (a.j === 0 ? c.a : c.b) : null;
      }
      case 'controloPendente':
        return controloPendente;
    }
  };
  const pontoPerto = (p: Ponto, raio: number): Alvo | null => {
    const candidatos: Alvo[] = [
      ...cantos.map((_, i): Alvo => ({ k: 'canto', i })),
      ...arestas.flatMap((_, i): Alvo[] => [
        { k: 'aresta', i, j: 0 },
        { k: 'aresta', i, j: 1 },
      ]),
      ...(arestaPendente ? [{ k: 'pendente' } as Alvo] : []),
      ...controlos.flatMap((_, i): Alvo[] => [
        { k: 'controlo', i, j: 0 },
        { k: 'controlo', i, j: 1 },
      ]),
      ...(controloPendente ? [{ k: 'controloPendente' } as Alvo] : []),
    ];
    let melhor: Alvo | null = null;
    let dist = raio;
    for (const a of candidatos) {
      const q = posicao(a);
      if (q && Math.hypot(q.x - p.x, q.y - p.y) <= dist) {
        melhor = a;
        dist = Math.hypot(q.x - p.x, q.y - p.y);
      }
    }
    return melhor;
  };
  const mover = (a: Alvo, q: Ponto) => {
    if (a.k === 'canto') props.setCantos((c) => c.map((v, k) => (k === a.i ? q : v)));
    else if (a.k === 'aresta')
      props.setArestas((ar) => ar.map((e, k): [Ponto, Ponto] => (k === a.i ? (a.j === 0 ? [q, e[1]] : [e[0], q]) : e)));
    else if (a.k === 'pendente') props.setArestaPendente(q);
    else if (a.k === 'controlo')
      props.setControlos((cs) => cs.map((c, k) => (k === a.i ? (a.j === 0 ? { ...c, a: q } : { ...c, b: q }) : c)));
    else props.setControloPendente(q);
  };

  const tocar = (p: Ponto) => {
    if (aMarcarCantos) {
      props.setCantos((c) => (c.length >= 4 ? c : [...c, p]));
      return;
    }
    if (aMarcarControlo) {
      if (!controloPendente) return props.setControloPendente(p);
      const a = controloPendente;
      props.setControlos((cs) => [...cs, { a, b: p, cm: '' }]);
      props.setControloPendente(null);
      props.setAMarcarControlo(false);
      return;
    }
    if (!aMarcarAresta) return;
    if (!arestaPendente) {
      props.setArestaPendente(p);
    } else {
      const [baixo, cima] = arestaPendente.y > p.y ? [arestaPendente, p] : [p, arestaPendente];
      props.setArestas((a) => [...a, [baixo, cima]]);
      props.setArestaPendente(null);
      props.setAMarcarAresta(false);
    }
  };

  const desfazer = () => {
    if (controloPendente) return props.setControloPendente(null);
    if (aMarcarControlo || (controlos.length > 0 && !aMarcarAresta && !aMarcarCantos && arestas.length === 0))
      return props.setControlos((cs) => cs.slice(0, -1));
    if (arestaPendente) return props.setArestaPendente(null);
    if (arestas.length > 0 && !aMarcarCantos) return props.setArestas((a) => a.slice(0, -1));
    props.setCantos((c) => c.slice(0, -1));
  };

  let instrucao: ReactNode;
  let como: string;
  if (aMarcarCantos) {
    instrucao = (
      <>
        Tocar no canto <span className="text-tinta-700">{ORDEM_DOS_CANTOS[cantos.length]}</span> da referência
      </>
    );
    como = 'Carregar, levar a lupa até ao canto e largar. O íman puxa o ponto para o canto da imagem.';
  } else if (aMarcarControlo) {
    instrucao = controloPendente ? <>Agora a outra ponta da medida de controlo</> : <>Tocar numa ponta da medida de controlo</>;
    como = 'Uma distância medida à fita longe da referência — a largura da fachada ao nível do passeio, uma montra do outro lado.';
  } else if (aMarcarAresta) {
    instrucao = arestaPendente ? <>Agora o outro extremo da aresta</> : <>Tocar num extremo de uma aresta vertical comprida</>;
    como =
      'Um canto do prédio ou a aresta de uma coluna de janelas, do ponto mais baixo ao mais alto que se vê. Um tubo de queda pode não estar a prumo.';
  } else {
    instrucao = <>Cantos marcados — escrever a largura e a altura reais</>;
    como = 'Para acertar um ponto, carregar nele e arrastar: move-se devagar, com a lupa por cima.';
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-[17px] font-semibold text-slate-900">
        Referência medida
        <Dica rotulo="O que é a referência">
          Algo retangular que se mediu com fita, na própria fachada — uma porta, uma janela, uma montra. Tocam-se os 4 cantos por esta
          ordem: inferior esquerdo, inferior direito, superior direito, superior esquerdo. A referência tem de estar no plano da parede:
          numa entrada recuada, os cantos da abertura na parede, não os da porta lá dentro.
        </Dica>
      </h2>

      <div className="rounded-xl border border-slate-200 p-4" aria-live="polite">
        <p className="text-[13px] font-medium text-slate-500">Agora</p>
        <p className="text-[20px] font-semibold leading-snug text-slate-900">{instrucao}</p>
        <p className="mt-1 max-w-[60ch] text-[15px] text-slate-600">{como}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="flex min-h-[44px] items-center gap-2 text-[15px] text-slate-700">
            <input type="checkbox" className="h-5 w-5" checked={ima} onChange={(e) => setIma(e.target.checked)} />
            Íman nos cantos
          </label>
          {(cantos.length > 0 || arestas.length > 0) && (
            <button type="button" className="btn-quiet btn-sm" onClick={desfazer}>
              Desfazer último ponto
            </button>
          )}
        </div>
      </div>

      <Moldura
        fundo={
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto.url} alt="Fotografia da fachada" draggable={false} className="block max-h-[70vh] w-auto max-w-full select-none" />
        }
      >
        <CamadaDeToque
          largura={foto.largura}
          altura={foto.altura}
          ativo
          lupa={foto.canvas}
          focoLupa={foco}
          onCancelar={() => {
            gesto.current = null;
            setFoco(null);
          }}
          onArrastar={(de, ate, fim, unidades) => {
            if (!gesto.current) {
              const alvo = pontoPerto(de, 24 * unidades);
              const origem = alvo ? posicao(alvo) : null;
              gesto.current = alvo && origem ? { mover: alvo, origem } : { colocar: true };
            }
            const g = gesto.current;
            if (fim) {
              gesto.current = null;
              setFoco(null);
            }
            if ('mover' in g) {
              const q = { x: g.origem.x + (ate.x - de.x) / 4, y: g.origem.y + (ate.y - de.y) / 4 };
              mover(g.mover, q);
              if (!fim) setFoco(q);
              return;
            }
            const q = ajustar(ate);
            if (!fim) return setFoco(q);
            if (ativo) tocar(q);
          }}
        >
          {cantos.length === 4 && (
            <polygon
              points={cantos.map((p) => `${p.x},${p.y}`).join(' ')}
              className="fill-fuchsia-400/15 stroke-fuchsia-500"
              strokeWidth={3 * escala}
              style={{ pointerEvents: 'none' }}
            />
          )}
          {arestas.map(([a, b], i) => (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className="stroke-fuchsia-500"
              strokeWidth={4 * escala}
              style={{ pointerEvents: 'none' }}
            />
          ))}
          {cantos.map((p, i) => (
            <Marcador key={i} p={p} rotulo={String(i + 1)} escala={escala} />
          ))}
          {arestaPendente && <Marcador p={arestaPendente} escala={escala} cor="fill-fuchsia-500" />}
          {controlos.map((c, i) => (
            <g key={`c${i}`} style={{ pointerEvents: 'none' }}>
              <line
                x1={c.a.x}
                y1={c.a.y}
                x2={c.b.x}
                y2={c.b.y}
                className="stroke-cyan-600"
                strokeWidth={4 * escala}
                strokeDasharray={`${12 * escala} ${6 * escala}`}
              />
              <Marcador p={c.a} escala={escala} cor="fill-cyan-600" />
              <Marcador p={c.b} escala={escala} cor="fill-cyan-600" rotulo={`C${i + 1}`} />
            </g>
          ))}
          {controloPendente && <Marcador p={controloPendente} escala={escala} cor="fill-cyan-600" />}
        </CamadaDeToque>
      </Moldura>

      <div className="grid max-w-md gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[15px] font-medium text-slate-700">Largura real (cm)</span>
          <input
            className="campo"
            inputMode="decimal"
            placeholder="Ex.: 165"
            value={props.larguraCm}
            onChange={(e) => props.setLarguraCm(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[15px] font-medium text-slate-700">Altura real (cm)</span>
          <input
            className="campo"
            inputMode="decimal"
            placeholder="Ex.: 377"
            value={props.alturaCm}
            onChange={(e) => props.setAlturaCm(e.target.value)}
          />
        </label>
      </div>

      {cantos.length === 4 && (
        <div className="space-y-2 rounded-lg border border-slate-200 p-4">
          <p className="max-w-[60ch] text-[15px] text-slate-700">
            <strong>Recomendado:</strong> marcar também uma aresta vertical comprida do prédio — um canto, a aresta de uma coluna de janelas
            — do ponto mais baixo ao mais alto que se vê. A referência é curta e o prédio é alto; com uma aresta comprida, as alturas ficam
            cerca de quatro vezes mais precisas.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-secondary btn-sm" disabled={aMarcarAresta} onClick={() => props.setAMarcarAresta(true)}>
              {arestas.length === 0 ? 'Marcar uma aresta vertical' : 'Marcar outra aresta vertical'}
            </button>
            {arestas.length > 0 && (
              <span className="text-[15px] text-slate-600">
                {arestas.length === 1 ? '1 aresta marcada' : `${arestas.length} arestas marcadas`}
              </span>
            )}
          </div>
        </div>
      )}

      {cantos.length === 4 && (
        <div className="space-y-3 rounded-lg border border-slate-200 p-4">
          <p className="max-w-[60ch] text-[15px] text-slate-700">
            <strong>Conferir com outra medida à fita (recomendado):</strong> uma distância longe da referência, de preferência na horizontal
            — a largura da fachada ao nível do passeio, uma montra do outro lado. Mostra se a referência está bem medida e bem tocada: uma
            largura mal escrita ou uma porta recuada passam despercebidas em tudo o resto.
          </p>
          {controlos.map((c, i) => {
            const medido = props.calibracao ? medirNoPlano(props.calibracao, c.a, c.b) : null;
            const cm = numero(c.cm);
            const desvio = props.calibracao && cm ? desvioDoControlo(props.calibracao, c.a, c.b, cm / 100) : null;
            const alto = desvio !== null && Math.abs(desvio) > DESVIO_MAXIMO_DO_CONTROLO;
            return (
              <div key={i} className="space-y-1">
                <div className="flex flex-wrap items-end gap-3">
                  <span className="flex min-h-[44px] items-center gap-1 text-[15px] text-slate-700">
                    C{i + 1} · no desenho{' '}
                    <span className="font-mono tabular-nums text-slate-900">{medido !== null ? `${m(medido)} m` : '—'}</span>
                  </span>
                  <label className="block w-36">
                    <span className="mb-1 block text-[13px] text-slate-600">À fita (cm)</span>
                    <input
                      className="campo"
                      inputMode="decimal"
                      placeholder="Ex.: 1405"
                      value={c.cm}
                      onChange={(e) => {
                        const v = e.target.value;
                        props.setControlos((cs) => cs.map((x, k) => (k === i ? { ...x, cm: v } : x)));
                      }}
                    />
                  </label>
                  {desvio !== null && (
                    <span
                      className={`flex min-h-[44px] items-center gap-1 text-[15px] ${alto ? 'font-medium text-amber-800' : 'text-slate-700'}`}
                    >
                      desvio{' '}
                      <span className="font-mono tabular-nums">
                        {desvio >= 0 ? '+' : '−'}
                        {String(Math.abs(Math.round(desvio * 1000) / 10)).replace('.', ',')} %
                      </span>
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn-quiet btn-sm"
                    onClick={() => props.setControlos((cs) => cs.filter((_, k) => k !== i))}
                  >
                    Apagar
                  </button>
                </div>
                {alto && (
                  <p className="text-[15px] font-medium text-amber-800">
                    Desvio acima de 3 %: rever a largura e a altura da referência e os cantos tocados — uma porta recuada também dá isto.
                  </p>
                )}
              </div>
            );
          })}
          <button type="button" className="btn-secondary btn-sm" disabled={aMarcarControlo} onClick={() => props.setAMarcarControlo(true)}>
            {controlos.length === 0 ? 'Marcar uma medida de controlo' : 'Marcar outra medida de controlo'}
          </button>
        </div>
      )}

      {props.problema && <p className="text-[15px] font-medium text-amber-800">{props.problema}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-quiet btn-sm" onClick={props.onVoltar}>
          Voltar
        </button>
        <button type="button" className="btn-primary btn-sm" disabled={!props.pronta} onClick={props.onContinuar}>
          Endireitar a fachada
        </button>
      </div>
    </section>
  );
}

/**
 * A fotografia endireitada e à escala, enquadrada no contorno (ou inteira) — a do passo 3 e a da
 * conferência do passo 4 são a mesma.
 */
function useVistaEndireitada(foto: Foto, calibracao: Calibracao, referencia: ReferenciaRetangular, zonas: Zona[], verTudo: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const total: Extensao = useMemo(() => extensaoDoPlano(calibracao, foto.largura, foto.altura, referencia), [foto, calibracao, referencia]);
  const enquadrada = useMemo(() => enquadrarNoContorno(zonas, total), [zonas, total]);
  const temContorno = enquadrada !== total;
  const alvo = verTudo || !temContorno ? total : enquadrada;
  // A vista só se refaz quando o enquadramento muda (um contorno novo), não a cada vão desenhado.
  const chave = [alvo.x0, alvo.x1, alvo.y0, alvo.y1].map((n) => n.toFixed(3)).join(' ');
  const { ext, ppm, vista } = useMemo(() => {
    const p = pixeisPorMetro(alvo, 1000, 1500);
    return { ext: alvo, ppm: p, vista: endireitar(foto.pixeis, calibracao.planoParaImagem, alvo, p) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foto, calibracao, chave]);
  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    c.width = vista.width;
    c.height = vista.height;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(vista.data), vista.width, vista.height), 0, 0);
  }, [vista]);
  return { canvasRef, ext, ppm, vista, temContorno };
}

/**
 * Conferir a área (promotor, 04/11/2026: "no fim, não sei se a área está bem coberta"): a fotografia
 * endireitada com o que se pinta a verde, os vãos descontados em branco, o R/C excluído a cinzento e o
 * que ficou fora do contorno contornado a âmbar. Se uma parte da fachada ficar sem verde, falta
 * contorno; se o verde passar para fora do prédio, o contorno está grande.
 */
function ConferirArea({
  foto,
  calibracao,
  referencia,
  zonas,
  incluirRC,
}: {
  foto: Foto;
  calibracao: Calibracao;
  referencia: ReferenciaRetangular;
  zonas: Zona[];
  incluirRC: boolean;
}) {
  const { canvasRef, ext, ppm, vista } = useVistaEndireitada(foto, calibracao, referencia, zonas, false);
  const px = (X: number) => (X - ext.x0) * ppm;
  const py = (Y: number) => (ext.y1 - Y) * ppm;
  const pontos = (z: Zona) =>
    verticesDaZona(z)
      .map((p) => `${px(p.x)},${py(p.y)}`)
      .join(' ');
  const traco = Math.max(vista.width, vista.height) / 300;
  const contornos = zonas.filter((z) => z.tipo === 'fachada');
  const dentroDoContorno = (z: Zona) => {
    const v = verticesDaZona(z);
    const meio = { x: v.reduce((s, p) => s + p.x, 0) / v.length, y: v.reduce((s, p) => s + p.y, 0) / v.length };
    return (
      v.every((p) =>
        contornos.some((c) => zonaContem({ ...c, x: c.x - 0.05, y: c.y - 0.05, largura: c.largura + 0.1, altura: c.altura + 0.1 }, p)),
      ) || !contornos.some((c) => zonaContem(c, meio))
    );
  };
  const LEGENDA: { cor: string; texto: string }[] = [
    { cor: 'bg-emerald-500/50', texto: 'Pinta-se' },
    { cor: 'bg-white ring-1 ring-violet-600', texto: 'Vão descontado' },
    ...(incluirRC ? [] : [{ cor: 'bg-slate-500/60', texto: 'R/C excluído' }]),
    { cor: 'ring-2 ring-amber-600', texto: 'Parte fora do contorno (não conta)' },
  ];
  return (
    <div className="space-y-2">
      <Moldura fundo={<canvas ref={canvasRef} className="block max-h-[60vh] w-auto max-w-full" aria-label="Conferir a área" />}>
        <svg viewBox={`0 0 ${vista.width} ${vista.height}`} className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
          {contornos.map((z) => (
            <polygon key={z.id} points={pontos(z)} className="fill-emerald-500/40 stroke-emerald-700" strokeWidth={traco} />
          ))}
          {!incluirRC &&
            zonas
              .filter((z) => z.tipo === 'rc')
              .map((z) => <polygon key={z.id} points={pontos(z)} className="fill-slate-500/60 stroke-slate-700" strokeWidth={traco} />)}
          {zonas
            .filter((z) => z.tipo === 'vao')
            .map((z) =>
              areaDaZona(z) > AREA_MINIMA_VAO_M2 ? (
                <polygon key={z.id} points={pontos(z)} className="fill-white/75 stroke-violet-600" strokeWidth={traco} />
              ) : (
                <polygon
                  key={z.id}
                  points={pontos(z)}
                  fill="none"
                  className="stroke-violet-600"
                  strokeWidth={traco}
                  strokeDasharray={`${traco * 3} ${traco * 2}`}
                />
              ),
            )}
          {zonas
            .filter((z) => z.tipo !== 'fachada' && !dentroDoContorno(z))
            .map((z) => (
              <polygon
                key={`fora-${z.id}`}
                points={pontos(z)}
                fill="none"
                className="stroke-amber-600"
                strokeWidth={traco * 1.5}
                strokeDasharray={`${traco * 4} ${traco * 2}`}
              />
            ))}
        </svg>
      </Moldura>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-600">
        {LEGENDA.map((l) => (
          <li key={l.texto} className="flex items-center gap-1.5">
            <span className={`inline-block h-3 w-4 rounded ${l.cor}`} />
            {l.texto}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FachadaEndireitada({
  foto,
  calibracao,
  referencia,
  zonas,
  tipo,
  canto,
  selecionada,
  onSelecionar,
  modoAcerto,
  onAcerto,
  pedidoDeteccao,
  onDetetadas,
  propostas,
  onTirarProposta,
  arestasPropostas,
  onTirarAresta,
  soToques,
  previas,
  onDesenho,
  onAlterarZona,
}: {
  foto: Foto;
  calibracao: Calibracao;
  referencia: ReferenciaRetangular;
  zonas: Zona[];
  /** O tipo que se está a desenhar — e o único cujas zonas se acertam pela aresta. */
  tipo: TipoZona;
  /** A forma da zona que se está a desenhar (nulo: retângulo). */
  canto: CantoReto | null;
  /** A zona escolhida com um toque — a única cujas arestas se arrastam. */
  selecionada: Zona | null;
  onSelecionar: (id: string | null) => void;
  /** Em vez de desenhar, o arrasto marca uma aresta que devia estar direita. */
  modoAcerto: boolean;
  onAcerto: (a: Ponto, b: Ponto) => void;
  /** Cada vez que sobe, corre a deteção de janelas sobre esta vista e devolve as propostas. */
  pedidoDeteccao: number;
  onDetetadas: (ds: JanelaDetetada[]) => void;
  /** Janelas propostas à espera de confirmação: tocar numa tira-a. */
  propostas: Zona[];
  onTirarProposta: (id: string) => void;
  /** Arestas propostas para acertar o endireitamento (píxeis da fotografia): tocar perto de uma tira-a. */
  arestasPropostas: { id: string; a: Ponto; b: Ponto }[];
  onTirarAresta: (id: string) => void;
  /**
   * Com propostas à espera (janelas ou arestas), a vista só aceita toques, e um toque só tira propostas:
   * um dedo que escorrega ao tirar uma proposta desenhava um vão, e um toque ao lado escolhia uma zona que
   * se podia apagar — nada disso se podia desfazer até aceitar ou descartar.
   */
  soToques: boolean;
  /** Pré-visualização de uma série por confirmar, a tracejado. */
  previas: Zona[];
  onDesenho: (a: Ponto, b: Ponto) => void;
  onAlterarZona: (z: Zona) => void;
}) {
  const [verTudo, setVerTudo] = useState(false);
  const { canvasRef, ext, ppm, vista, temContorno } = useVistaEndireitada(foto, calibracao, referencia, zonas, verTudo);
  const [arrasto, setArrasto] = useState<{ de: Ponto; ate: Ponto } | null>(null);
  // O que o gesto em curso faz, decidido no primeiro movimento: desenhar uma zona nova, ou acertar
  // as arestas de uma zona do tipo escolhido que estejam a um dedo de onde se carregou.
  const gesto = useRef<{ novo: true } | { id: string; arestas: Aresta[] } | null>(null);
  const [edicao, setEdicao] = useState<Zona | null>(null);
  const [linhaAcerto, setLinhaAcerto] = useState<{ de: Ponto; ate: Ponto } | null>(null);
  // A deteção corre sempre sobre a vista enquadrada no contorno, com os contornos — também quando o
  // ecrã mostra a fotografia inteira: aí a escala é três vezes menor, a deteção fica mais lenta e
  // chegou a propor uma marquise (cético, 04/11/2026).
  useEffect(() => {
    if (pedidoDeteccao === 0) return;
    const contornos = zonas.filter((z) => z.tipo === 'fachada');
    if (!verTudo) return onDetetadas(detetarJanelas(vista, ext, ppm, contornos));
    const quadro = enquadrarNoContorno(zonas, ext);
    const p = pixeisPorMetro(quadro, 1000, 1500);
    onDetetadas(detetarJanelas(endireitar(foto.pixeis, calibracao.planoParaImagem, quadro, p), quadro, p, contornos));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoDeteccao]);

  const px = (X: number) => (X - ext.x0) * ppm;
  const py = (Y: number) => (ext.y1 - Y) * ppm;
  const metros = (p: Ponto): Ponto => ({
    x: ext.x0 + p.x / ppm,
    y: ext.y1 - p.y / ppm,
  });
  const letra = Math.max(vista.width, vista.height) / 60;

  const grelha: ReactNode[] = [];
  for (let X = Math.ceil(ext.x0); X <= ext.x1; X++) {
    grelha.push(
      <line
        key={`x${X}`}
        x1={px(X)}
        y1={0}
        x2={px(X)}
        y2={vista.height}
        stroke="white"
        strokeOpacity={X % 5 === 0 ? 0.55 : 0.25}
        strokeWidth={1}
      />,
    );
  }
  for (let Y = Math.ceil(ext.y0); Y <= ext.y1; Y++) {
    grelha.push(
      <line
        key={`y${Y}`}
        x1={0}
        y1={py(Y)}
        x2={vista.width}
        y2={py(Y)}
        stroke="white"
        strokeOpacity={Y % 5 === 0 ? 0.55 : 0.25}
        strokeWidth={1}
      />,
    );
    if (Y % 5 === 0) {
      grelha.push(
        <text
          key={`ty${Y}`}
          x={4}
          y={py(Y) - 4}
          fontSize={letra}
          className="fill-white stroke-slate-900"
          strokeWidth={letra / 5}
          paintOrder="stroke"
        >
          {Y} m
        </text>,
      );
    }
  }

  const pontos = (z: Zona) =>
    verticesDaZona(z)
      .map((p) => `${px(p.x)},${py(p.y)}`)
      .join(' ');
  const retangulo = (z: Zona, t: TipoZona, chave: string, rotulo: boolean) => (
    <g key={chave} style={{ pointerEvents: 'none' }}>
      <polygon points={pontos(z)} className={`${COR[t].fill} ${COR[t].stroke}`} strokeWidth={letra / 6} strokeLinejoin="round" />
      {rotulo && z.largura * ppm > letra * 4 && (
        <text
          x={px(z.x) + 4}
          y={py(z.y + z.altura) + letra + 2}
          fontSize={letra * 0.9}
          className="fill-white stroke-slate-900"
          strokeWidth={letra / 5}
          paintOrder="stroke"
        >
          {m(z.largura)} × {m(z.altura)} m
        </text>
      )}
    </g>
  );

  const temp = arrasto ? zonaDeDoisCantos('temp', tipo, metros(arrasto.de), metros(arrasto.ate), canto ?? undefined) : null;

  /** Só as arestas da zona escolhida se agarram, a 14 píxeis de ecrã: o que um dedo acerta sem lupa. */
  const decidir = (de: Ponto, unidades: number) => {
    if (selecionada) {
      const arestas = arestasPerto(selecionada, metros(de), (14 * unidades) / ppm);
      if (arestas.length > 0) return { id: selecionada.id, arestas };
    }
    return { novo: true as const };
  };

  // As arestas propostas na vista: da fotografia ao plano (a homografia leva retas a retas) e daí à vista.
  const arestasNaVista = arestasPropostas
    .map((a) => {
      const [p, q] = [aplicar(calibracao.imagemParaPlano, a.a), aplicar(calibracao.imagemParaPlano, a.b)];
      return p && q && [p.x, p.y, q.x, q.y].every(Number.isFinite)
        ? { id: a.id, de: { x: px(p.x), y: py(p.y) }, ate: { x: px(q.x), y: py(q.y) } }
        : null;
    })
    .filter((a): a is { id: string; de: Ponto; ate: Ponto } => !!a);

  /**
   * Um toque (sem arrastar) tira a aresta proposta que estiver a um dedo (22 píxeis de ecrã), ou a
   * janela proposta por baixo; senão escolhe a zona do tipo em curso que está por baixo, ou larga a escolha.
   */
  const tocar = (p: Ponto, unidades: number) => {
    const v = { x: px(p.x), y: py(p.y) };
    let perto: { id: string; d: number } | null = null;
    for (const a of arestasNaVista) {
      const [ex, ey] = [a.ate.x - a.de.x, a.ate.y - a.de.y];
      const t = Math.max(0, Math.min(1, ((v.x - a.de.x) * ex + (v.y - a.de.y) * ey) / Math.max(1e-9, ex * ex + ey * ey)));
      const d = Math.hypot(v.x - a.de.x - t * ex, v.y - a.de.y - t * ey);
      if (d <= 22 * unidades && (!perto || d < perto.d)) perto = { id: a.id, d };
    }
    if (perto) return onTirarAresta(perto.id);
    const proposta = propostas.find((z) => zonaContem(z, p));
    if (proposta) return onTirarProposta(proposta.id);
    // Com propostas pendentes, um toque só as tira: escolher uma zona deixava apagá-la (e retirar o
    // acerto), e nada disso se podia desfazer até aceitar ou descartar (avaliação de 05/11/2026).
    if (soToques) return;
    for (let i = zonas.length - 1; i >= 0; i--) {
      const z = zonas[i]!;
      if (z.tipo === tipo && zonaContem(z, p)) return onSelecionar(z.id === selecionada?.id ? null : z.id);
    }
    onSelecionar(null);
  };

  return (
    <div className="space-y-2" data-ext={JSON.stringify(ext)} data-ppm={ppm}>
      {temContorno && (
        <div className="flex flex-wrap items-center gap-3 text-[15px] text-slate-600">
          <span>{verTudo ? 'Fotografia inteira.' : 'Vista enquadrada no contorno.'}</span>
          <button type="button" className="btn-quiet btn-sm" onClick={() => setVerTudo((v) => !v)}>
            {verTudo ? 'Enquadrar no contorno' : 'Ver a fotografia inteira'}
          </button>
        </div>
      )}
      <Moldura
        fundo={<canvas ref={canvasRef} className="block max-h-[70vh] w-auto max-w-full" aria-label="Fachada endireitada, à escala" />}
      >
        <CamadaDeToque
          largura={vista.width}
          altura={vista.height}
          ativo
          lupa={canvasRef.current ?? undefined}
          onCancelar={() => {
            gesto.current = null;
            setArrasto(null);
            setEdicao(null);
            setLinhaAcerto(null);
          }}
          onArrastar={(de, ate, fim, unidades) => {
            if (modoAcerto) {
              if (!fim) return setLinhaAcerto({ de, ate });
              setLinhaAcerto(null);
              const [a, b] = [metros(de), metros(ate)];
              if (Math.hypot(b.x - a.x, b.y - a.y) >= 1) onAcerto(a, b);
              return;
            }
            if (soToques) {
              if (fim && Math.hypot(ate.x - de.x, ate.y - de.y) <= FOLGA_TOQUE_PX * unidades) tocar(metros(de), unidades);
              return;
            }
            if (!gesto.current) gesto.current = decidir(de, unidades);
            const g = gesto.current;
            if (fim) gesto.current = null;
            if ('id' in g) {
              const original = zonas.find((z) => z.id === g.id);
              if (!original) return setEdicao(null);
              const [a, b] = [metros(de), metros(ate)];
              const nova = deslocarArestas(original, g.arestas, { x: b.x - a.x, y: b.y - a.y });
              const parado = Math.hypot(ate.x - de.x, ate.y - de.y) <= FOLGA_TOQUE_PX * unidades;
              if (!fim) return setEdicao(nova);
              setEdicao(null);
              // Largar sem ter arrastado é um toque: larga a escolha, ou escolhe a zona vizinha.
              if (parado) return tocar(metros(de), unidades);
              onAlterarZona(nova);
              return;
            }
            if (!fim) return setArrasto({ de, ate });
            setArrasto(null);
            if (Math.hypot(ate.x - de.x, ate.y - de.y) <= FOLGA_TOQUE_PX * unidades) return tocar(metros(de), unidades);
            const a = metros(de);
            const b = metros(ate);
            if (Math.abs(a.x - b.x) >= LADO_MINIMO_M && Math.abs(a.y - b.y) >= LADO_MINIMO_M) onDesenho(a, b);
          }}
        >
          {grelha}
          <rect
            x={px(0)}
            y={py(referencia.alturaM)}
            width={referencia.larguraM * ppm}
            height={referencia.alturaM * ppm}
            fill="none"
            className="stroke-fuchsia-500"
            strokeWidth={letra / 5}
            strokeDasharray={`${letra / 2} ${letra / 3}`}
            style={{ pointerEvents: 'none' }}
          />
          {zonas.map((z) => (
            <g key={z.id} opacity={z.tipo === tipo || z.tipo === 'fachada' ? 1 : 0.55}>
              {retangulo(edicao?.id === z.id ? edicao : z, z.tipo, z.id, true)}
            </g>
          ))}
          {selecionada &&
            (() => {
              const z = edicao?.id === selecionada.id ? edicao : selecionada;
              const lado = letra * 0.7;
              const cantos = [
                [z.x, z.y],
                [z.x + z.largura, z.y],
                [z.x + z.largura, z.y + z.altura],
                [z.x, z.y + z.altura],
              ];
              return (
                <g style={{ pointerEvents: 'none' }}>
                  <rect
                    x={px(z.x)}
                    y={py(z.y + z.altura)}
                    width={z.largura * ppm}
                    height={z.altura * ppm}
                    fill="none"
                    className="stroke-white"
                    strokeWidth={letra / 4}
                    strokeDasharray={`${letra / 2} ${letra / 3}`}
                  />
                  {cantos.map(([x, y], i) => (
                    <rect
                      key={i}
                      x={px(x!) - lado / 2}
                      y={py(y!) - lado / 2}
                      width={lado}
                      height={lado}
                      className={`fill-white ${COR[z.tipo].stroke}`}
                      strokeWidth={letra / 6}
                    />
                  ))}
                </g>
              );
            })()}
          {previas.map((z) => (
            <polygon
              key={z.id}
              points={pontos(z)}
              className={`${COR[z.tipo].fill} ${COR[z.tipo].stroke}`}
              strokeWidth={letra / 6}
              strokeDasharray={`${letra / 2} ${letra / 3}`}
              style={{ pointerEvents: 'none' }}
            />
          ))}
          {temp && retangulo(temp, tipo, 'temp', true)}
          {propostas.map((z) => (
            <g key={z.id} style={{ pointerEvents: 'none' }}>
              <polygon
                points={pontos(z)}
                className="fill-violet-500/20 stroke-violet-600"
                strokeWidth={letra / 5}
                strokeDasharray={`${letra / 2} ${letra / 3}`}
              />
            </g>
          ))}
          {arestasNaVista.map((a) => (
            <g key={a.id} style={{ pointerEvents: 'none' }}>
              <TracoDaAresta de={a.de} ate={a.ate} />
              {[a.de, a.ate].map((q, i) => (
                <circle key={i} cx={q.x} cy={q.y} r={letra / 3} className="fill-cyan-300 stroke-slate-900" strokeWidth={letra / 10} />
              ))}
            </g>
          ))}
          {linhaAcerto && (
            <line
              x1={linhaAcerto.de.x}
              y1={linhaAcerto.de.y}
              x2={linhaAcerto.ate.x}
              y2={linhaAcerto.ate.y}
              className="stroke-fuchsia-500"
              strokeWidth={letra / 4}
              strokeDasharray={`${letra / 2} ${letra / 3}`}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </CamadaDeToque>
      </Moldura>
      {arestasNaVista.length > 0 && <LegendaDasArestas />}
    </div>
  );
}

/**
 * O traço de uma aresta proposta: uma faixa escura contínua e, por cima, um tracejado ciano. Em
 * píxeis de ecrã (`vector-effect: non-scaling-stroke`), com a mesma espessura no telemóvel e no
 * computador. Sobre uma parede clara quem dá o contraste é a faixa escura (slate-900 opaco, ~17:1
 * contra o branco), sobre uma escura é o ciano (≥ 4:1 contra slate-900); a avaliação de 04/11/2026
 * mediu o contorno a 60 % — 2,6:1 no pior ponto, metade da reta de cima abaixo de 3:1 — e 1,4 px de
 * ciano no telemóvel.
 */
function TracoDaAresta({ de, ate }: { de: Ponto; ate: Ponto }) {
  return (
    <>
      <line
        x1={de.x}
        y1={de.y}
        x2={ate.x}
        y2={ate.y}
        className="stroke-slate-900"
        strokeOpacity={0.9}
        strokeWidth={6}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={de.x}
        y1={de.y}
        x2={ate.x}
        y2={ate.y}
        className="stroke-cyan-300"
        strokeWidth={3}
        strokeDasharray="12 6"
        vectorEffect="non-scaling-stroke"
      />
    </>
  );
}

/** A legenda das arestas propostas, por baixo da vista. */
function LegendaDasArestas() {
  return (
    <p className="flex items-center gap-2 text-[13px] text-slate-600">
      <svg width="28" height="8" viewBox="0 0 28 8" className="shrink-0" aria-hidden>
        <TracoDaAresta de={{ x: 3, y: 4 }} ate={{ x: 25, y: 4 }} />
      </svg>
      Aresta proposta — tocar nela para a tirar
    </p>
  );
}

/** As zonas desenhadas, levadas de volta à fotografia original — tem de bater certo com o prédio. */
function VistaOriginal({
  foto,
  calibracao,
  zonas,
  arestas,
}: {
  foto: Foto;
  calibracao: Calibracao;
  zonas: Zona[];
  /** As arestas propostas, à espera de confirmação: aqui só se veem (tiram-se na vista endireitada). */
  arestas: { id: string; a: Ponto; b: Ponto }[];
}) {
  const escala = Math.max(foto.largura, foto.altura) / 900;
  return (
    <Moldura
      fundo={
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={foto.url}
          alt="Fotografia original com o desenho"
          draggable={false}
          className="block max-h-[70vh] w-auto max-w-full select-none"
        />
      }
    >
      <svg viewBox={`0 0 ${foto.largura} ${foto.altura}`} className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
        {zonas.map((z) => {
          const vertices = verticesDaZona(z);
          const pts = vertices.map((p) => aplicar(calibracao.planoParaImagem, p)).filter((p): p is Ponto => !!p);
          if (pts.length < vertices.length) return null;
          return (
            <polygon
              key={z.id}
              points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
              className={`${COR[z.tipo].fill} ${COR[z.tipo].stroke}`}
              strokeWidth={3 * escala}
            />
          );
        })}
        {arestas.map((a) => (
          <TracoDaAresta key={a.id} de={a.a} ate={a.b} />
        ))}
      </svg>
    </Moldura>
  );
}

/**
 * A prova dos nove da escala: a distância entre janelas de pisos seguidos não depende da referência
 * só por si, e tem um valor habitual. A altura total explica-se por partes (R/C, pisos, o que sobra
 * por cima) — foi a dúvida do promotor no primeiro teste ("R/C + 5 andares não pode ter 20 m").
 */
function LeituraDasAlturas({ zonas, alturaM }: { zonas: Zona[]; alturaM: number }) {
  const l = leituraDeAlturas(zonas);
  if (!l) {
    return (
      <p className="mt-1 text-[13px] text-slate-500">
        Para conferir a escala pela altura entre pisos, desenhar a mesma janela em dois pisos seguidos (em série é mais rápido).
      </p>
    );
  }
  const habitual = l.entrePisosM >= ENTRE_PISOS_HABITUAL_M.min && l.entrePisosM <= ENTRE_PISOS_HABITUAL_M.max;
  const acima = l.rcM !== null ? alturaM - l.rcM - l.pisos * l.entrePisosM : null;
  return (
    <div className="mt-2 space-y-1 text-[15px] text-slate-600">
      <p>
        Altura entre pisos, medida pelas janelas: <span className="font-mono tabular-nums text-slate-900">{m(l.entrePisosM)} m</span>{' '}
        <span className="text-[13px] text-slate-500">
          ({l.medicoes} {l.medicoes === 1 ? 'medição' : 'medições'}; habitual {m(ENTRE_PISOS_HABITUAL_M.min)} a{' '}
          {m(ENTRE_PISOS_HABITUAL_M.max)} m, com a laje)
        </span>
      </p>
      {acima !== null && l.rcM !== null && acima > -0.5 && acima < 4 && (
        <p>
          {m(alturaM)} m = R/C <span className="font-mono tabular-nums">{m(l.rcM)}</span> + {l.pisos} pisos ×{' '}
          <span className="font-mono tabular-nums">{m(l.entrePisosM)}</span> +{' '}
          <span className="font-mono tabular-nums">{m(Math.max(0, acima))}</span> m acima do último piso (platibanda, cobertura).
        </p>
      )}
      {!habitual && (
        <p className="font-medium text-amber-800">
          Fora do habitual: confirmar a medida da referência (largura e altura em cm) e os cantos tocados no passo 2.
        </p>
      )}
    </div>
  );
}

function PassoResultado(props: {
  resultado: ResultadoFachada;
  /** A margem de erro da área a pintar desta fachada (`margemDaArea`); nula se não se pôde calcular. */
  margem: MargemDaArea | null;
  /** A margem ainda é a das opções de antes da última tecla: refaz-se a seguir. */
  margemACalcular: boolean;
  /** As arestas que entram na calibração, para dizer o que reduz a margem. */
  arestasMarcadas: ArestasMarcadas;
  zonas: Zona[];
  /** Correção da perspetiva das frentes salientes: indefinida sem saliência; nula se a fotografia não a permite. */
  correcao: { distanciaM: number; oQue: string } | null | undefined;
  salienciaVaranda: string;
  setSalienciaVaranda: (v: string) => void;
  /** Resumo das medidas de controlo do passo 2 (ou o aviso de que não há nenhuma). */
  controlo: string | null;
  /** Para a vista «Conferir a área»: a fotografia endireitada com as zonas tal como foram desenhadas. */
  conferir: { foto: Foto; calibracao: Calibracao; referencia: ReferenciaRetangular; zonas: Zona[] } | null;
  incluirRC: boolean;
  setIncluirRC: (v: boolean) => void;
  saliencia: string;
  setSaliencia: (v: string) => void;
  vidrosLaterais: string;
  setVidrosLaterais: (v: string) => void;
  impermeabilizacao: string | null;
  setImpermeabilizacao: (v: string) => void;
  nome: string;
  setNome: (v: string) => void;
  frente: string;
  setFrente: (v: string) => void;
  fundo: string;
  setFundo: (v: string) => void;
  guardadas: FachadaGuardada[];
  onVoltar: () => void;
  onOutraFachada: () => void;
}) {
  const { resultado: r, zonas } = props;
  // O aviso dos 5 % decide-se aqui pela área que vai para o orçamento, e não só pelo contorno do passo
  // 3: com o R/C excluído ou as saliências, a margem relativa muda (5,0 % no passo 3, 6,2 % aqui).
  const sugestaoDaMargem = props.margem && !props.margemACalcular ? comoReduzirAMargem(props.margem, props.arestasMarcadas, 4) : null;
  const temRC = zonas.some((z) => z.tipo === 'rc');
  const temMarquises = zonas.some((z) => z.tipo === 'marquise');
  const substitui = props.nome !== 'Outra' && props.guardadas.some((g) => g.nome === props.nome);
  const todas = [
    ...props.guardadas
      .filter((g) => !(substitui && g.nome === props.nome))
      .map((g) => ({ nome: g.nome, resultado: g.resultado, margemM2: g.margemM2 })),
    { nome: props.nome, resultado: r, margemM2: props.margem?.margemM2 ?? null },
  ];
  const totalPredio = todas.reduce((s, f) => s + f.resultado.pintavelM2, 0);
  // Fachadas diferentes, fotografias e toques diferentes: as margens combinam-se em quadratura.
  const margemPredioM2 = margemCombinada(todas.map((f) => f.margemM2));
  const faltaNoPredio = todas.filter((f) => f.resultado.porMedir.length > 0);

  // O volume: cada fachada medida vai para a sua parede; a última medida de cada lado é a que conta.
  const medidas = [
    ...props.guardadas,
    { nome: props.nome, resultado: r, zonas, salienciaM: numero(props.saliencia), salienciaVarandaM: numero(props.salienciaVaranda) },
  ];
  const porLado = new Map<
    Lado,
    { resultado: ResultadoFachada; zonas: Zona[]; salienciaM: number | null; salienciaVarandaM: number | null }
  >();
  for (const f of medidas) {
    const lado = LADO_DO_NOME[f.nome];
    if (lado && f.resultado.temContorno) porLado.set(lado, f);
  }
  const faces: FaceMedida[] = [...porLado].map(([lado, f]) => ({
    lado,
    zonas: f.zonas,
    ...(f.salienciaM ? { salienciaMarquiseM: f.salienciaM } : {}),
    ...(f.salienciaVarandaM ? { salienciaVarandaM: f.salienciaVarandaM } : {}),
    ...(() => {
      const l = leituraDeAlturas(f.zonas);
      return l ? { entrePisosM: l.entrePisosM } : {};
    })(),
  }));
  const frenteMedida = (porLado.get('frente') ?? porLado.get('tras'))?.resultado.frenteM;
  const fundoMedido = (porLado.get('esquerda') ?? porLado.get('direita'))?.resultado.frenteM;
  const dimensao = (medida: number | undefined, indicada: string) => {
    if (medida) return { valor: medida, origem: 'medida' };
    const n = numero(indicada);
    return n ? { valor: n, origem: 'indicada' } : { valor: 10, origem: 'por medir, desenhado com 10 m' };
  };
  const W = dimensao(frenteMedida, props.frente);
  const D = dimensao(fundoMedido, props.fundo);
  const H = Math.max(r.alturaM, ...[...porLado.values()].map((f) => f.resultado.alturaM));

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-[17px] font-semibold text-slate-900">Áreas e volume</h2>

      {substitui && (
        <p className="text-[15px] text-slate-600">
          Já há uma «{props.nome}» guardada: ao guardar, esta substitui-a — a mesma fachada nunca se soma duas vezes. Para a segunda parte
          de uma fachada comprida, escolher «Outra».
        </p>
      )}
      <label className="block max-w-xs">
        <span className="mb-1 block text-[15px] font-medium text-slate-700">Esta fachada é a</span>
        <select className="campo" value={props.nome} onChange={(e) => props.setNome(e.target.value)}>
          {NOMES_DE_FACHADA.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>

      <div>
        <p className="text-[15px] text-slate-600">
          Contorno medido: <span className="font-mono tabular-nums text-slate-900">{m(r.frenteM)} m</span> de largura ×{' '}
          <span className="font-mono tabular-nums text-slate-900">{m(r.alturaM)} m</span> de altura.
        </p>
        <LeituraDasAlturas zonas={zonas} alturaM={r.alturaM} />
        <ul className="mt-3 space-y-2">
          {r.linhas.map((l) => (
            <li key={l.rotulo} className="flex items-start justify-between gap-3 text-[17px]">
              <span className="flex items-start gap-2 text-slate-700">
                <span className={`mt-2 inline-block h-3 w-3 shrink-0 rounded-full ${COR[l.tipo].bg}`} />
                <span>
                  {l.rotulo}
                  {l.nota && <span className="block text-[13px] text-slate-500">{l.nota}</span>}
                </span>
              </span>
              <span className="whitespace-nowrap font-mono tabular-nums text-slate-900">
                {l.porMedir ? (
                  <span className="font-sans text-[15px] text-slate-500">por medir</span>
                ) : (
                  <>
                    {l.efeito === 'desconta' || l.efeito === 'fora' ? '− ' : l.efeito === 'acrescenta' ? '+ ' : ''}
                    {m(l.areaM2)} m²
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
        {temMarquises && (
          <label className="mt-3 block max-w-xs">
            <span className="mb-1 block text-[15px] font-medium text-slate-700">Quanto as marquises saem da parede (m)</span>
            <input
              className="campo"
              inputMode="decimal"
              placeholder="por medir"
              value={props.saliencia}
              onChange={(e) => props.setSaliencia(e.target.value)}
            />
            <span className="mt-1 block text-[13px] text-slate-500">
              Medido à fita, de lado. Dá as paredes laterais, o tecto e a cobertura.
            </span>
          </label>
        )}
        {temMarquises && (
          <label className="mt-3 block max-w-xs">
            <span className="mb-1 block text-[15px] font-medium text-slate-700">Vidros nas paredes laterais, ao todo (m²)</span>
            <input
              className="campo"
              inputMode="decimal"
              placeholder="0"
              value={props.vidrosLaterais}
              onChange={(e) => props.setVidrosLaterais(e.target.value)}
            />
            <span className="mt-1 block text-[13px] text-slate-500">Não se veem de frente: medir no local, se houver.</span>
          </label>
        )}
        {props.correcao !== undefined && (
          <p className="mt-2 text-[13px] text-slate-500">
            {props.correcao
              ? `${props.correcao.oQue}: corrigidas da perspetiva — a frente está mais perto da câmara (a ${m(props.correcao.distanciaM)} m da fachada) e aparecia maior no desenho.`
              : 'Sem correção da perspetiva das frentes salientes: a fotografia está quase de frente. Contam como desenhadas.'}
          </p>
        )}
        {zonas.some((z) => z.tipo === 'varanda') && (
          <label className="mt-3 block max-w-xs">
            <span className="mb-1 block text-[15px] font-medium text-slate-700">Quanto as varandas saem da parede (m)</span>
            <input
              className="campo"
              inputMode="decimal"
              placeholder="por medir"
              value={props.salienciaVaranda}
              onChange={(e) => props.setSalienciaVaranda(e.target.value)}
            />
            <span className="mt-1 block text-[13px] text-slate-500">
              Medido à fita, de lado. Corrige o tamanho da coluna de varandas e desenha-as no volume, uma por piso.
            </span>
          </label>
        )}
        {r.coberturasSalientes.existem && (
          <div className="mt-4 space-y-2" role="radiogroup" aria-label="Cobertura das marquises">
            <p className="text-[15px] font-medium text-slate-700">
              Cobertura das marquises, sem telha: como se trata?
              <span className="block text-[13px] font-normal text-slate-500">
                Corpos salientes sem telha: a pergunta da impermeabilização é para o cliente, o avaliador e o pintor.
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {IMPERMEABILIZACAO.map((o) => (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={props.impermeabilizacao === o}
                  className={props.impermeabilizacao === o ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
                  onClick={() => props.setImpermeabilizacao(o)}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        )}
        {temRC && (
          <label className="mt-2 flex min-h-[44px] items-center gap-2 text-[15px] text-slate-700">
            <input type="checkbox" className="h-5 w-5" checked={!props.incluirRC} onChange={(e) => props.setIncluirRC(!e.target.checked)} />
            Excluir o R/C da área a pintar (por exemplo, se as lojas tratam da sua frente)
          </label>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-[17px] font-semibold">
          <span>{r.porMedir.length > 0 ? 'Subtotal a pintar nesta fachada' : 'A pintar nesta fachada'}</span>
          <span className="font-mono tabular-nums">{m(r.pintavelM2)} m²</span>
        </div>
        <LinhaDaMargem margem={props.margem} aCalcular={props.margemACalcular} rotulo="O que a margem de erro cobre">
          Quanto a área pode estar errada só pelos toques na fotografia (os cantos da referência e as pontas das arestas). Conta com cerca
          de um píxel de erro em cada toque — uma estimativa, ainda não medida em obra: assim, e com o desenho certo, a área verdadeira fica
          dentro da margem em cerca de 95 casos em 100. As arestas traçadas no telemóvel costumam errar mais, e aí a margem verdadeira é
          maior. Não cobre medidas da referência mal escritas, uma referência fora do plano da parede (uma porta recuada), um canto que o
          íman prendeu no aro, a distorção da lente, as medidas à fita nem o que falta medir; os erros de escala apanham-se com as medidas
          de controlo do passo 2. Reduz-se com uma referência maior (passo 2) e acertando o endireitamento com uma vertical comprida e duas
          horizontais a alturas diferentes (passo 3). Indisponível quando um píxel num canto já não dá uma calibração.
        </LinhaDaMargem>
        {sugestaoDaMargem && <p className="mt-1 text-[15px] font-medium text-amber-800">{sugestaoDaMargem}</p>}
        {r.porMedir.length > 0 && (
          <p className="mt-1 text-[15px] font-medium text-amber-800">
            É um subtotal: falta {r.porMedir.join('; ')}. O que falta entra a zero até ser medido.
          </p>
        )}
        {props.controlo && <p className="mt-1 text-[13px] text-slate-500">{props.controlo}</p>}
        {r.avisos.map((a) => (
          <p key={a} className="mt-2 text-[13px] text-amber-800">
            {a}
          </p>
        ))}
      </div>

      {props.conferir && (
        <div className="space-y-2 border-t border-slate-200 pt-4">
          <h3 className="text-[15px] font-semibold text-slate-900">Conferir a área</h3>
          <p className="max-w-[60ch] text-[15px] text-slate-600">
            O verde é o que se pinta. Se uma parte da fachada ficar sem verde, falta contorno; se o verde passar para fora do prédio, o
            contorno está grande. Paredes laterais, tecto e cobertura das marquises não se veem de frente: somam-se acima.
          </p>
          <ConferirArea
            foto={props.conferir.foto}
            calibracao={props.conferir.calibracao}
            referencia={props.conferir.referencia}
            zonas={props.conferir.zonas}
            incluirRC={props.incluirRC}
          />
        </div>
      )}

      {props.guardadas.length > 0 && (
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="text-[15px] font-semibold text-slate-900">Fachadas medidas</h3>
          <ul className="mt-2 space-y-1 text-[15px]">
            {todas.map((f, i) => (
              <li key={i} className="flex justify-between">
                <span className="text-slate-700">{f.nome}</span>
                <span className="font-mono tabular-nums">{m(f.resultado.pintavelM2)} m²</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-[17px] font-semibold">
            <span>{faltaNoPredio.length > 0 ? 'Subtotal do prédio' : 'Total do prédio'}</span>
            <span className="font-mono tabular-nums">{m(totalPredio)} m²</span>
          </div>
          <LinhaDaMargem
            margem={
              margemPredioM2 === null
                ? null
                : {
                    margemM2: margemPredioM2,
                    areaM2: totalPredio,
                  }
            }
            rotulo="Como se soma a margem do prédio"
          >
            Cada fachada tem a sua fotografia e os seus toques, e os erros de umas não se juntam aos das outras: as margens combinam-se pela
            raiz da soma dos quadrados, e a do prédio sai menor do que a soma das margens. Cobre o mesmo que a margem de cada fachada. Fica
            indisponível quando alguma fachada não tem margem.
          </LinhaDaMargem>
          {faltaNoPredio.length > 0 && (
            <p className="mt-1 text-[13px] text-amber-800">
              Falta medir: {faltaNoPredio.map((f) => `${f.nome} — ${f.resultado.porMedir.join('; ')}`).join(' · ')}.
            </p>
          )}
        </div>
      )}

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <h3 className="text-[15px] font-semibold text-slate-900">Volume do prédio</h3>
        {(!frenteMedida || !fundoMedido) && (
          <div className="grid max-w-md gap-4 sm:grid-cols-2">
            {!frenteMedida && (
              <label className="block">
                <span className="mb-1 block text-[15px] font-medium text-slate-700">Frente (m)</span>
                <input
                  className="campo"
                  inputMode="decimal"
                  placeholder="por medir"
                  value={props.frente}
                  onChange={(e) => props.setFrente(e.target.value)}
                />
              </label>
            )}
            {!fundoMedido && (
              <label className="block">
                <span className="mb-1 block text-[15px] font-medium text-slate-700">Fundo (m)</span>
                <input
                  className="campo"
                  inputMode="decimal"
                  placeholder="por medir"
                  value={props.fundo}
                  onChange={(e) => props.setFundo(e.target.value)}
                />
              </label>
            )}
          </div>
        )}
        {faces.length > 0 ? (
          <Modelo3D faces={faces} larguraM={W.valor} fundoM={D.valor} alturaM={H} />
        ) : (
          <p className="text-[15px] text-slate-500">Escolher acima que fachada é esta para a pôr no volume.</p>
        )}
        <p className="text-[13px] text-slate-500">
          Frente {m(W.valor)} m ({W.origem}) · fundo {m(D.valor)} m ({D.origem}) · altura {m(H)} m (medida). Cada zona está no sítio e com o
          tamanho do desenho; as paredes a tracejado não foram medidas. Medindo uma lateral, o fundo passa a ser o dela.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-quiet btn-sm" onClick={props.onVoltar}>
          Voltar ao desenho
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={props.onOutraFachada}>
          {substitui ? 'Guardar (substitui a anterior) e medir outra fachada' : 'Guardar e medir outra fachada'}
        </button>
      </div>
    </section>
  );
}
