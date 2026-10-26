'use client';

import { useRef, useState } from 'react';
import { BuildingVolume } from '@/components/BuildingVolume';
import type { VolumeInput } from '@/domain/volume';

/**
 * Volume genérico que se roda, como exige o requisito PIN-06 ("o profissional pode rodar o volume"),
 * MOD-06 e ECR-C04. O desenho continua a ser gerado só das declarações: o ângulo é um parâmetro puro,
 * por isso rodar não revela nada que o desenho parado já não mostrasse, e dois prédios com as mesmas
 * declarações continuam a dar o mesmo volume em todos os ângulos.
 *
 * Sem JavaScript, fica o volume de frente — a informação essencial (lista, medidas) nunca depende
 * desta navegação, como o requisito também exige.
 */
export function VolumeViewer({ className, legenda = true, ...input }: VolumeInput & { className?: string; legenda?: boolean }) {
  const [angulo, setAngulo] = useState(input.angulo ?? 25);
  const arrasto = useRef<{ x: number; de: number } | null>(null);

  const rodar = (d: number) => setAngulo((a) => (((a + d) % 360) + 360) % 360);

  return (
    <div className="select-none">
      <div
        role="application"
        aria-label="Volume genérico do prédio. Arrastar ou usar as setas para rodar."
        tabIndex={0}
        className={`cursor-ew-resize touch-none rounded-lg ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tinta-600 ${className ?? ''}`}
        onPointerDown={(e) => {
          arrasto.current = { x: e.clientX, de: angulo };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const a = arrasto.current;
          if (!a) return;
          // Meio grau por píxel: uma passagem pelo ecrã dá pouco mais de meia volta.
          setAngulo(((((a.de + (e.clientX - a.x) * 0.5) % 360) + 360) % 360));
        }}
        onPointerUp={() => {
          arrasto.current = null;
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') rodar(-15);
          else if (e.key === 'ArrowRight') rodar(15);
          else if (e.key === 'Home') setAngulo(0);
          else return;
          e.preventDefault();
        }}
      >
        <BuildingVolume {...input} angulo={angulo} className="h-full w-full" />
      </div>
      <div className="mt-1 flex items-center justify-center gap-1 text-[15px] text-slate-500">
        <button type="button" onClick={() => rodar(-45)} aria-label="Rodar para a esquerda" className="rounded px-2 py-0.5 hover:bg-slate-100">
          ←
        </button>
        <button type="button" onClick={() => setAngulo(25)} className="rounded px-2 py-0.5 hover:bg-slate-100">
          De frente
        </button>
        <button type="button" onClick={() => rodar(45)} aria-label="Rodar para a direita" className="rounded px-2 py-0.5 hover:bg-slate-100">
          →
        </button>
      </div>
      {legenda && <p className="text-center text-[15px] text-slate-500">Volume genérico, não à escala. Arrastar para rodar.</p>}
    </div>
  );
}
