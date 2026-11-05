'use client';

import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  colunaDasChamadas,
  desenharZonas,
  pranchetaLarga,
  sitiosParaAcrescentar,
  type DesenhoDasZonas,
  type EixoDaCota,
  type TipoNoDesenho,
  type ZonaNumerada,
} from '@/domain/prancheta';
import { MAX_ZONAS_COM_CHAMADAS } from '@/domain/chamadas';
import type { FaceKind, Volume } from '@/domain/volume';
import {
  CLASSE_DO_ESTADO,
  CartaoDaZona,
  Pino,
  TRACEJADO_DO_ESTADO,
  contaNoCartao,
  partesDoEstado,
  type EstadoNoDesenho,
  type ZonaNaLista,
} from './ZonasDoPedido';
import { nomeDaZona } from '@/domain/respostaDasZonas';

/**
 * O quadro das zonas do passo 2: o desenho do prédio e os cartões das zonas, ligados pelo número.
 *
 * ## Dois modos, e a base é a lista
 *
 * **Lista** (sempre): o desenho de um lado e os cartões empilhados do outro, no mesmo palco cinzento;
 * no telemóvel, um por cima do outro, e as cotas saem do desenho para uma linha por baixo (o prédio
 * fica maior). Por baixo das zonas do desenho, as que ele não mostra («Fora do desenho», sem número)
 * e, no fim, as excluídas («Fora do pedido», a cinzento, com «—» na área).
 *
 * **Chamadas** (só quando cabem): o palco cinzento a toda a largura, os cartões das zonas do pedido
 * por cima, à volta do desenho, cada um ligado ao seu número; as excluídas por baixo, em «Fora do
 * pedido», como no modo lista. Só com o contentor a partir de 1040 px (`globals.css`), até seis zonas
 * do pedido, todas com sítio no desenho, e só se `disporChamadas` aceitar a disposição — nenhuma
 * ligação cruza uma cota, corta uma face na diagonal ou atravessa a zona de outro número (juiz e
 * cético, 05/11/2026). Se não, fica a lista, que nunca falha.
 *
 * Os dois modos estão no HTML e o CSS escolhe: sem medir nada no servidor, o primeiro ecrã já vem no
 * modo certo. A largura medida no navegador só acerta a escala do desenho e as posições das chamadas.
 *
 * O desenho responde ao toque: um número abre a sua zona (é um botão, com 44 px de alvo), uma face
 * abre a zona que a pinta e acende-se com o rato por cima. No pedido vazio, «+ Fachada», «+ Empena» e
 * «+ Varandas» estão pousados nas faces (maqueta B).
 */

const LARGURA_INICIAL = 1052;

function useLarguraDoContentor() {
  const ref = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(LARGURA_INICIAL);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ler = () => {
      const w = el.clientWidth;
      // Escondido (o passo 2 fechado), a largura é 0: fica a última, para não desenhar para nada.
      if (w > 0) setLargura((a) => (Math.abs(a - w) > 0.5 ? w : a));
    };
    ler();
    const ro = new ResizeObserver(ler);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [largura, ref] as const;
}

const pct = (n: number, de: number) => `${((n / de) * 100).toFixed(3)}%`;

/** O enchimento de uma face: a zona que a pinta, no estado em que está; ou o desenho neutro. */
function classeDaFace(kind: FaceKind, estado: EstadoNoDesenho | null): { classe: string; tracejado?: string } {
  // As janelas e a porta estão na parede: o clique passa por elas para a face da zona.
  if (kind === 'janela') return { classe: 'pointer-events-none fill-white stroke-slate-400' };
  if (kind === 'porta') return { classe: 'pointer-events-none fill-slate-600 stroke-slate-700' };
  if (estado) return { classe: CLASSE_DO_ESTADO[estado], tracejado: TRACEJADO_DO_ESTADO[estado] };
  if (kind === 'topo') return { classe: 'fill-slate-200 stroke-slate-400' };
  if (kind === 'grade') return { classe: 'fill-white stroke-slate-500' };
  return { classe: 'fill-white stroke-slate-400' };
}

/** As faces do volume, em unidades do desenho. Os traços não engrossam com a escala: 1 px é 1 px. */
function Faces({
  volume,
  d,
  estados,
  prefixo,
  tocar,
}: {
  volume: Volume;
  d: DesenhoDasZonas;
  estados: Record<string, EstadoNoDesenho>;
  prefixo: string;
  /** Com edição: carregar numa face abre a zona dela, e passar-lhe por cima acende-a. */
  tocar?: { aoAbrir: (id: string) => void; aoApontar: (id: string | null) => void };
}) {
  return (
    <>
      <defs>
        {volume.faces.map((f, i) =>
          f.fade ? (
            <linearGradient
              key={i}
              id={`${prefixo}-v${i}`}
              gradientUnits="userSpaceOnUse"
              x1={f.fade.de[0]}
              y1={f.fade.de[1]}
              x2={f.fade.ate[0]}
              y2={f.fade.ate[1]}
            >
              <stop offset="0" stopColor="#c9d2dc" stopOpacity="0.85" />
              <stop offset="0.6" stopColor="#dde3ea" stopOpacity="0.3" />
              <stop offset="1" stopColor="#dde3ea" stopOpacity="0" />
            </linearGradient>
          ) : null,
        )}
      </defs>
      {volume.faces.map((f, i) => {
        const pontos = f.points.map((p) => p.join(',')).join(' ');
        if (f.fade) return <polygon key={i} points={pontos} fill={`url(#${prefixo}-v${i})`} stroke="none" />;
        const zona = d.zonaDaFace[i];
        const estado = zona ? (estados[zona] ?? null) : null;
        const { classe, tracejado } = classeDaFace(f.kind, estado);
        const sensivel = tocar && zona;
        return (
          <polygon
            key={i}
            points={pontos}
            className={`${classe} ${sensivel ? 'cursor-pointer' : ''}`}
            strokeWidth={estado === 'aberta' ? 1.5 : 1}
            strokeDasharray={tracejado}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            {...(sensivel
              ? {
                  onClick: () => tocar.aoAbrir(zona),
                  onMouseEnter: () => tocar.aoApontar(zona),
                  onMouseLeave: () => tocar.aoApontar(null),
                }
              : {})}
          />
        );
      })}
    </>
  );
}

/** As cotas: a linha, as linhas de chamada a tracejado e um ponto em cada ponta. `px` converte para o sistema do SVG. */
function LinhasDasCotas({ d, px, ponto }: { d: DesenhoDasZonas; px: (p: [number, number]) => [number, number]; ponto: number }) {
  return (
    <g className="stroke-slate-500" fill="none">
      {d.cotas.map((c) => {
        const [a, b] = c.linha.map(px);
        return (
          <g key={c.eixo}>
            <line x1={a![0]} y1={a![1]} x2={b![0]} y2={b![1]} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            {c.chamadas.map(([p, q], i) => {
              const [p1, q1] = [px(p), px(q)];
              return (
                <line
                  key={i}
                  x1={p1[0]}
                  y1={p1[1]}
                  x2={q1[0]}
                  y2={q1[1]}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.7}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
            {[a!, b!].map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r={ponto} className="fill-slate-500" stroke="none" />
            ))}
          </g>
        );
      })}
    </g>
  );
}

/** O texto de uma cota: HTML por cima do desenho, para ficar a 13 px a qualquer escala. Cresce para longe do prédio. */
function RotuloDaCota({ x, y, texto, alinhar }: { x: string; y: string; texto: string; alinhar: 'centro' | 'esquerda' | 'direita' }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute -translate-y-1/2 whitespace-nowrap rounded bg-slate-50/90 px-1 text-[13px] tabular-nums text-slate-700 ${
        alinhar === 'centro' ? '-translate-x-1/2' : alinhar === 'direita' ? '-translate-x-full' : ''
      }`}
      style={{ left: x, top: y }}
    >
      {texto}
    </span>
  );
}

const ALTURA_MAXIMA_DO_DESENHO = 420;
/** Abaixo disto (o telemóvel), as cotas saem do desenho para uma linha por baixo: o prédio fica ~1,5× maior. */
const LARGURA_SEM_COTAS = 560;
/** O palco cinzento tem esta folga à volta dos cartões. */
const FOLGA_DO_PALCO = 12;

export interface PropsDoQuadro {
  requestId: string;
  volume: Volume;
  zonas: ZonaNaLista[];
  numeracao: ZonaNumerada[];
  textos: Partial<Record<EixoDaCota, string>>;
  /** A zona aberta no editor; a apontada (rato ou foco) acende-se como ela. */
  aberta: string | null;
  apontada: string | null;
  podeEditar: boolean;
  aoAbrir: (id: string) => void;
  aoApontar: (id: string | null) => void;
  /** O nome do desenho, para quem não o vê. */
  descricao: string;
  /** No telemóvel, os botões do passo vão para debaixo do desenho (no computador estão ao lado do total). */
  accoes?: ReactNode;
  /**
   * O pedido sem zonas: a lista dos tipos (no lugar dos cartões) e, quando se pode editar, o que
   * acrescentar tocando no próprio prédio.
   */
  vazio?: { lista: ReactNode; aoAcrescentar?: (tipo: TipoNoDesenho) => void };
}

/** A altura de um cartão compacto, para o primeiro desenho das chamadas; depois mede-se a verdadeira. */
function alturaEstimada(z: ZonaNaLista, coluna: number, podeEditar: boolean): number {
  const largo = coluna - 2 - 24 - 26 - 10;
  const linhas = (caracteres: number, px: number, livre: number) =>
    Math.min(2, Math.max(1, Math.ceil((caracteres * px) / Math.max(40, livre))));
  const area = z.participacao === 'excluida' || z.areaCm2 <= 0 ? 2 : String(z.areaCm2 / 100).length + 4;
  const nome = linhas(nomeDaZona(z).length, 9.4, largo - area * 9.4 - 12);
  const estado = linhas(partesDoEstado(z).reduce((n, p) => n + p.texto.length + 3, 0) + 3, 8.2, largo);
  const conta = contaNoCartao(z)?.expressao ? 21 : 0;
  const decisao = podeEditar && z.participacao !== 'incluida' ? 42 : 0;
  return 22 + 24 * nome + 21 * estado + conta + decisao;
}

const ROTULO_DO_TIPO: Record<TipoNoDesenho, string> = { fachada: 'Fachada', empena: 'Empena', varandas: 'Varandas' };
/** A chave da altura medida do bloco «Fora do pedido», ao lado das dos cartões. */
const RODAPE = '\u0000rodape';

export function QuadroDasZonas(p: PropsDoQuadro) {
  const [largura, ref] = useLarguraDoContentor();
  const prefixo = useId().replace(/:/g, '');
  const zonasDoDesenho = useMemo(() => p.zonas.map((z) => ({ id: z.id, kind: z.kind, participacao: z.participacao })), [p.zonas]);
  const numero = useMemo(() => Object.fromEntries(p.numeracao.map((n) => [n.id, n])), [p.numeracao]);
  const porId = useMemo(() => Object.fromEntries(p.zonas.map((z) => [z.id, z])), [p.zonas]);
  const estados: Record<string, EstadoNoDesenho> = {};
  for (const z of p.zonas) estados[z.id] = z.id === p.aberta || z.id === p.apontada ? 'aberta' : z.participacao;

  // O desenho do modo lista: a largura que lhe cabe decide a escala, e a escala o tamanho das cotas.
  // No telemóvel as cotas saem do desenho e vão para uma linha por baixo (cético, 05/11/2026: o prédio
  // ficava com 140 px de largura, espremido entre os textos das cotas).
  const estreito = largura < LARGURA_SEM_COTAS;
  const textosDaLista = useMemo(() => (estreito ? {} : p.textos), [estreito, p.textos]);
  const lista = useMemo(() => {
    const duasColunas = largura >= 720;
    const larguraDoDesenho = duasColunas ? ((largura - 2 * FOLGA_DO_PALCO - 20) * 1.15) / 2.15 : largura;
    let s = 16;
    let d = desenharZonas(p.volume, zonasDoDesenho, textosDaLista, s);
    for (let i = 0; i < 2; i++) {
      s = Math.min(larguraDoDesenho / d.caixa[2], ALTURA_MAXIMA_DO_DESENHO / d.caixa[3]);
      d = desenharZonas(p.volume, zonasDoDesenho, textosDaLista, s);
    }
    return { d, s };
  }, [largura, p.volume, zonasDoDesenho, textosDaLista]);
  const sitios = useMemo(() => (p.vazio?.aoAcrescentar ? sitiosParaAcrescentar(p.volume) : []), [p.vazio?.aoAcrescentar, p.volume]);

  // As chamadas: só as zonas do pedido têm cartão à volta, até seis e todas com sítio no desenho. As
  // excluídas ficam por baixo, em «Fora do pedido», como no modo lista.
  const doPedido = p.zonas.filter((z) => z.participacao !== 'excluida');
  const elegivel = doPedido.length > 0 && doPedido.length <= MAX_ZONAS_COM_CHAMADAS && doPedido.every((z) => numero[z.id]?.n != null);
  const larguraDasChamadas = Math.max(largura - 2 * FOLGA_DO_PALCO, 1016);
  const coluna = colunaDasChamadas(larguraDasChamadas);
  const [medidas, setMedidas] = useState<Record<string, number>>({});
  const alturas = useMemo(
    () => Object.fromEntries(p.zonas.map((z) => [z.id, medidas[z.id] ?? alturaEstimada(z, coluna, p.podeEditar)])),
    [p.zonas, medidas, coluna, p.podeEditar],
  );
  // O bloco «Fora do pedido»: o título e a nota (~74 px) e os cartões das excluídas.
  const excluidas = p.zonas.filter((z) => z.participacao === 'excluida');
  const alturaDoRodape = excluidas.length === 0 ? 0 : (medidas[RODAPE] ?? 74 + excluidas.reduce((n, z) => n + (alturas[z.id] ?? 0) + 8, 0));
  const larga = useMemo(
    () =>
      elegivel
        ? pranchetaLarga(p.volume, zonasDoDesenho, p.textos, {
            largura: larguraDasChamadas,
            alturas,
            alturaMaxima: 340,
            rodape: alturaDoRodape || undefined,
          })
        : null,
    [elegivel, p.volume, zonasDoDesenho, p.textos, larguraDasChamadas, alturas, alturaDoRodape],
  );
  const comChamadas = !!larga?.disposicao;

  // A altura verdadeira de cada cartão das chamadas, depois de desenhado (só quando estão à vista), e
  // outra vez quando chega a letra da marca, que muda a largura das palavras.
  const cartoes = useRef<Record<string, HTMLDivElement | null>>({});
  useLayoutEffect(() => {
    if (!comChamadas) return;
    const medir = () => {
      const novas: Record<string, number> = {};
      let mudou = false;
      for (const id of [...p.zonas.map((z) => z.id), RODAPE]) {
        const h = cartoes.current[id]?.offsetHeight ?? 0;
        const antes = id === RODAPE ? alturaDoRodape : (alturas[id] ?? 0);
        if (h > 0 && Math.abs(antes - h) > 1) {
          novas[id] = h;
          mudou = true;
        }
      }
      if (mudou) setMedidas((m) => ({ ...m, ...novas }));
    };
    medir();
    let vivo = true;
    void document.fonts?.ready.then(() => vivo && medir());
    return () => {
      vivo = false;
    };
  }, [comChamadas, p.zonas, alturas, alturaDoRodape, larga]);

  const cartao = (z: ZonaNaLista, compacto: boolean) => (
    <CartaoDaZona
      requestId={p.requestId}
      zona={z}
      n={numero[z.id]?.n ?? null}
      aberta={z.id === p.aberta}
      apontada={z.id === p.apontada}
      podeEditar={p.podeEditar}
      compacto={compacto}
      aoAbrir={() => p.aoAbrir(z.id)}
      aoApontar={(sim) => p.aoApontar(sim ? z.id : null)}
    />
  );
  const doGrupo = (g: ZonaNumerada['grupo']) => p.numeracao.filter((n) => n.grupo === g).map((n) => porId[n.id]!);

  /** Um número no desenho: um botão que abre a zona (ou só o número, quando é só de leitura). */
  const pino = (id: string, left: string, top: string | number) => {
    const n = numero[id]?.n;
    const z = porId[id];
    if (!n || !z) return null;
    const marca = (
      <Pino n={n} fora={estados[id] === 'excluida'} aceso={estados[id] === 'aberta'} className="shadow-[0_0_0_3px_rgba(255,255,255,0.9)]" />
    );
    return p.podeEditar ? (
      <button
        key={id}
        type="button"
        onClick={() => p.aoAbrir(id)}
        onMouseEnter={() => p.aoApontar(id)}
        onMouseLeave={() => p.aoApontar(null)}
        onFocus={() => p.aoApontar(id)}
        onBlur={() => p.aoApontar(null)}
        aria-label={`${n}. ${nomeDaZona(z)}: editar`}
        // O círculo tem 26 px; o alvo, 44 (o `before` estica-se 9 px para cada lado).
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full before:absolute before:-inset-[9px] before:content-[''] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-tinta-600"
        style={{ left, top }}
      >
        {marca}
      </button>
    ) : (
      <span key={id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left, top }}>
        {marca}
      </span>
    );
  };
  /** As faces de uma zona respondem ao rato como o seu cartão (o teclado tem os números e os cartões). */
  const aoTocarNaFace = p.podeEditar ? { aoAbrir: p.aoAbrir, aoApontar: p.aoApontar } : undefined;

  const [cx, cy, cw, ch] = lista.d.caixa;
  const medidasEmTexto = [
    p.textos.frente && `frente ${p.textos.frente}`,
    p.textos.fundo && `fundo ${p.textos.fundo}`,
    p.textos.altura && `altura ${p.textos.altura}`,
  ].filter(Boolean);
  const desenhoEmLista = (
    <div className="quadro-lista-desenho min-w-0">
      <div className="quadro-caixa-do-desenho rounded-2xl bg-slate-50">
        <div className="mx-auto w-full" style={{ maxWidth: Math.round((ALTURA_MAXIMA_DO_DESENHO * cw) / ch) }}>
          <figure className="relative m-0" style={{ aspectRatio: `${cw} / ${ch}` }} aria-label={p.descricao} role="group">
            <svg viewBox={`${cx} ${cy} ${cw} ${ch}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
              <Faces volume={p.volume} d={lista.d} estados={estados} prefixo={`${prefixo}-l`} tocar={aoTocarNaFace} />
              <LinhasDasCotas d={lista.d} px={(q) => q} ponto={2 / lista.s} />
            </svg>
            {lista.d.cotas.map((c) => (
              <RotuloDaCota key={c.eixo} x={pct(c.rotulo[0] - cx, cw)} y={pct(c.rotulo[1] - cy, ch)} texto={c.texto} alinhar={c.alinhar} />
            ))}
            {lista.d.pinos.map(({ id, p: q }) => pino(id, pct(q[0] - cx, cw), pct(q[1] - cy, ch)))}
            {sitios.map(({ tipo, p: q }) => (
              <button
                key={tipo}
                type="button"
                onClick={() => p.vazio?.aoAcrescentar?.(tipo)}
                className="btn-secondary btn-sm absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap border-dashed border-tinta-400 bg-white/95"
                // Nunca a sair da caixa do desenho: o meio do botão fica a pelo menos meio botão da borda.
                style={{ left: `clamp(3.5rem, ${pct(q[0] - cx, cw)}, calc(100% - 3.5rem))`, top: pct(q[1] - cy, ch) }}
              >
                + {ROTULO_DO_TIPO[tipo]}
              </button>
            ))}
          </figure>
        </div>
      </div>
      {estreito && medidasEmTexto.length > 0 && (
        <p className="mt-2 text-[13px] tabular-nums text-slate-600">{medidasEmTexto.join(' · ').replace(/^./, (c) => c.toUpperCase())}</p>
      )}
      {p.accoes && <div className="mt-3 flex flex-wrap gap-2 sm:hidden">{p.accoes}</div>}
    </div>
  );

  const grupo = (titulo: string, nota: string, zonas: ZonaNaLista[], forma: 'lista' | 'grelha' | 'coluna' = 'lista') =>
    zonas.length > 0 && (
      <section aria-label={titulo} className="border-t border-slate-200 pt-3">
        <h3 className="text-[13px] font-semibold text-slate-600">{titulo}</h3>
        <p className="text-[13px] text-slate-600">{nota}</p>
        <ul
          className={forma === 'grelha' ? 'mt-2 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(17rem,1fr))]' : 'mt-2 space-y-2'}
        >
          {zonas.map((z) => (
            <li key={z.id}>{cartao(z, forma === 'coluna')}</li>
          ))}
        </ul>
      </section>
    );
  const foraDoPedido = (forma: 'lista' | 'grelha' | 'coluna') =>
    grupo('Fora do pedido', 'Consideradas e deixadas de fora: não contam para o total.', doGrupo('fora_do_pedido'), forma);

  return (
    <div ref={ref} className={`quadro-das-zonas ${comChamadas ? 'quadro-com-chamadas' : ''}`}>
      <div className="quadro-so-lista">
        <div className="quadro-palco quadro-lista-grelha">
          {desenhoEmLista}
          {p.vazio ? (
            p.vazio.lista
          ) : (
            <div className="min-w-0 space-y-3">
              <ul className="space-y-2">
                {doGrupo('no_desenho').map((z) => (
                  <li key={z.id}>{cartao(z, false)}</li>
                ))}
              </ul>
              {grupo('Fora do desenho', 'O desenho do prédio não as mostra.', doGrupo('fora_do_desenho'))}
              {foraDoPedido('lista')}
            </div>
          )}
        </div>
      </div>

      {larga?.disposicao && (
        // O palco: cinzento a toda a largura, com os cartões por cima e o desenho ao meio (maqueta B).
        <div className="quadro-so-chamadas rounded-2xl bg-slate-50" style={{ padding: FOLGA_DO_PALCO }}>
          <figure className="relative m-0" style={{ height: larga.disposicao.altura }} aria-label={p.descricao} role="group">
            <svg
              viewBox={`0 0 ${larguraDasChamadas} ${larga.disposicao.altura}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              <clipPath id={`${prefixo}-meio`}>
                <rect
                  x={larga.coluna + larga.corredor / 2}
                  y={0}
                  width={larguraDasChamadas - 2 * larga.coluna - larga.corredor}
                  height={larga.disposicao.altura}
                />
              </clipPath>
              <g clipPath={`url(#${prefixo}-meio)`}>
                <g transform={`translate(${larga.dx} ${larga.dy}) scale(${larga.escala})`}>
                  <Faces volume={p.volume} d={larga.desenho} estados={estados} prefixo={`${prefixo}-c`} tocar={aoTocarNaFace} />
                </g>
              </g>
              <LinhasDasCotas d={larga.desenho} px={(q) => [q[0] * larga.escala + larga.dx, q[1] * larga.escala + larga.dy]} ponto={2} />
              {larga.disposicao.chamadas.map((c) => {
                const acesa = estados[c.id] === 'aberta';
                return (
                  <polyline
                    key={c.id}
                    points={c.pontos.map((q) => q.join(',')).join(' ')}
                    fill="none"
                    className={acesa ? 'stroke-tinta-700' : 'stroke-slate-400'}
                    strokeWidth={acesa ? 1.5 : 1}
                  />
                );
              })}
            </svg>
            {larga.desenho.cotas.map((c) => (
              <RotuloDaCota
                key={c.eixo}
                x={pct(c.rotulo[0] * larga.escala + larga.dx, larguraDasChamadas)}
                y={`${c.rotulo[1] * larga.escala + larga.dy}px`}
                texto={c.texto}
                alinhar={c.alinhar}
              />
            ))}
            {larga.desenho.pinos.map(({ id, p: q }) =>
              pino(id, pct(q[0] * larga.escala + larga.dx, larguraDasChamadas), q[1] * larga.escala + larga.dy),
            )}
            {larga.disposicao.chamadas.map((c) => (
              <div
                key={c.id}
                ref={(el) => {
                  cartoes.current[c.id] = el;
                }}
                className="absolute"
                style={{ top: c.topo, width: pct(larga.coluna, larguraDasChamadas), ...(c.lado === 'esq' ? { left: 0 } : { right: 0 }) }}
              >
                {cartao(porId[c.id]!, true)}
              </div>
            ))}
            {larga.disposicao.rodape && (
              <div
                ref={(el) => {
                  cartoes.current[RODAPE] = el;
                }}
                className="absolute"
                style={{
                  top: larga.disposicao.rodape.topo,
                  width: pct(larga.coluna, larguraDasChamadas),
                  ...(larga.disposicao.rodape.lado === 'esq' ? { left: 0 } : { right: 0 }),
                }}
              >
                {foraDoPedido('coluna')}
              </div>
            )}
          </figure>
          {/* Sem lugar numa coluna, por baixo. Aqui não se mede: a altura que conta é a da coluna, e
              medir esta (mais baixa, em grelha) punha o bloco a saltar entre os dois sítios. */}
          {!larga.disposicao.rodape && doGrupo('fora_do_pedido').length > 0 && <div className="mt-4">{foraDoPedido('grelha')}</div>}
        </div>
      )}
    </div>
  );
}
