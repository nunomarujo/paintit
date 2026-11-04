'use client';

import { useMemo, useRef, useState } from 'react';
import { enquadramento, montarModelo, type FaceMedida, type TipoPoligono } from './modelo3d';

const ESTILO: Record<TipoPoligono, { normal: string; sombra?: string; tracejado?: boolean }> = {
  parede: { normal: 'fill-tinta-100 stroke-tinta-600' },
  'parede-por-medir': { normal: 'fill-slate-100 stroke-slate-400', tracejado: true },
  topo: { normal: 'fill-slate-200 stroke-slate-500' },
  fachada: { normal: 'fill-tinta-100 stroke-tinta-600' },
  rc: { normal: 'fill-slate-400 stroke-slate-700' },
  vao: { normal: 'fill-violet-500 stroke-violet-800' },
  marquise: { normal: 'fill-sky-300 stroke-sky-700', sombra: 'fill-sky-500 stroke-sky-700' },
  varanda: { normal: 'fill-emerald-300/70 stroke-emerald-800', sombra: 'fill-emerald-600/70 stroke-emerald-800' },
};

/**
 * O prédio montado com o que se mediu, a rodar (arrastar ou setas). Cores das zonas iguais às do
 * desenho; nenhuma fotografia no volume — só retângulos medidos.
 */
export function Modelo3D({ faces, larguraM, fundoM, alturaM }: { faces: FaceMedida[]; larguraM: number; fundoM: number; alturaM: number }) {
  const [azimute, setAzimute] = useState(-30);
  const arrasto = useRef<{ x: number; de: number } | null>(null);
  const pols = useMemo(
    () => montarModelo(faces, { larguraM, fundoM, alturaM }, { azimute, elevacao: 18 }),
    [faces, larguraM, fundoM, alturaM, azimute],
  );
  const caixa = enquadramento(pols, 1);
  const rodar = (d: number) => setAzimute((a) => ((((a + d + 180) % 360) + 360) % 360) - 180);

  return (
    <div className="select-none space-y-2">
      <div
        role="application"
        aria-label="Volume do prédio com as zonas medidas. Arrastar ou usar as setas para rodar."
        tabIndex={0}
        className="cursor-ew-resize touch-none rounded-lg border border-slate-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tinta-600"
        onPointerDown={(e) => {
          e.preventDefault();
          arrasto.current = { x: e.clientX, de: azimute };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const a = arrasto.current;
          if (a) setAzimute(((((a.de - (e.clientX - a.x) * 0.5 + 180) % 360) + 360) % 360) - 180);
        }}
        onPointerUp={() => (arrasto.current = null)}
        onPointerCancel={() => (arrasto.current = null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') rodar(15);
          if (e.key === 'ArrowRight') rodar(-15);
        }}
      >
        <svg
          viewBox={`${caixa.x} ${caixa.y} ${caixa.largura} ${caixa.altura}`}
          className="mx-auto block h-80 w-full sm:h-[28rem]"
          aria-hidden
        >
          {pols.map((p, i) => {
            const e = ESTILO[p.tipo];
            return (
              <polygon
                key={i}
                points={p.pontos.map((q) => `${q.x},${q.y}`).join(' ')}
                className={p.sombra && e.sombra ? e.sombra : e.normal}
                strokeWidth={1}
                strokeDasharray={e.tracejado ? '4 3' : undefined}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>
      <div className="flex items-center justify-center gap-2">
        <button type="button" className="btn-quiet btn-sm" aria-label="Rodar para a esquerda" onClick={() => rodar(30)}>
          ‹ Rodar
        </button>
        <button type="button" className="btn-quiet btn-sm" aria-label="Rodar para a direita" onClick={() => rodar(-30)}>
          Rodar ›
        </button>
      </div>
    </div>
  );
}
