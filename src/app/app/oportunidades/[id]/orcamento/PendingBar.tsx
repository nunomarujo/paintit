'use client';

import { useState } from 'react';
import type { BudgetPending } from '@/domain/works';
import { useBudget } from './BudgetContext';

/** Âncora que o editor de trabalhos escuta para abrir o trabalho certo. */
export const workHash = (key: string) => `#trabalho-${key}`;

/**
 * Barra de pendências do orçamento (pedido do promotor, 24/10/2026): uma linha com o que falta e um
 * botão que **leva ao campo**, com setas para andar entre as pendências.
 *
 * Antes era uma lista de doze frases no fim da página: dizia o que faltava e deixava a pessoa à
 * procura do sítio. Agora a lista está recolhida e o caminho é um clique.
 */
export function PendingBar({ pendings }: { pendings: BudgetPending[] }) {
  const { go } = useBudget();
  const [i, setI] = useState(0);
  const [aberto, setAberto] = useState(false);
  if (pendings.length === 0) return null;

  const total = pendings.length;
  const atual = pendings[Math.min(i, total - 1)]!;
  const andar = (d: number) => setI((n) => (n + d + total) % total);

  const ir = async () => {
    await go(atual.passo);
    if (atual.key) {
      // O editor de trabalhos escuta a âncora e abre o trabalho; depois leva-o ao ecrã.
      window.location.hash = workHash(atual.key);
      requestAnimationFrame(() => document.getElementById('orcamento')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  return (
    <div className="border-b border-amber-200 bg-amber-50 text-sm text-amber-800">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
        <p className="min-w-0">
          <span className="font-medium">
            {total} {total === 1 ? 'pendência' : 'pendências'}:
          </span>{' '}
          <span className="text-amber-900">{atual.texto}</span>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => andar(-1)}
            disabled={total < 2}
            aria-label="Pendência anterior"
            className="rounded-lg px-2 py-1 font-semibold hover:bg-amber-100 disabled:opacity-40"
          >
            ‹
          </button>
          <span className="tabular-nums text-xs text-amber-700">
            {Math.min(i, total - 1) + 1}/{total}
          </span>
          <button
            type="button"
            onClick={() => andar(1)}
            disabled={total < 2}
            aria-label="Pendência seguinte"
            className="rounded-lg px-2 py-1 font-semibold hover:bg-amber-100 disabled:opacity-40"
          >
            ›
          </button>
          <button type="button" onClick={ir} className="ml-1 rounded-lg bg-amber-800 px-3 py-1 font-semibold text-amber-50">
            Ir para
          </button>
          <button
            type="button"
            onClick={() => setAberto(!aberto)}
            aria-expanded={aberto}
            className="rounded-lg px-2 py-1 text-xs underline hover:bg-amber-100"
          >
            {aberto ? 'Fechar' : 'Ver todas'}
          </button>
        </div>
      </div>
      {aberto && (
        <ul className="border-t border-amber-200 px-4 py-2 text-xs">
          {pendings.map((p, n) => (
            <li key={p.id} className="py-0.5">
              <button
                type="button"
                onClick={() => setI(n)}
                className={`text-left hover:underline ${n === Math.min(i, total - 1) ? 'font-semibold' : ''}`}
              >
                {n + 1}. {p.texto}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
