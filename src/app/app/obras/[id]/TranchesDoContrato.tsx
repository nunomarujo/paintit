'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { formatEuros } from '@/domain/money';
import type { TrancheDoContrato } from '@/domain/tranchesDoContrato';

const pt = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : null);

/**
 * O plano de pagamentos do contrato, pronto a virar tranches.
 *
 * Mostra-se inteiro antes de se carregar no botão — valores e datas — porque o que se cria aqui é o
 * que o cliente vai ser lembrado de pagar, e em nome do pintor. Não se cria sozinho por isso mesmo:
 * um toque é pouco esforço para uma coisa que depois sai em mensagens para o cliente dele.
 */
export function TranchesDoContrato({
  action,
  plano,
  datadas,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  plano: TrancheDoContrato[];
  /** Falso quando a obra ainda não tem início e fim: aí as tranches nascem sem data. */
  datadas: boolean;
}) {
  const { state, pending, formProps } = useFormAction<FormState>(action, { errors: {} });
  const total = plano.reduce((n, t) => n + t.valorCents, 0);

  return (
    <form {...formProps} className="rounded-xl border border-tinta-200 bg-tinta-50/60 p-4">
      <p className="text-[17px] font-semibold text-slate-900">O contrato já diz como o cliente paga</p>
      <p className="mt-1 text-[15px] leading-relaxed text-slate-600">
        Está no plano de pagamentos da proposta que o cliente escolheu. Em vez de o copiar à mão, crie as tranches
        a partir dele:
      </p>
      <ul className="mt-3 divide-y divide-tinta-200/70 text-[17px]">
        {plano.map((t, i) => (
          <li key={`${t.descricao}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5">
            <span>{t.descricao}</span>
            <span className="tabular-nums font-medium">
              {formatEuros(t.valorCents)}
              {t.prevista && <span className="ml-2 font-normal text-slate-500">prevista {pt(t.prevista)}</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[15px] text-slate-600">
        {formatEuros(total)} ao todo, com IVA — o valor do contrato, ao cêntimo.{' '}
        {datadas
          ? 'As datas são repartidas pelo período previsto da obra e podem ser alteradas uma a uma.'
          : 'Ficam sem data porque a obra ainda não tem início e fim; pode datá-las depois.'}
      </p>
      <button type="submit" disabled={pending} className="btn-secondary mt-3">
        {pending ? 'A criar…' : 'Criar as tranches do contrato'}
      </button>
      {state.message && (
        <p className={`mt-2 text-[15px] ${state.ok ? 'text-tinta-700' : 'text-amber-900'}`} role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
