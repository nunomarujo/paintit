'use client';

import { useState } from 'react';

/**
 * "Não sabe medir a obra?" — os dois estados do levantamento gratuito (pedido do cliente / reserva
 * do avaliador), réplica do protótipo (`#levantamento`). Sem capturas de ecrã: não há, no
 * repositório, nenhuma imagem real deste ecrã para mostrar, e inventar uma pareceria um produto
 * que ainda não existe — o lado ilustrativo é um ícone simples, não uma simulação de interface.
 */
const ESTADOS = [
  {
    rotulo: '1. Pedir o levantamento',
    tag: 'Do lado do cliente',
    msg: 'O pedido de ajuda fica registado — não é preciso preencher medidas enquanto se aguarda.',
    cond:
      'Quando há um avaliador qualificado de um fornecedor disponível na zona, pode reservar o pedido e ir medir ao local, sem custo acrescentado à obra. Continua sempre a poder medir a obra sozinho, a qualquer momento.',
  },
  {
    rotulo: '2. Um avaliador reserva a visita',
    tag: 'Do lado do avaliador',
    msg: 'Um avaliador da zona vê os pedidos de levantamento disponíveis para reservar.',
    cond: 'A reserva é por ordem de chegada, com uma janela de 48 horas — por isso a disponibilidade depende de haver alguém ativo nessa zona.',
  },
] as const;

export function SurveyDemo() {
  const [atual, setAtual] = useState(0);
  const e = ESTADOS[atual]!;

  return (
    <div className="mt-9 grid gap-7 md:grid-cols-[1.1fr_.9fr] md:items-center">
      <div>
        <div
          aria-hidden
          className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-tinta-50"
        >
          <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-tinta-600">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
            <path d="M14 14l2 2 3.5-4" />
          </svg>
        </div>
        <div className="mt-3.5 flex flex-wrap gap-2">
          {ESTADOS.map((s, i) => (
            <button
              key={s.rotulo}
              type="button"
              aria-pressed={i === atual}
              onClick={() => setAtual(i)}
              className={
                'inline-flex min-h-[36px] items-center rounded-full border px-3 text-[13px] font-semibold ' +
                (i === atual ? 'border-tinta-900 bg-tinta-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100')
              }
            >
              {s.rotulo}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[13px] font-bold text-tinta-700">{e.tag}</p>
        <p className="mt-2 text-[20px] font-bold leading-snug text-tinta-900">{e.msg}</p>
        <p className="mt-2.5 text-[15px] text-slate-600">{e.cond}</p>
      </div>
    </div>
  );
}
