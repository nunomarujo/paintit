'use client';

import { useState } from 'react';
import { projetarVolume, CAMERA_OMISSAO, type ParametrosCamera } from '@/domain/perspectiveCamera';
import type { FaceKind, VolumeInput } from '@/domain/volume';

/**
 * Ajustar o volume declarado a uma fotografia real (pedido do promotor, 03/11/2026): em vez de
 * medir zona a zona, sobrepõe-se o modelo 3D (as mesmas dimensões já declaradas no formulário
 * principal) à fotografia com uma câmara de perspetiva real, e ajustam-se os parâmetros da câmara —
 * onde se estava, a que altura, com que lente — até o desenho encaixar nas arestas visíveis do
 * prédio na foto. As dimensões reais (frente, fundo, pé-direito) continuam a vir do formulário
 * principal: são a referência que fixa a escala; esta ferramenta só decide como esse volume real
 * aparece naquela fotografia em concreto.
 *
 * `projetarVolume` (`src/domain/perspectiveCamera.ts`) é o problema direto (dados os parâmetros,
 * onde cai cada ponto no ecrã) — geometria simples, sem ambiguidade, ao contrário de tentar
 * resolver a perspetiva a partir de pontos tocados (`retificarZona`, que fica mal-condicionado
 * fora do caso centrado — ver `docs/DECISOES.md`, 03/11/2026).
 */

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
      <input
        type="range"
        min={min}
        max={max}
        step={passo}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full"
      />
    </label>
  );
}

export function AjustarFotografia({ input }: { input: VolumeInput }) {
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ largura: number; altura: number } | null>(null);
  const [camera, setCamera] = useState<ParametrosCamera>(CAMERA_OMISSAO);
  const [opacidade, setOpacidade] = useState(0.6);

  const importar = (file: File | null) => {
    if (!file) return;
    setNaturalSize(null);
    setImagemUrl(URL.createObjectURL(file));
  };

  const faces = naturalSize ? projetarVolume(input, camera, naturalSize) : [];

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h3 className="text-[15px] font-semibold text-slate-900">Ajustar o volume a uma fotografia</h3>
        <p className="mt-1 text-[13px] text-slate-500">
          Usa as dimensões do formulário acima (frente, fundo, pé-direito, pisos, janelas, varandas). Importar uma fotografia e
          mexer nos deslizadores até o desenho encaixar nas arestas reais do prédio — é o volume declarado a ser visto da mesma
          posição de quem tirou a fotografia.
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
          <div className="relative overflow-hidden rounded-lg border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagemUrl}
              alt=""
              className="block w-full select-none"
              onLoad={(e) => {
                const img = e.currentTarget;
                setNaturalSize({ largura: img.naturalWidth, altura: img.naturalHeight });
              }}
            />
            {naturalSize && (
              <svg viewBox={`0 0 ${naturalSize.largura} ${naturalSize.altura}`} className="pointer-events-none absolute inset-0 h-full w-full">
                {faces.map((f, i) => (
                  <polygon
                    key={i}
                    points={f.points.map((p) => p.join(',')).join(' ')}
                    className={CORES[f.kind]}
                    style={{ opacity: opacidade }}
                    strokeWidth={Math.max(1, naturalSize.largura / 400)}
                  />
                ))}
              </svg>
            )}
          </div>

          <label className="block max-w-xs">
            <span className="mb-1 flex items-center justify-between text-[15px] font-medium text-slate-700">
              <span>Opacidade do desenho</span>
              <span className="font-mono tabular-nums text-slate-900">{Math.round(opacidade * 100)}%</span>
            </span>
            <input type="range" min={0.1} max={1} step={0.05} value={opacidade} onChange={(e) => setOpacidade(Number(e.target.value))} className="h-11 w-full" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Deslizador
              rotulo="Distância a que se estava"
              valor={camera.distanciaM}
              min={2}
              max={60}
              passo={0.5}
              unidade=" m"
              onChange={(v) => setCamera((c) => ({ ...c, distanciaM: v }))}
            />
            <Deslizador
              rotulo="Altura do olho (de quem fotografou)"
              valor={camera.alturaOlhoM}
              min={0.3}
              max={3}
              passo={0.05}
              unidade=" m"
              onChange={(v) => setCamera((c) => ({ ...c, alturaOlhoM: v }))}
            />
            <Deslizador
              rotulo="Ângulo de observação"
              valor={camera.azimuteGraus}
              min={-180}
              max={180}
              passo={1}
              unidade="º"
              onChange={(v) => setCamera((c) => ({ ...c, azimuteGraus: v }))}
            />
            <Deslizador
              rotulo="Campo de visão (lente)"
              valor={camera.fovVerticalGraus}
              min={25}
              max={100}
              passo={1}
              unidade="º"
              onChange={(v) => setCamera((c) => ({ ...c, fovVerticalGraus: v }))}
            />
          </div>

          <button type="button" className="btn-quiet btn-sm" onClick={() => setCamera(CAMERA_OMISSAO)}>
            Repor câmara
          </button>
          <button
            type="button"
            className="btn-quiet btn-sm"
            onClick={() => {
              setImagemUrl(null);
              setNaturalSize(null);
            }}
          >
            Trocar fotografia
          </button>
        </div>
      )}
    </div>
  );
}
