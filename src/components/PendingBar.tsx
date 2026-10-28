'use client';

import { useState } from 'react';

export interface Pendencia {
  /** Estável entre renderizações: serve de âncora para a navegação. */
  id: string;
  texto: string;
}

/**
 * Barra de pendências: uma linha com o que falta e um botão que **leva lá**, com setas para andar
 * entre as pendências (pedido do promotor, 24/10/2026).
 *
 * Antes eram listas de frases no fim da página: diziam o que faltava e deixavam a pessoa à procura
 * do sítio. Quem sabe levar lá é quem a usa, por isso a navegação entra por `onIr`.
 */
export function PendingBar<P extends Pendencia>({
  pendings,
  onIr,
  rotulo = 'pendência',
  rotuloPlural = 'pendências',
}: {
  pendings: P[];
  onIr: (p: P) => void | Promise<void>;
  rotulo?: string;
  rotuloPlural?: string;
}) {
  const [i, setI] = useState(0);
  const [aberto, setAberto] = useState(false);
  if (pendings.length === 0) return null;

  const total = pendings.length;
  const n = Math.min(i, total - 1);
  const atual = pendings[n]!;
  const andar = (d: number) => setI((x) => (x + d + total) % total);

  return (
    <div className="border-b border-amber-200 bg-amber-50 text-[17px] text-amber-800">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
        <p className="min-w-0">
          <span className="font-medium">
            {total} {total === 1 ? rotulo : rotuloPlural}:
          </span>{' '}
          <span className="text-amber-900">{atual.texto}</span>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => andar(-1)}
            disabled={total < 2}
            aria-label={`${rotulo} anterior`}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-2 font-semibold hover:bg-amber-100 disabled:opacity-40"
          >
            ‹
          </button>
          <span className="tabular-nums text-[15px] text-amber-700">
            {n + 1}/{total}
          </span>
          <button
            type="button"
            onClick={() => andar(1)}
            disabled={total < 2}
            aria-label={`${rotulo} seguinte`}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-2 font-semibold hover:bg-amber-100 disabled:opacity-40"
          >
            ›
          </button>
          <button type="button" onClick={() => void onIr(atual)} className="ml-1 inline-flex min-h-[44px] items-center rounded-lg bg-amber-800 px-3.5 font-semibold text-amber-50">
            Ir para
          </button>
          <button
            type="button"
            onClick={() => setAberto(!aberto)}
            aria-expanded={aberto}
            className="inline-flex min-h-[44px] items-center rounded-lg px-2 text-[15px] underline hover:bg-amber-100"
          >
            {aberto ? 'Fechar' : 'Ver todas'}
          </button>
        </div>
      </div>
      {aberto && (
        <ul className="border-t border-amber-200 px-4 py-2 text-[15px]">
          {pendings.map((p, k) => (
            <li key={p.id}>
              <button type="button" onClick={() => setI(k)} className={`flex min-h-[44px] w-full items-center text-left hover:underline ${k === n ? 'font-semibold' : ''}`}>
                {k + 1}. {p.texto}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
