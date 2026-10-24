'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';

export interface WorkspaceTab {
  id: string;
  label: string;
  content: ReactNode;
  /** Separador sem conteúdo nenhum não aparece. */
  vazio?: boolean;
  /**
   * Separador ainda fechado: aparece pálido, com cadeado, e ao ser carregado explica porquê em vez de
   * mostrar o conteúdo. Fica visível de propósito — saber que existe, e quando abre, faz parte do que
   * a pessoa precisa de perceber.
   */
  bloqueado?: string;
}

/**
 * Área de trabalho de um pedido (pedido do promotor, 24/10/2026): cabeçalho compacto com o
 * essencial da obra e separadores, em vez de uma página corrida onde era preciso descer para
 * encontrar o que quer que fosse — "não há imediata perceção onde está o quê".
 *
 * O conteúdo é o mesmo que já existia na página: foi movido para aqui, não duplicado. Os painéis
 * ficam todos montados e só escondidos, para que mudar de separador não perca nada que esteja a
 * meio de preencher.
 */
export function Workspace({
  titulo,
  referencia,
  resumo,
  documentoHref,
  tabs,
  inicial,
}: {
  titulo: string;
  /** Referência do pedido. Não se chama `ref`: o React reserva esse nome e recusa-o na fronteira
   * servidor→cliente ("Refs cannot be used in Server Components"). */
  referencia: string;
  /** Pares etiqueta/valor do cabeçalho: área, prazos. */
  resumo: { label: string; valor: string }[];
  /** Ligação para o orçamento em PDF, quando já existe orçamento. */
  documentoHref?: string | null;
  tabs: WorkspaceTab[];
  inicial?: string;
}) {
  const visiveis = tabs.filter((t) => !t.vazio);
  const [atual, setAtual] = useState(inicial && visiveis.some((t) => t.id === inicial) ? inicial : (visiveis.find((t) => !t.bloqueado)?.id ?? visiveis[0]?.id ?? ''));

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-tinta-600">{titulo}</h1>
          <p className="text-xs text-slate-400">Pedido {referencia}</p>
        </div>
        <dl className="flex flex-wrap gap-6 text-sm">
          {resumo.map((r) => (
            <div key={r.label}>
              <dt className="text-xs text-slate-500">{r.label}</dt>
              <dd className="font-semibold">{r.valor}</dd>
            </div>
          ))}
        </dl>
        {documentoHref && (
          <Link
            href={documentoHref}
            className="inline-flex items-center gap-2 rounded-lg border border-tinta-200 bg-tinta-50 px-3 py-2 text-sm font-semibold text-tinta-700 hover:bg-tinta-100"
          >
            <span aria-hidden>▤</span> Ver PDF
          </Link>
        )}
      </header>

      <nav aria-label="Áreas do pedido" className="mt-4 flex flex-wrap gap-1.5">
        {visiveis.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setAtual(t.id)}
            aria-current={t.id === atual ? 'page' : undefined}
            className={`rounded-t-xl border border-b-0 px-4 py-2.5 text-sm font-semibold ${
              t.id === atual ? 'border-tinta-200 bg-sage text-tinta-600' : 'border-transparent hover:text-slate-700'
            } ${t.bloqueado ? 'text-slate-400' : t.id === atual ? '' : 'text-slate-500'}`}
          >
            {t.bloqueado && (
              <span aria-hidden className="mr-1.5">
                🔒
              </span>
            )}
            {t.label}
          </button>
        ))}
      </nav>
      <div className="rounded-b-2xl rounded-tr-2xl border border-slate-200 bg-white p-5">
        {visiveis.map((t) => (
          <div key={t.id} hidden={t.id !== atual} className="space-y-6">
            {t.bloqueado ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <span aria-hidden className="mr-1.5">
                  🔒
                </span>
                {t.bloqueado}
              </p>
            ) : (
              t.content
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
