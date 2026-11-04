'use client';

import { useEffect, useRef, useState } from 'react';
import {
  retificarZona,
  INCLINACAO_TIPICA_GRAUS_PROPOSTA,
  type Ponto,
  type CantosZona,
  type ResultadoRetificacao,
} from '@/domain/retificacao';

/**
 * Medir uma ou mais zonas a partir de fotografias (handoff de 03/11/2026, secção 4, e pedido do
 * promotor de afinar o fluxo, mesma sessão):
 *
 * - Importa-se uma fotografia de cada vez ("Importar foto").
 * - Em cada fotografia, marcam-se um ou mais **segmentos medidos com fita métrica**: ponto A, ponto
 *   B, e o comprimento real entre eles — com lupa (zoom) ao colocar cada ponto, para precisão.
 * - Opcionalmente, marcam-se também os quatro cantos de uma zona retangular nessa fotografia; com o
 *   primeiro segmento como referência de escala, `retificarZona` calcula largura, altura e área.
 * - Pode importar-se mais do que uma fotografia da mesma fachada — cada uma com os seus próprios
 *   segmentos e, se aplicável, o seu próprio cálculo. **Isto mostra-se lado a lado, uma fonte de
 *   cada vez — não se fundem automaticamente medições de fotografias diferentes**: combinar números
 *   de fontes distintas sem saber que correspondem exatamente ao mesmo troço é como inventar uma
 *   medida, e é exactamente o que este projeto evita (ver `src/domain/geometria.ts`, "nunca
 *   inventar"). A comparação fica para a pessoa.
 *
 * `retificarZona` (`src/domain/retificacao.ts`) já estava feito e testado. Continua a ser preciso
 * **uma distância real conhecida por segmento** — nenhuma fotografia sozinha carrega escala, seja
 * qual for a ferramenta (é física, não é falta de código).
 */

const TAMANHO_LUPA = 140;
const ZOOM_LUPA = 4;

/** Lupa: um recorte ampliado da fotografia, centrado no ponto que se está a marcar. */
function Lupa({ img, pontoNatural, cursorCss }: { img: HTMLImageElement; pontoNatural: Ponto; cursorCss: Ponto }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const regiao = TAMANHO_LUPA / ZOOM_LUPA;
    ctx.clearRect(0, 0, TAMANHO_LUPA, TAMANHO_LUPA);
    ctx.drawImage(img, pontoNatural.x - regiao / 2, pontoNatural.y - regiao / 2, regiao, regiao, 0, 0, TAMANHO_LUPA, TAMANHO_LUPA);
    ctx.strokeStyle = 'rgba(220,38,38,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(TAMANHO_LUPA / 2, 0);
    ctx.lineTo(TAMANHO_LUPA / 2, TAMANHO_LUPA);
    ctx.moveTo(0, TAMANHO_LUPA / 2);
    ctx.lineTo(TAMANHO_LUPA, TAMANHO_LUPA / 2);
    ctx.stroke();
  }, [img, pontoNatural.x, pontoNatural.y]);

  // Acima e à esquerda do dedo/cursor, para nunca tapar o ponto que se está a marcar.
  const left = Math.max(0, cursorCss.x - TAMANHO_LUPA - 16);
  const top = Math.max(0, cursorCss.y - TAMANHO_LUPA - 16);

  return (
    <canvas
      ref={canvasRef}
      width={TAMANHO_LUPA}
      height={TAMANHO_LUPA}
      className="pointer-events-none absolute rounded-full border-2 border-white shadow-lg"
      style={{ left, top }}
    />
  );
}

interface SegmentoMedido {
  a: Ponto;
  b: Ponto;
  distanciaCm: string;
}

interface Medidas {
  largura: number;
  altura: number;
}

let proximoIdFoto = 0;

interface EstadoFoto {
  id: number;
  url: string;
  img: HTMLImageElement | null;
  naturalSize: { largura: number; altura: number } | null;
  segmentos: SegmentoMedido[];
  pendente: Ponto | null;
  modo: 'segmentos' | 'cantos';
  cantos: Ponto[];
  comInclinacaoAssumida: boolean;
}

const novaFoto = (url: string): EstadoFoto => ({
  id: proximoIdFoto++,
  url,
  img: null,
  naturalSize: null,
  segmentos: [],
  pendente: null,
  modo: 'segmentos',
  cantos: [],
  comInclinacaoAssumida: false,
});

const ROTULOS_DOS_CANTOS = ['Canto superior esquerdo', 'Canto superior direito', 'Canto inferior direito', 'Canto inferior esquerdo'];

function FotoAnotada({
  foto,
  atualizar,
  remover,
  onMedido,
}: {
  foto: EstadoFoto;
  atualizar: (f: (prev: EstadoFoto) => EstadoFoto) => void;
  remover: () => void;
  onMedido?: (m: Medidas) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<{ natural: Ponto; css: Ponto } | null>(null);

  const naturalDoEvento = (e: { clientX: number; clientY: number }): Ponto | null => {
    if (!svgRef.current) return null;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return null;
    const local = pt.matrixTransform(ctm.inverse());
    return { x: Math.round(local.x), y: Math.round(local.y) };
  };

  const mover = (e: React.PointerEvent<SVGSVGElement>) => {
    const natural = naturalDoEvento(e);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!natural || !rect) return;
    setCursor({ natural, css: { x: e.clientX - rect.left, y: e.clientY - rect.top } });
  };

  const tocar = (e: React.PointerEvent<SVGSVGElement>) => {
    const natural = naturalDoEvento(e);
    if (!natural) return;
    if (foto.modo === 'cantos') {
      if (foto.cantos.length >= 4) return;
      atualizar((f) => ({ ...f, cantos: [...f.cantos, natural] }));
      return;
    }
    if (!foto.pendente) {
      atualizar((f) => ({ ...f, pendente: natural }));
    } else {
      atualizar((f) => ({ ...f, segmentos: [...f.segmentos, { a: f.pendente!, b: natural, distanciaCm: '' }], pendente: null }));
    }
  };

  const cantos: CantosZona | null =
    foto.cantos.length >= 4
      ? { topoEsquerdo: foto.cantos[0]!, topoDireito: foto.cantos[1]!, baseDireita: foto.cantos[2]!, baseEsquerda: foto.cantos[3]! }
      : null;
  const primeiroSegmento = foto.segmentos[0] ?? null;
  const distanciaPrimeiro = primeiroSegmento ? Number(primeiroSegmento.distanciaCm.replace(',', '.')) : NaN;
  const distanciaValida = Number.isFinite(distanciaPrimeiro) && distanciaPrimeiro > 0;

  let resultado: ResultadoRetificacao | null = null;
  if (cantos && primeiroSegmento && distanciaValida && foto.naturalSize) {
    try {
      resultado = retificarZona(
        cantos,
        primeiroSegmento.a,
        primeiroSegmento.b,
        distanciaPrimeiro,
        foto.naturalSize,
        undefined,
        foto.comInclinacaoAssumida ? INCLINACAO_TIPICA_GRAUS_PROPOSTA : undefined,
      );
    } catch {
      resultado = null;
    }
  }

  const corDoSegmento = ['stroke-amber-500', 'stroke-fuchsia-500', 'stroke-emerald-500', 'stroke-cyan-500'];

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <div className="relative overflow-hidden rounded-lg border border-slate-200" ref={containerRef}>
        {/* A imagem fica escondida por trás do SVG: é o SVG que recebe o toque e desenha os pontos,
            com viewBox nas dimensões naturais da foto — a mesma unidade que retificarZona usa.
            <img> nativo de propósito: a foto vem de um ficheiro local (object URL), nunca otimizada
            nem redimensionada — precisa de naturalWidth/naturalHeight exatos, e a lupa desenha
            diretamente a partir deste elemento. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={foto.url}
          alt=""
          className="block w-full select-none"
          onLoad={(e) => {
            const img = e.currentTarget;
            atualizar((f) => ({ ...f, img, naturalSize: { largura: img.naturalWidth, altura: img.naturalHeight } }));
          }}
        />
        {foto.naturalSize && (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${foto.naturalSize.largura} ${foto.naturalSize.altura}`}
            className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
            onPointerMove={mover}
            onPointerLeave={() => setCursor(null)}
            onPointerUp={tocar}
          >
            {cantos && (
              <polygon
                points={[cantos.topoEsquerdo, cantos.topoDireito, cantos.baseDireita, cantos.baseEsquerda].map((p) => `${p.x},${p.y}`).join(' ')}
                className="fill-tinta-500/20 stroke-tinta-600"
                strokeWidth={Math.max(1, foto.naturalSize.largura / 300)}
              />
            )}
            {foto.cantos.map((p, i) => (
              <Marcador key={`c${i}`} p={p} rotulo={String(i + 1)} tamanhoBase={foto.naturalSize!.largura} />
            ))}
            {foto.segmentos.map((s, i) => (
              <g key={i}>
                <line
                  x1={s.a.x}
                  y1={s.a.y}
                  x2={s.b.x}
                  y2={s.b.y}
                  className={corDoSegmento[i % corDoSegmento.length]}
                  strokeWidth={Math.max(1, foto.naturalSize!.largura / 300)}
                  strokeDasharray="6 6"
                />
                <Marcador p={s.a} rotulo={`${i + 1}A`} tamanhoBase={foto.naturalSize!.largura} />
                <Marcador p={s.b} rotulo={`${i + 1}B`} tamanhoBase={foto.naturalSize!.largura} />
              </g>
            ))}
            {foto.pendente && <Marcador p={foto.pendente} rotulo={`${foto.segmentos.length + 1}A`} tamanhoBase={foto.naturalSize.largura} />}
          </svg>
        )}
        {cursor && foto.img && <Lupa img={foto.img} pontoNatural={cursor.natural} cursorCss={cursor.css} />}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[15px] text-slate-700">
        {foto.modo === 'segmentos' ? (
          <p>
            {foto.pendente ? (
              <>
                Tocar no <strong>ponto B</strong> do segmento (o outro extremo do que já mediu com fita).
              </>
            ) : (
              <>
                Tocar no <strong>ponto A</strong> de um segmento que já mediu com fita métrica.
              </>
            )}
          </p>
        ) : (
          <p>
            {foto.cantos.length < 4 ? (
              <>
                Tocar em: <strong>{ROTULOS_DOS_CANTOS[foto.cantos.length]}</strong>
              </>
            ) : (
              'Cantos todos marcados.'
            )}
          </p>
        )}
        <button
          type="button"
          className="btn-quiet btn-sm"
          onClick={() =>
            atualizar((f) =>
              f.modo === 'segmentos'
                ? { ...f, pendente: null, segmentos: f.segmentos.slice(0, -1) }
                : { ...f, cantos: f.cantos.slice(0, -1) },
            )
          }
        >
          Desfazer último ponto
        </button>
        <button type="button" className="btn-quiet btn-sm" onClick={remover}>
          Remover esta fotografia
        </button>
      </div>

      {foto.segmentos.length > 0 && (
        <div className="space-y-2 border-t border-slate-200 pt-3">
          <h4 className="text-[13px] font-medium text-slate-500">Segmentos medidos nesta fotografia</h4>
          {foto.segmentos.map((s, i) => (
            <label key={i} className="flex items-center gap-2">
              <span className={`inline-block h-2 w-5 rounded-full ${corDoSegmento[i % corDoSegmento.length]!.replace('stroke-', 'bg-')}`} />
              <span className="w-24 text-[15px] text-slate-700">Segmento {i + 1}</span>
              <input
                className="campo max-w-[140px]"
                inputMode="decimal"
                placeholder="Distância (cm)"
                value={s.distanciaCm}
                onChange={(e) =>
                  atualizar((f) => ({
                    ...f,
                    segmentos: f.segmentos.map((seg, j) => (j === i ? { ...seg, distanciaCm: e.target.value } : seg)),
                  }))
                }
              />
            </label>
          ))}
        </div>
      )}

      {foto.modo === 'segmentos' && foto.segmentos.length > 0 && !foto.pendente && (
        <button type="button" className="btn-secondary btn-sm" onClick={() => atualizar((f) => ({ ...f, modo: 'cantos' }))}>
          Marcar também os 4 cantos desta zona, para calcular a área
        </button>
      )}
      {foto.modo === 'cantos' && (
        <button type="button" className="btn-quiet btn-sm" onClick={() => atualizar((f) => ({ ...f, modo: 'segmentos' }))}>
          ← Voltar a marcar segmentos
        </button>
      )}

      {foto.modo === 'cantos' && cantos && (
        <label className="flex items-center gap-2 text-[15px] text-slate-700">
          <input
            type="checkbox"
            checked={foto.comInclinacaoAssumida}
            onChange={(e) => atualizar((f) => ({ ...f, comInclinacaoAssumida: e.target.checked }))}
            className="h-5 w-5"
          />
          Fotografia tirada de baixo para cima, fora de eixo (correção aproximada, inclinação assumida de {INCLINACAO_TIPICA_GRAUS_PROPOSTA}º — não
          confirmada, ver DECISOES.md)
        </label>
      )}

      {resultado && (
        <div className="rounded-lg bg-slate-50 p-4">
          {resultado.estado === 'revisao' && (
            <p className="mb-2 text-[15px] font-medium text-amber-800">
              Em revisão: {resultado.motivo} (desvio dos cantos: {resultado.desvioAngularGraus.toFixed(1)}º).
            </p>
          )}
          <div className="grid grid-cols-3 gap-3 text-[15px]">
            <div>
              <p className="text-slate-500">Largura</p>
              <p className="font-mono text-[17px] tabular-nums text-slate-900">{(resultado.larguraCm / 100).toFixed(2)} m</p>
            </div>
            <div>
              <p className="text-slate-500">Altura</p>
              <p className="font-mono text-[17px] tabular-nums text-slate-900">{(resultado.alturaCm / 100).toFixed(2)} m</p>
            </div>
            <div>
              <p className="text-slate-500">Área</p>
              <p className="font-mono text-[17px] tabular-nums text-slate-900">{(resultado.areaCm2 / 10000).toFixed(2)} m²</p>
            </div>
          </div>
          {foto.segmentos.length > 1 && (
            <p className="mt-2 text-[13px] text-slate-500">
              Cálculo feito só com o segmento 1 (referência de escala). Os outros {foto.segmentos.length - 1} segmentos ficam registados, mas a
              confirmação cruzada entre eles ainda não está construída.
            </p>
          )}
          {resultado.aproximado && <p className="mt-2 text-[13px] text-slate-500">Valor aproximado (inclinação assumida, não medida).</p>}
          {onMedido && (
            <button
              type="button"
              className={resultado.estado === 'revisao' ? 'btn-secondary btn-sm mt-3' : 'btn-primary btn-sm mt-3'}
              onClick={() => onMedido({ largura: resultado!.larguraCm / 100, altura: resultado!.alturaCm / 100 })}
            >
              {resultado.estado === 'revisao' ? 'Usar esta medida mesmo assim' : 'Usar esta medida'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Marcador({ p, rotulo, tamanhoBase }: { p: Ponto; rotulo: string; tamanhoBase: number }) {
  return (
    <g>
      <circle cx={p.x} cy={p.y} r={Math.max(4, tamanhoBase / 150)} className="fill-slate-900 stroke-white" strokeWidth={2} />
      <text
        x={p.x}
        y={p.y - tamanhoBase / 100}
        textAnchor="middle"
        fontSize={tamanhoBase / 55}
        className="fill-slate-900 stroke-white"
        strokeWidth={tamanhoBase / 600}
        paintOrder="stroke"
      >
        {rotulo}
      </text>
    </g>
  );
}

export function MedirZona({ onMedido }: { onMedido?: (m: Medidas) => void }) {
  const [fotos, setFotos] = useState<EstadoFoto[]>([]);

  const importar = (file: File | null) => {
    if (!file) return;
    setFotos((fs) => [...fs, novaFoto(URL.createObjectURL(file))]);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-[15px] font-semibold text-slate-900">Medir uma zona a partir de fotografias</h3>
        <p className="mt-1 text-[13px] text-slate-500">
          Importar uma fotografia de cada vez. Em cada uma, marcar um ou mais segmentos que já mediu com fita métrica (ponto A,
          ponto B, comprimento real) — a lupa ajuda a marcar com precisão. Pode importar mais do que uma fotografia da mesma
          fachada; cada uma mostra o seu próprio cálculo, lado a lado — a comparação entre fotografias fica para si, nunca se
          fundem automaticamente.
        </p>
        <label className="btn-secondary btn-sm mt-3 inline-flex cursor-pointer">
          Importar foto
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => importar(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      {fotos.map((foto) => (
        <FotoAnotada
          key={foto.id}
          foto={foto}
          atualizar={(fn) => setFotos((fs) => fs.map((f) => (f.id === foto.id ? fn(f) : f)))}
          remover={() => setFotos((fs) => fs.filter((f) => f.id !== foto.id))}
          onMedido={onMedido}
        />
      ))}

      {fotos.length > 0 && (
        <label className="btn-quiet btn-sm inline-flex cursor-pointer">
          + Importar outra fotografia desta fachada
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => importar(e.target.files?.[0] ?? null)} />
        </label>
      )}
    </div>
  );
}
