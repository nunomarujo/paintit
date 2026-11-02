'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { COMPROMISSOS_DO_AVALIADOR, VALOR_DE_EXEMPLO_CENTS, percentagemEmPalavras, simularGanho } from '@/domain/avaliador';
import { formatEuros } from '@/domain/money';
import type { SurveyorPerformance } from '@/domain/survey';
import { declararAvaliador } from './actions';

/** A autodeclaração: quatro compromissos, todos marcados, e um botão. */
export function Autodeclaracao() {
  const { state, pending, formProps } = useFormAction<FormState>(declararAvaliador, { errors: {} });
  return (
    <form {...formProps} className="space-y-4">
      <ul className="space-y-2">
        {COMPROMISSOS_DO_AVALIADOR.map((c, i) => (
          <li key={c}>
            <label className="flex min-h-[44px] items-start gap-3 rounded-lg bg-paper px-4 py-3 text-[17px] text-slate-900">
              <input name="compromisso" value={i} type="checkbox" className="mt-1 h-5 w-5 flex-none rounded border-slate-300 text-tinta-600" />
              {c}
            </label>
          </li>
        ))}
      </ul>
      {(state.errors.compromissos || state.message) && (
        <p className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-amber-800'}`} role="status">
          {state.errors.compromissos ?? state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? 'A registar…' : 'Inscrever-me como avaliador'}
      </button>
      <p className="max-w-[54ch] text-[15px] text-slate-600">
        A inscrição é uma declaração sua, com data. A plataforma confia nela e verifica-a pelo trabalho: as
        avaliações dos clientes e dos pintores fazem subir ou descer a sua percentagem.
      </p>
    </form>
  );
}

/**
 * O simulador: o valor da obra entra à mão; a % vem da regra real (`surveyorShareBp`) com o desempenho
 * atual da pessoa. Sem avaliações ainda, está a meio da banda — e o simulador diz isso.
 */
export function SimuladorDeGanho({ desempenho }: { desempenho: SurveyorPerformance }) {
  const [valor, setValor] = useState(VALOR_DE_EXEMPLO_CENTS / 100);
  const cents = Math.max(0, Math.round(valor * 100));
  const s = simularGanho(cents, desempenho);
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <label className="block text-[17px] font-medium text-slate-700">
        Valor da obra adjudicada, sem IVA
        <div className="campo mt-1 flex items-center gap-2">
          <input
            id="valor-da-obra"
            type="number"
            inputMode="decimal"
            min={0}
            step={500}
            value={valor}
            onChange={(e) => setValor(Number(e.target.value))}
            className="min-w-0 flex-1 bg-transparent text-[17px] tabular-nums outline-none"
          />
          <span className="text-slate-500">€</span>
        </div>
      </label>
      <div className="rounded-2xl bg-tinta-900 p-5 text-white">
        <p className="text-[13px] font-semibold text-lima">A sua comissão nesta obra, hoje</p>
        <p className="mt-1 text-[34px] font-semibold leading-none tabular-nums">{formatEuros(s.ganhoCents)}</p>
        <p className="mt-2 text-[15px] text-tinta-100">
          {percentagemEmPalavras(s.shareBp)} do valor adjudicado. A banda vai de {formatEuros(s.minimoCents)} (1%) a{' '}
          {formatEuros(s.maximoCents)} (2,7%), conforme o desempenho. Recebe-a seja qual for o pintor escolhido; nunca
          acima da comissão que a plataforma receber nessa obra.
        </p>
      </div>
    </div>
  );
}
