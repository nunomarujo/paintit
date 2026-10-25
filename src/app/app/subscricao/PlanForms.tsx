'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { PRECO_ATUAL, poupancaAnual, type Periodicidade } from '@/domain/painterPlan';
import { formatEuros } from '@/domain/money';
import { cancelPro, subscribePro } from './actions';

const EMPTY: FormState = { errors: {} };

/** Adesão: escolhe-se a periodicidade antes de aderir, porque é a decisão que muda o preço. */
export function SubscribeForm() {
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>('anual');
  const { state, formProps, pending } = useFormAction<FormState>(subscribePro, EMPTY);

  if (state.ok) {
    return (
      <p className="rounded-xl border border-tinta-200 bg-tinta-50 p-4 text-sm text-tinta-800" role="status">
        {state.message}
      </p>
    );
  }

  return (
    <form {...formProps} className="space-y-3">
      <input type="hidden" name="periodicidade" value={periodicidade} />
      <div className="grid gap-2 sm:grid-cols-2">
        {(['anual', 'mensal'] as const).map((p) => {
          const escolhido = periodicidade === p;
          const preco = p === 'anual' ? PRECO_ATUAL.anualCents : PRECO_ATUAL.mensalCents;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodicidade(p)}
              aria-pressed={escolhido}
              className={`rounded-xl border p-3 text-left transition-colors ${
                escolhido ? 'border-tinta-600 bg-tinta-50' : 'border-slate-300 bg-white hover:bg-slate-50'
              }`}
            >
              <span className="block text-[13px] font-semibold text-slate-900">{p === 'anual' ? 'Anual' : 'Mensal'}</span>
              <span className="block text-[20px] font-semibold tracking-tight text-slate-900">{formatEuros(preco)}</span>
              <span className="block text-[11px] text-slate-600">
                {p === 'anual' ? `uma vez por ano · poupa ${formatEuros(poupancaAnual())}` : 'por mês'}
              </span>
            </button>
          );
        })}
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? 'A registar…' : `Aderir ao plano Pro — ${formatEuros(periodicidade === 'anual' ? PRECO_ATUAL.anualCents : PRECO_ATUAL.mensalCents)}`}
      </button>
      <p className="text-[11px] text-slate-500">
        A adesão fica registada e só passa a activa depois do pagamento. Pode cancelar quando quiser; o desconto mantém-se
        até ao fim do período que já pagou.
      </p>
      {state.message && !state.ok && <p className="text-[12px] text-red-700">{state.message}</p>}
    </form>
  );
}

export function CancelForm() {
  const { state, formProps, pending } = useFormAction<FormState>(cancelPro, EMPTY);
  if (state.ok) return <p className="text-[12px] text-slate-600">{state.message}</p>;
  return (
    <form {...formProps}>
      <button type="submit" disabled={pending} className="text-[12px] text-slate-500 underline underline-offset-4 hover:text-slate-700">
        {pending ? 'A cancelar…' : 'Cancelar a subscrição'}
      </button>
      {state.message && <span className="ml-2 text-[12px] text-red-700">{state.message}</span>}
    </form>
  );
}
