'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { aplicar, calibrar, problemaDaReferencia, type Calibracao, type Ponto, type ReferenciaRetangular } from '@/domain/homografia';
import {
  areaDaZona,
  arestasPerto,
  areasDaFachada,
  contagemSugerida,
  LADO_MINIMO_M,
  moverArestas,
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
import { Dica } from '@/components/Dica';
import { Lupa } from './Lupa';
import { Modelo3D } from './Modelo3D';
import type { FaceMedida, Lado } from './modelo3d';
import { endireitar, enquadrarNoContorno, extensaoDoPlano, pixeisPorMetro, type Extensao } from './endireitar';

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
 * Tudo em estado local do browser: nada é gravado, nada sai do aparelho.
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
  onArrastar,
  children,
}: {
  largura: number;
  altura: number;
  ativo: boolean;
  lupa?: CanvasImageSource;
  onToque?: (p: Ponto) => void;
  onCancelar?: () => void;
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
      {ativo && lupa && cursor && <Lupa fonte={lupa} ponto={cursor.p} cursorCss={cursor.css} />}
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
}

export function MedirFachada() {
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

  // As zonas e as versões anteriores, juntas: "Desfazer" volta à anterior, seja o que for que mudou
  // (zona nova, série, aresta acertada, zona apagada).
  const [desenho, setDesenho] = useState<{ zonas: Zona[]; anteriores: Zona[][] }>({ zonas: [], anteriores: [] });
  const zonas = desenho.zonas;
  const mudarZonas = (f: (zs: Zona[]) => Zona[]) =>
    setDesenho((d) => ({ zonas: f(d.zonas), anteriores: [...d.anteriores.slice(-99), d.zonas] }));
  const desfazer = () =>
    setDesenho((d) => (d.anteriores.length ? { zonas: d.anteriores[d.anteriores.length - 1]!, anteriores: d.anteriores.slice(0, -1) } : d));
  const limparZonas = () => setDesenho({ zonas: [], anteriores: [] });

  // O R/C pinta-se por omissão (promotor, 04/11/2026); a saliência das marquises é medida à fita.
  const [incluirRC, setIncluirRC] = useState(true);
  const [saliencia, setSaliencia] = useState('');
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
  const calibracao: Calibracao | null = useMemo(() => {
    if (!referencia || problemaDaReferencia(referencia)) return null;
    try {
      return calibrar(referencia, arestas);
    } catch {
      return null;
    }
  }, [referencia, arestas]);

  const salienciaM = numero(saliencia);
  const resultado = useMemo(() => areasDaFachada(zonas, { incluirRC, salienciaMarquisesM: salienciaM }), [zonas, incluirRC, salienciaM]);

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
    limparZonas();
    setIncluirRC(true);
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
          setAMarcarAresta={setAMarcarAresta}
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
          onVoltar={() => setPasso(2)}
          onContinuar={() => setPasso(4)}
        />
      )}

      {passo === 4 && (
        <PassoResultado
          resultado={resultado}
          zonas={zonas}
          incluirRC={incluirRC}
          setIncluirRC={setIncluirRC}
          saliencia={saliencia}
          setSaliencia={setSaliencia}
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
            setGuardadas((gs) => [...gs, { id: Date.now(), nome, resultado, zonas }]);
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
      <polygon points={pontos} className="fill-current opacity-25 stroke-current" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

/** Como se diz cada tipo numa frase ("desenhar o primeiro vão"). */
const NOME_DO_ELEMENTO: Record<TipoZona, string> = {
  fachada: 'contorno',
  vao: 'vão',
  marquise: 'marquise',
  varanda: 'varanda',
  rc: 'R/C',
};

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
  const [serie, setSerie] = useState<SeriePendente | null>(null);
  const [verOriginal, setVerOriginal] = useState(false);

  // Sem contorno só se desenha contorno (o promotor desenhou 35 zonas sem ele e não conseguia
  // avançar, 04/11/2026): o contorno é a base de todas as contas e do enquadramento da vista.
  const tipoAtivo: TipoZona = temContorno ? tipo : 'fachada';
  const emSerie = modo === 'serie' && tipoAtivo !== 'fachada';
  const elemento = NOME_DO_ELEMENTO[tipoAtivo];
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
  if (!temContorno)
    instrucao = (
      <>
        <strong>Primeiro, o contorno:</strong> arrastar à volta da parede toda, do chão ao telhado. Os outros tipos abrem a seguir.
      </>
    );
  else if (emSerie && !serie)
    instrucao = (
      <>
        Desenhar o <strong>primeiro</strong> {elemento} da série — por exemplo, o do piso de baixo.
      </>
    );
  else if (emSerie && serie && !serie.ultima)
    instrucao = (
      <>
        Agora o <strong>último</strong> {elemento} da série — o do piso de cima na mesma coluna, ou o da outra ponta da linha.
      </>
    );
  else if (emSerie) instrucao = <>Quantos são ao todo?</>;
  else if (selecionada) instrucao = <>Arrastar uma aresta (ou um canto) da zona escolhida para a acertar. Tocar fora dela para largar.</>;
  else
    instrucao = (
      <>
        Arrastar para desenhar {tipoAtivo === 'fachada' ? 'outro contorno (um recuo, um triângulo)' : `um ${elemento}`}. Para acertar um que
        já está desenhado, tocar nele.
      </>
    );

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-[17px] font-semibold text-slate-900">
        Desenhar o prédio
        <Dica rotulo="Como desenhar">
          A fotografia já está endireitada e à escala — cada quadrado da grelha é 1 m. Confirmar que as arestas verticais do prédio ficaram
          verticais; se não ficaram, voltar e acertar os cantos da referência. Varandas e marquises saem da parede e por isso aparecem
          maiores e inclinadas: desenhá-las pela linha onde encostam à parede. Os vidros das marquises e as montras do R/C desenham-se como
          vãos — é assim que se descontam. Janelas repetidas de piso para piso desenham-se depressa em série: o primeiro, o último, e
          quantos são.
        </Dica>
      </h2>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo da zona a desenhar">
        {ORDEM_DOS_TIPOS.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={tipoAtivo === t}
            disabled={t !== 'fachada' && !temContorno}
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

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[15px] text-slate-700" aria-live="polite">
          {instrucao}
        </p>
        <button
          type="button"
          className="btn-quiet btn-sm"
          disabled={!podeDesfazer && !serie}
          onClick={() => (serie ? setSerie(null) : desfazer())}
        >
          Desfazer
        </button>
        {selecionada && (
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

      {emSerie && serie?.ultima && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 p-3">
          <label className="block">
            <span className="mb-1 block text-[15px] font-medium text-slate-700">Quantos ao todo, com o primeiro e o último</span>
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

      {verOriginal ? (
        <VistaOriginal foto={foto} calibracao={calibracao} zonas={zonas} />
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
          previas={previas}
          onDesenho={aoDesenhar}
          onAlterarZona={(nova) => mudarZonas((zs) => zs.map((z) => (z.id === nova.id ? nova : z)))}
        />
      )}

      <label className="flex min-h-[44px] items-center gap-2 text-[15px] text-slate-700">
        <input type="checkbox" className="h-5 w-5" checked={verOriginal} onChange={(e) => setVerOriginal(e.target.checked)} />
        Ver o desenho sobre a fotografia original
      </label>

      <ListaDeZonas zonas={zonas} onApagar={(id) => mudarZonas((zs) => zs.filter((x) => x.id !== id))} />

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-quiet btn-sm" onClick={onVoltar}>
          Voltar à referência
        </button>
        <button type="button" className="btn-primary btn-sm" disabled={!temContorno} onClick={onContinuar}>
          Ver áreas e volume
        </button>
      </div>
    </section>
  );
}

/**
 * As zonas agrupadas por tipo: quantas e quanto somam, à vista; o detalhe (e o "Apagar") abre-se.
 * Com 35 zonas numa lista corrida, o promotor tinha de descer o ecrã inteiro para chegar ao botão.
 */
function ListaDeZonas({ zonas, onApagar }: { zonas: Zona[]; onApagar: (id: string) => void }) {
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
              <span className="text-slate-700">{TIPO_ZONA_LABELS[t]}</span>
              <span className="text-slate-500">· {doTipo.length}</span>
              <span className="ml-auto font-mono tabular-nums text-slate-900">{m(soma)} m²</span>
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
                  <button type="button" className="btn-quiet btn-sm" onClick={() => onApagar(z.id)}>
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
  problema: string | null;
  pronta: boolean;
  onVoltar: () => void;
  onContinuar: () => void;
}) {
  const { foto, cantos, arestas, arestaPendente, aMarcarAresta } = props;
  const escala = Math.max(foto.largura, foto.altura) / 900;
  const aMarcarCantos = cantos.length < 4;
  const ativo = aMarcarCantos || aMarcarAresta;

  const tocar = (p: Ponto) => {
    if (aMarcarCantos) {
      props.setCantos((c) => (c.length >= 4 ? c : [...c, p]));
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
    if (arestaPendente) return props.setArestaPendente(null);
    if (arestas.length > 0 && !aMarcarCantos) return props.setArestas((a) => a.slice(0, -1));
    props.setCantos((c) => c.slice(0, -1));
  };

  let instrucao: ReactNode;
  if (aMarcarCantos)
    instrucao = (
      <>
        Tocar no canto <strong>{ORDEM_DOS_CANTOS[cantos.length]}</strong> da referência.
      </>
    );
  else if (aMarcarAresta)
    instrucao = arestaPendente ? (
      <>
        Tocar no <strong>outro extremo</strong> da aresta.
      </>
    ) : (
      <>Tocar num extremo de uma aresta vertical comprida do prédio.</>
    );
  else instrucao = <>Cantos marcados.</>;

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-[17px] font-semibold text-slate-900">Referência medida</h2>
      <p className="max-w-[60ch] text-[15px] text-slate-600">
        Tocar nos 4 cantos de algo retangular que se mediu com fita, na própria fachada — uma porta, uma janela, uma montra — por esta
        ordem: inferior esquerdo, inferior direito, superior direito, superior esquerdo. Carregar e arrastar mostra a lupa; o ponto fica
        onde se largar.
      </p>
      <p className="max-w-[60ch] text-[13px] text-slate-500">
        A referência tem de estar no plano da parede: numa entrada recuada, os cantos da abertura na parede, não os da porta lá dentro.
      </p>

      <Moldura
        fundo={
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto.url} alt="Fotografia da fachada" draggable={false} className="block max-h-[70vh] w-auto max-w-full select-none" />
        }
      >
        <CamadaDeToque largura={foto.largura} altura={foto.altura} ativo={ativo} lupa={foto.canvas} onToque={tocar}>
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
        </CamadaDeToque>
      </Moldura>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[15px] text-slate-700">{instrucao}</p>
        {(cantos.length > 0 || arestas.length > 0) && (
          <button type="button" className="btn-quiet btn-sm" onClick={desfazer}>
            Desfazer último ponto
          </button>
        )}
      </div>

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
            <strong>Recomendado:</strong> marcar também uma aresta vertical comprida do prédio — um canto, um tubo de queda — do ponto mais
            baixo ao mais alto que se vê. A referência é curta e o prédio é alto; com uma aresta comprida, as alturas ficam cerca de quatro
            vezes mais precisas.
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

function FachadaEndireitada({
  foto,
  calibracao,
  referencia,
  zonas,
  tipo,
  canto,
  selecionada,
  onSelecionar,
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
  /** Pré-visualização de uma série por confirmar, a tracejado. */
  previas: Zona[];
  onDesenho: (a: Ponto, b: Ponto) => void;
  onAlterarZona: (z: Zona) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [verTudo, setVerTudo] = useState(false);
  const total: Extensao = useMemo(() => extensaoDoPlano(calibracao, foto.largura, foto.altura, referencia), [foto, calibracao, referencia]);
  const enquadrada = useMemo(() => enquadrarNoContorno(zonas, total), [zonas, total]);
  const temContorno = enquadrada !== total;
  const alvo = verTudo || !temContorno ? total : enquadrada;
  // A vista só se refaz quando o enquadramento muda (um contorno novo), não a cada vão desenhado.
  const chave = [alvo.x0, alvo.x1, alvo.y0, alvo.y1].map((n) => n.toFixed(3)).join(' ');
  const { ext, ppm, vista } = useMemo(() => {
    const p = pixeisPorMetro(alvo, 1000, 1500);
    return {
      ext: alvo,
      ppm: p,
      vista: endireitar(foto.pixeis, calibracao.planoParaImagem, alvo, p),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foto, calibracao, chave]);
  const [arrasto, setArrasto] = useState<{ de: Ponto; ate: Ponto } | null>(null);
  // O que o gesto em curso faz, decidido no primeiro movimento: desenhar uma zona nova, ou acertar
  // as arestas de uma zona do tipo escolhido que estejam a um dedo de onde se carregou.
  const gesto = useRef<{ novo: true } | { id: string; arestas: Aresta[] } | null>(null);
  const [edicao, setEdicao] = useState<Zona | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    c.width = vista.width;
    c.height = vista.height;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(vista.data), vista.width, vista.height), 0, 0);
  }, [vista]);

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

  /** Um toque (sem arrastar) escolhe a zona do tipo em curso que está por baixo, ou larga a escolha. */
  const tocar = (p: Ponto) => {
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
          }}
          onArrastar={(de, ate, fim, unidades) => {
            if (!gesto.current) gesto.current = decidir(de, unidades);
            const g = gesto.current;
            if (fim) gesto.current = null;
            if ('id' in g) {
              const original = zonas.find((z) => z.id === g.id);
              if (!original) return setEdicao(null);
              const nova = moverArestas(original, g.arestas, metros(ate));
              if (!fim) return setEdicao(nova);
              setEdicao(null);
              // Um toque sem arrastar numa aresta não muda nada (nem conta para o "Desfazer").
              if (Math.hypot(ate.x - de.x, ate.y - de.y) > 2 * unidades) onAlterarZona(nova);
              return;
            }
            if (!fim) return setArrasto({ de, ate });
            setArrasto(null);
            if (Math.hypot(ate.x - de.x, ate.y - de.y) <= 2 * unidades) return tocar(metros(de));
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
        </CamadaDeToque>
      </Moldura>
    </div>
  );
}

/** As zonas desenhadas, levadas de volta à fotografia original — tem de bater certo com o prédio. */
function VistaOriginal({ foto, calibracao, zonas }: { foto: Foto; calibracao: Calibracao; zonas: Zona[] }) {
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
  zonas: Zona[];
  incluirRC: boolean;
  setIncluirRC: (v: boolean) => void;
  saliencia: string;
  setSaliencia: (v: string) => void;
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
  const temRC = zonas.some((z) => z.tipo === 'rc');
  const temMarquises = zonas.some((z) => z.tipo === 'marquise');
  const todas = [...props.guardadas.map((g) => ({ nome: g.nome, resultado: g.resultado })), { nome: props.nome, resultado: r }];
  const totalPredio = todas.reduce((s, f) => s + f.resultado.pintavelM2, 0);

  // O volume: cada fachada medida vai para a sua parede; a última medida de cada lado é a que conta.
  const medidas = [...props.guardadas, { nome: props.nome, resultado: r, zonas }];
  const porLado = new Map<Lado, { resultado: ResultadoFachada; zonas: Zona[] }>();
  for (const f of medidas) {
    const lado = LADO_DO_NOME[f.nome];
    if (lado && f.resultado.temContorno) porLado.set(lado, f);
  }
  const faces: FaceMedida[] = [...porLado].map(([lado, f]) => ({ lado, zonas: f.zonas }));
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
            <span className="mt-1 block text-[13px] text-slate-500">Medido à fita, de lado. Dá as paredes laterais.</span>
          </label>
        )}
        {temRC && (
          <label className="mt-2 flex min-h-[44px] items-center gap-2 text-[15px] text-slate-700">
            <input type="checkbox" className="h-5 w-5" checked={!props.incluirRC} onChange={(e) => props.setIncluirRC(!e.target.checked)} />
            Excluir o R/C da área a pintar (por exemplo, se as lojas tratam da sua frente)
          </label>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-[17px] font-semibold">
          <span>A pintar nesta fachada</span>
          <span className="font-mono tabular-nums">{m(r.pintavelM2)} m²</span>
        </div>
        {r.avisos.map((a) => (
          <p key={a} className="mt-2 text-[13px] text-amber-800">
            {a}
          </p>
        ))}
      </div>

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
            <span>Total do prédio</span>
            <span className="font-mono tabular-nums">{m(totalPredio)} m²</span>
          </div>
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
          <Modelo3D faces={faces} larguraM={W.valor} fundoM={D.valor} alturaM={H} salienciaMarquiseM={props.saliencia} />
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
          Guardar e medir outra fachada
        </button>
      </div>
    </section>
  );
}
