'use client';

import { useState } from 'react';
import { FORMAS, FORMA_LABELS, footprintPlan, type Forma } from '@/domain/volume';

/**
 * Escolha da forma de implantação, vista de cima (pedido do promotor, 24/10/2026): em vez de descrever
 * a planta por palavras, o avaliador escolhe a forma canónica mais próxima. Se não souber, pode
 * confirmar a forma no Google Earth antes de escolher — a nota em baixo diz-lho.
 *
 * Não está ligado a nenhum ecrã enquanto a migração `forma_de_implantacao` não estiver aplicada: a
 * coluna `buildings.forma_implantacao` ainda não existe na base real (ver docs/ESTADO.md).
 */
export function FormaPicker({
  valorInicial,
  guardar,
  nome = 'forma_implantacao',
}: {
  valorInicial?: Forma | null;
  /** Grava a escolha. Omitido: o valor viaja no formulário com o nome `nome`. */
  guardar?: (forma: Forma) => void | Promise<void>;
  nome?: string;
}) {
  const [forma, setForma] = useState<Forma | null>(valorInicial ?? null);

  return (
    <fieldset>
      <legend className="text-sm font-medium">Forma do prédio, visto de cima</legend>
      <p className="mt-1 text-xs text-slate-500">
        Escolher a que mais se aproxima. Em dúvida, ver o prédio de cima no Google Earth e comparar.
      </p>
      <ul className="mt-2 grid grid-cols-5 gap-2">
        {FORMAS.map((f) => {
          const rects = footprintPlan(f);
          const w = Math.max(...rects.map((r) => r[2]));
          const h = Math.max(...rects.map((r) => r[3]));
          const escolhida = forma === f;
          return (
            <li key={f}>
              <label className={`block cursor-pointer rounded-lg border p-2 text-center ${escolhida ? 'border-tinta-600 bg-tinta-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input
                  type="radio"
                  name={nome}
                  value={f}
                  checked={escolhida}
                  onChange={() => {
                    setForma(f);
                    void guardar?.(f);
                  }}
                  className="sr-only"
                />
                <svg viewBox={`-1 -1 ${w + 2} ${h + 2}`} className="h-12 w-full" role="img" aria-hidden="true">
                  {rects.map(([x0, y0, x1, y1], i) => (
                    <rect
                      key={i}
                      x={x0}
                      y={y0}
                      width={x1 - x0}
                      height={y1 - y0}
                      className={escolhida ? 'fill-tinta-200 stroke-tinta-700' : 'fill-slate-100 stroke-slate-400'}
                      strokeWidth={0.4}
                    />
                  ))}
                </svg>
                <span className="mt-1 block text-xs">{FORMA_LABELS[f]}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
