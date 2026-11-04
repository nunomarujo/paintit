'use client';

import { useEffect, useRef, useState } from 'react';
import { projetarVolume, CAMERA_OMISSAO, type ParametrosCamera } from '@/domain/perspectiveCamera';
import type { FaceKind, VolumeInput } from '@/domain/volume';

/**
 * Dar escala ao volume a partir de uma fotografia (handoff de 03/11/2026, secção 4, reformulado o
 * mesmo dia a pedido do promotor — três tentativas anteriores, nesta ordem: 1) uma só fotografia do
 * prédio inteiro a dar tudo sozinha (abandonada, mal-condicionada fora do caso centrado); 2) medição
 * zona a zona com `MedirZona.tsx` — correta mas "trabalho interminável ao avaliador", e cada zona só
 * dava a área dessa zona, não do prédio; 3) `AjustarFotografia.tsx` sem ligação nenhuma às medidas
 * reais, só visual. Esta versão junta o que faltava:
 *
 * - O **volume declarado** (forma, pisos, janelas, varandas — passo 1, formulário acima) projeta-se
 *   sobre a fotografia com uma câmara de perspetiva real (`perspectiveCamera.ts`), ajustável por
 *   deslizadores, para se confirmar visualmente que a descrição bate com o que se vê.
 * - **Uma ou mais referências medidas com fita métrica** marcam-se diretamente na mesma fotografia
 *   (dois pontos, com lupa de precisão) e **escrevem logo o campo correspondente** (Frente, Fundo ou
 *   Pé-direito) — nunca um cálculo à parte, nunca um botão "concluir" com um número que não é o do
 *   prédio. A área (passo 3) sai sozinha de `areasDoVolume`, já com a escala destas referências.
 *
 * Nenhuma fotografia sozinha carrega escala — por isso continua a ser preciso pelo menos uma
 * distância real conhecida. Isso é física, não falta de código (ver `retificacao.ts`).
 */

const TAMANHO_LUPA = 140;
const ZOOM_LUPA = 4;

function Lupa({ img, pontoNatural, cursorCss }: { img: HTMLImageElement; pontoNatural: { x: number; y: number }; cursorCss: { x: number; y: number } }) {
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

const CORES: Record<FaceKind, string> = {
  frente: 'fill-tinta-500/25 stroke-tinta-600',
  lado: 'fill-tinta-400/20 stroke-tinta-600',
  empena: 'fill-slate-400/20 stroke-slate-500',
  topo: 'fill-tinta-200/15 stroke-tinta-500',
  varanda: 'fill-slate-500/25 stroke-slate-600',
  marquise: 'fill-sky-400/25 stroke-sky-600',
  vizinho: 'fill-transparent stroke-transparent',
  janela: 'fill-amber-400/30 stroke-amber-600',
  porta: 'fill-amber-600/30 stroke-amber-700',
  grade: 'fill-transparent stroke-slate-500',
  muro: 'fill-slate-300/20 stroke-slate-500',
  beiral: 'fill-slate-300/20 stroke-slate-500',
  pala: 'fill-slate-300/20 stroke-slate-500',
};

interface DeslizadorProps {
  rotulo: string;
  valor: number;
  min: number;
  max: number;
  passo: number;
  unidade: string;
  onChange: (v: number) => void;
}

function Deslizador({ rotulo, valor, min, max, passo, unidade, onChange }: DeslizadorProps) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[15px] font-medium text-slate-700">
        <span>{rotulo}</span>
        <span className="font-mono tabular-nums text-slate-900">
          {valor}
          {unidade}
        </span>
      </span>
      <input type="range" min={min} max={max} step={passo} value={valor} onChange={(e) => onChange(Number(e.target.value))} className="h-11 w-full" />
    </label>
  );
}

type Alvo = 'nenhum' | 'frente' | 'fundo' | 'peDireito';
const ALVO_LABELS: Record<Alvo, string> = { nenhum: 'Não aplicar', frente: 'Frente', fundo: 'Fundo', peDireito: 'Pé-direito' };

interface Ponto {
  x: number;
  y: number;
}
interface Segmento {
  id: number;
  a: Ponto;
  b: Ponto;
  distanciaCm: string;
  alvo: Alvo;
}

let proximoIdSegmento = 0;

export function AjustarFotografia({ input, onEscala }: { input: VolumeInput; onEscala: (campo: 'frente' | 'fundo' | 'peDireito', metros: number) => void }) {
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ largura: number; altura: number } | null>(null);
  const [camera, setCamera] = useState<ParametrosCamera>(CAMERA_OMISSAO);
  const [opacidade, setOpacidade] = useState(0.55);
  const [marcarAtivo, setMarcarAtivo] = useState(true);
  const [pendente, setPendente] = useState<Ponto | null>(null);
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [cursor, setCursor] = useState<{ natural: Ponto; css: Ponto } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const importar = (file: File | null) => {
    if (!file) return;
    setNaturalSize(null);
    setImgEl(null);
    setSegmentos([]);
    setPendente(null);
    setImagemUrl(URL.createObjectURL(file));
  };

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

  const tocar = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!marcarAtivo) return;
    const natural = naturalDoEvento(e);
    if (!natural) return;
    if (!pendente) {
      setPendente(natural);
      return;
    }
    setSegmentos((ss) => [...ss, { id: proximoIdSegmento++, a: pendente, b: natural, distanciaCm: '', alvo: 'nenhum' }]);
    setPendente(null);
  };

  const faces = naturalSize ? projetarVolume(input, camera, naturalSize) : [];
  const corDoSegmento = ['stroke-amber-500', 'stroke-fuchsia-500', 'stroke-emerald-500', 'stroke-rose-500'];

  const aplicar = (seg: Segmento) => {
    const distancia = Number(seg.distanciaCm.replace(',', '.'));
    if (seg.alvo === 'nenhum' || !Number.isFinite(distancia) || distancia <= 0) return;
    onEscala(seg.alvo, distancia / 100);
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h3 className="text-[15px] font-semibold text-slate-900">Passo 2 — Dar escala a partir de uma fotografia</h3>
        <p className="mt-1 text-[13px] text-slate-500">
          O desenho usa a descrição do passo 1 (forma, pisos, janelas, varandas). Marcar na fotografia uma distância que já
          mediu com fita métrica (dois pontos, com lupa) e dizer a que campo corresponde — <strong>Frente</strong>,{' '}
          <strong>Fundo</strong> ou <strong>Pé-direito</strong> — escreve logo esse campo. Os deslizadores da câmara são só para
          confirmar visualmente o encaixe, nunca mudam nenhuma medida.
        </p>
      </div>

      {!imagemUrl && (
        <label className="btn-secondary btn-sm inline-flex cursor-pointer">
          Importar foto
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => importar(e.target.files?.[0] ?? null)} />
        </label>
      )}

      {imagemUrl && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-lg border border-slate-200" ref={containerRef}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagemUrl}
              alt=""
              className="block w-full select-none"
              onLoad={(e) => {
                const img = e.currentTarget;
                setImgEl(img);
                setNaturalSize({ largura: img.naturalWidth, altura: img.naturalHeight });
              }}
            />
            {naturalSize && (
              <svg
                ref={svgRef}
                viewBox={`0 0 ${naturalSize.largura} ${naturalSize.altura}`}
                className={`absolute inset-0 h-full w-full ${marcarAtivo ? 'cursor-crosshair' : ''}`}
                onPointerMove={mover}
                onPointerLeave={() => setCursor(null)}
                onClick={tocar}
              >
                {faces.map((f, i) => (
                  <polygon
                    key={`v${i}`}
                    points={f.points.map((p) => p.join(',')).join(' ')}
                    className={CORES[f.kind]}
                    style={{ opacity: opacidade, pointerEvents: 'none' }}
                    strokeWidth={Math.max(1, naturalSize.largura / 400)}
                  />
                ))}
                {segmentos.map((s, i) => (
                  <g key={s.id} style={{ pointerEvents: 'none' }}>
                    <line
                      x1={s.a.x}
                      y1={s.a.y}
                      x2={s.b.x}
                      y2={s.b.y}
                      className={corDoSegmento[i % corDoSegmento.length]}
                      strokeWidth={Math.max(1.5, naturalSize.largura / 250)}
                      strokeDasharray="8 6"
                    />
                    <circle cx={s.a.x} cy={s.a.y} r={Math.max(4, naturalSize.largura / 150)} className="fill-slate-900 stroke-white" strokeWidth={2} />
                    <circle cx={s.b.x} cy={s.b.y} r={Math.max(4, naturalSize.largura / 150)} className="fill-slate-900 stroke-white" strokeWidth={2} />
                  </g>
                ))}
                {pendente && (
                  <circle
                    cx={pendente.x}
                    cy={pendente.y}
                    r={Math.max(4, naturalSize.largura / 150)}
                    className="fill-amber-500 stroke-white"
                    strokeWidth={2}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
              </svg>
            )}
            {cursor && imgEl && marcarAtivo && <Lupa img={imgEl} pontoNatural={cursor.natural} cursorCss={cursor.css} />}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[15px] text-slate-700">
              <input type="checkbox" checked={marcarAtivo} onChange={(e) => setMarcarAtivo(e.target.checked)} className="h-5 w-5" />
              Marcar uma distância medida nesta fotografia
            </label>
            {marcarAtivo && (
              <p className="text-[13px] text-slate-500">{pendente ? 'Tocar no segundo ponto.' : 'Tocar no primeiro ponto da distância que mediu.'}</p>
            )}
            {(pendente || segmentos.length > 0) && (
              <button
                type="button"
                className="btn-quiet btn-sm"
                onClick={() => {
                  setPendente(null);
                  setSegmentos((ss) => ss.slice(0, -1));
                }}
              >
                Desfazer último ponto
              </button>
            )}
          </div>

          {segmentos.length > 0 && (
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <h4 className="text-[13px] font-medium text-slate-500">Distâncias marcadas nesta fotografia</h4>
              {segmentos.map((s, i) => (
                <div key={s.id} className="flex flex-wrap items-center gap-2">
                  <span className={`inline-block h-2 w-5 rounded-full ${corDoSegmento[i % corDoSegmento.length]!.replace('stroke-', 'bg-')}`} />
                  <input
                    className="campo max-w-[140px]"
                    inputMode="decimal"
                    placeholder="Distância (cm)"
                    value={s.distanciaCm}
                    onChange={(e) => setSegmentos((ss) => ss.map((seg) => (seg.id === s.id ? { ...seg, distanciaCm: e.target.value } : seg)))}
                  />
                  <select
                    className="campo max-w-[160px]"
                    value={s.alvo}
                    onChange={(e) => setSegmentos((ss) => ss.map((seg) => (seg.id === s.id ? { ...seg, alvo: e.target.value as Alvo } : seg)))}
                  >
                    {(Object.keys(ALVO_LABELS) as Alvo[]).map((a) => (
                      <option key={a} value={a}>
                        {ALVO_LABELS[a]}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn-primary btn-sm" disabled={s.alvo === 'nenhum' || !s.distanciaCm} onClick={() => aplicar(s)}>
                    Aplicar
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="block max-w-xs">
            <span className="mb-1 flex items-center justify-between text-[15px] font-medium text-slate-700">
              <span>Opacidade do desenho</span>
              <span className="font-mono tabular-nums text-slate-900">{Math.round(opacidade * 100)}%</span>
            </span>
            <input type="range" min={0.1} max={1} step={0.05} value={opacidade} onChange={(e) => setOpacidade(Number(e.target.value))} className="h-11 w-full" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Deslizador rotulo="Distância a que se estava" valor={camera.distanciaM} min={2} max={60} passo={0.5} unidade=" m" onChange={(v) => setCamera((c) => ({ ...c, distanciaM: v }))} />
            <Deslizador rotulo="Altura do olho (de quem fotografou)" valor={camera.alturaOlhoM} min={0.3} max={3} passo={0.05} unidade=" m" onChange={(v) => setCamera((c) => ({ ...c, alturaOlhoM: v }))} />
            <Deslizador rotulo="Ângulo de observação" valor={camera.azimuteGraus} min={-180} max={180} passo={1} unidade="º" onChange={(v) => setCamera((c) => ({ ...c, azimuteGraus: v }))} />
            <Deslizador rotulo="Campo de visão (lente)" valor={camera.fovVerticalGraus} min={25} max={100} passo={1} unidade="º" onChange={(v) => setCamera((c) => ({ ...c, fovVerticalGraus: v }))} />
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-quiet btn-sm" onClick={() => setCamera(CAMERA_OMISSAO)}>
              Repor câmara
            </button>
            <button
              type="button"
              className="btn-quiet btn-sm"
              onClick={() => {
                setImagemUrl(null);
                setNaturalSize(null);
                setImgEl(null);
                setSegmentos([]);
                setPendente(null);
              }}
            >
              Trocar fotografia
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
