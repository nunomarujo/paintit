'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ICONES } from '@/components/NavIcons';

export interface WorkspaceTab {
  id: string;
  /** Pode levar um contador ou um sinal, não só texto. */
  label: ReactNode;
  content: ReactNode;
  /** Separador sem conteúdo nenhum não aparece. */
  vazio?: boolean;
  /**
   * Separador ainda fechado: aparece pálido, com cadeado, e ao ser carregado explica porquê em vez de
   * mostrar o conteúdo. Fica visível de propósito — saber que existe, e quando abre, faz parte do que
   * a pessoa precisa de perceber.
   */
  bloqueado?: string;
  /**
   * Separador com relógio a correr. É o inverso do bloqueado — ali dizia "ainda não", aqui diz
   * "está a correr". No ecrã do avaliador isto importa: um separador que ele não abra pode
   * custar-lhe a comissão da obra toda.
   *
   * Marca-se com um ponto, não com fundo âmbar (28/10/2026). O fundo violava a regra 13 — cor de
   * aviso usada para destaque ensina a ignorar o aviso — e punha três linguagens visuais na mesma
   * fila de separadores.
   */
  destaque?: boolean;
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
  barra,
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
  /** Faixa logo abaixo dos separadores: pendências, prazos. Fica fora deles de propósito, para não
   * se esconder atrás de um separador fechado. */
  barra?: ReactNode;
}) {
  const visiveis = tabs.filter((t) => !t.vazio);
  const [atual, setAtual] = useState(inicial && visiveis.some((t) => t.id === inicial) ? inicial : (visiveis.find((t) => !t.bloqueado)?.id ?? visiveis[0]?.id ?? ''));

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-semibold text-tinta-600">{titulo}</h1>
          <p className="text-[15px] text-slate-600">Pedido {referencia}</p>
        </div>
        <dl className="flex flex-wrap gap-6 text-[17px]">
          {resumo.map((r) => (
            <div key={r.label}>
              <dt className="text-[15px] text-slate-500">{r.label}</dt>
              <dd className="font-semibold">{r.valor}</dd>
            </div>
          ))}
        </dl>
        {documentoHref && (
          <Link
            href={documentoHref}
            className="inline-flex items-center gap-2 rounded-lg border border-tinta-200 bg-tinta-50 px-3 py-2 text-[17px] font-semibold text-tinta-700 hover:bg-tinta-100"
          >
            <ICONES.folha className="h-[18px] w-[18px] shrink-0" /> Ver PDF
          </Link>
        )}
      </header>

      {/*
        Uma só linguagem para a fila (28/10/2026). Antes havia quatro tratamentos na mesma linha —
        pastilha para o activo, fundo âmbar para o que estava a correr, texto simples para os
        restantes e um emoji de cadeado — e nenhum deles dizia ao utilizador qual era qual. Agora
        só o separador activo tem fundo; o bloqueado leva o cadeado do conjunto de ícones; e o que
        está a correr leva um ponto, que é marca e não alarme.
      */}
      <nav aria-label="Áreas do pedido" className="mt-4 flex flex-wrap gap-1.5">
        {visiveis.map((t) => {
          const activo = t.id === atual;
          const Cadeado = ICONES.cadeado;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setAtual(t.id)}
              aria-current={activo ? 'page' : undefined}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-t-xl border border-b-0 px-4 py-2.5 text-[17px] font-semibold ${
                activo
                  ? 'border-tinta-200 bg-sage text-tinta-600'
                  : `border-transparent hover:text-slate-700 ${t.bloqueado ? 'text-slate-500' : 'text-slate-600'}`
              }`}
            >
              {t.bloqueado && <Cadeado className="h-4 w-4 shrink-0" />}
              {t.label}
              {t.destaque && !activo && (
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-700" />
              )}
            </button>
          );
        })}
      </nav>
      <div className="overflow-hidden rounded-b-2xl rounded-tr-2xl border border-slate-200 bg-white">
        {barra}
        <div className="p-5">
        {visiveis.map((t) => (
          <div key={t.id} hidden={t.id !== atual} className="space-y-6">
            {t.bloqueado ? (
              <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[17px] text-slate-600">
                <ICONES.cadeado className="mt-1 h-[18px] w-[18px] shrink-0" />
                {t.bloqueado}
              </p>
            ) : (
              t.content
            )}
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
