'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { savePrices } from '@/app/app/oportunidades/orcamento-actions';
import { outcome, useBudget, useStepSaver } from './BudgetContext';
import { useFormAction } from '@/components/useFormAction';
import { formatEuros } from '@/domain/money';
import { parseEuros } from '@/domain/proposal';
import { parseHundredths } from '@/domain/request';
import { WORK_STATE_LABELS, type WorkState } from '@/domain/works';

export interface PriceRow {
  key: string;
  descricao: string;
  /** Quantidade em centésimos (m², m); 100 e unidade 'vg' nos valores globais. */
  quantidade: number;
  unidade: 'm2' | 'ml' | 'un' | 'vg';
  estado: WorkState;
  /** Preço guardado, em euros ("8,50"), ou ''. */
  preco: string;
}

const UNIT = { m2: 'm²', ml: 'm', un: 'un.', vg: 'valor global' } as const;
const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-right text-base';
const cents = (s: string) => {
  const v = parseEuros(s);
  return v === null || Number.isNaN(v) ? 0 : v;
};

export function PricesEditor({
  proposalId,
  requestId,
  rows,
  modoPreco,
  global,
  iva,
}: {
  proposalId: string;
  requestId: string;
  rows: PriceRow[];
  modoPreco: 'detalhado' | 'global';
  global: string;
  iva: string;
}) {
  const { go } = useBudget();
  const { state, pending, formProps } = useFormAction<FormState>(savePrices.bind(null, proposalId, requestId), { errors: {} });
  const [modo, setModo] = useState(modoPreco);
  const [prices, setPrices] = useState<Record<string, string>>(Object.fromEntries(rows.map((r) => [r.key, r.preco])));
  const [globalPrice, setGlobalPrice] = useState(global);
  const [ivaText, setIva] = useState(iva);
  // Os preços dos trabalhos que entraram depois (guardados no passo anterior) vêm das linhas.
  const priceOf = (r: PriceRow) => prices[r.key] ?? r.preco;
  const payload = JSON.stringify({ modo, global: globalPrice, iva: ivaText, prices: Object.fromEntries(rows.map((r) => [r.key, priceOf(r)])) });
  const touched = useRef(false);
  const edit = <T,>(set: (v: T) => void) => (v: T) => {
    touched.current = true;
    set(v);
  };

  useEffect(() => {
    if (state.ok) touched.current = false;
  }, [state]);

  useStepSaver('precos', {
    dirty: () => touched.current,
    save: async () => {
      const form = new FormData();
      form.set('payload', payload);
      const error = outcome(await savePrices(proposalId, requestId, { errors: {} }, form));
      if (!error) touched.current = false;
      return error;
    },
  });

  const lineTotal = (r: PriceRow) => Math.round((r.quantidade * cents(priceOf(r))) / 100);
  const included = rows.filter((r) => r.estado === 'base');
  const sum = (list: PriceRow[]) => list.reduce((n, r) => n + lineTotal(r), 0);
  const base = modo === 'global' ? cents(globalPrice) : sum(included);
  const ivaBps = parseHundredths(ivaText);
  const validIva = ivaBps !== null && !Number.isNaN(ivaBps) && ivaBps >= 0 && ivaBps <= 3000;
  const iva$ = validIva ? Math.round((base * ivaBps!) / 10000) : 0;
  const errorText = state.message ?? Object.values(state.errors)[0];

  return (
    <form autoComplete="off" {...formProps} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <input type="hidden" name="payload" value={payload} />
      <div className="space-y-6 p-5 md:p-7">
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Como quer apresentar o preço?</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {([['detalhado', 'Discriminado por trabalho', 'O cliente vê o preço de cada trabalho.'], ['global', 'Preço global da obra', 'Um só valor; os trabalhos ficam descritos, sem preço.']] as const).map(([k, title, text]) => (
              <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${modo === k ? 'border-tinta-600 bg-tinta-50' : 'border-slate-300'}`}>
                <input type="radio" name="modo-visivel" checked={modo === k} onChange={() => edit(setModo)(k)} className="mt-1" />
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="block text-sm text-slate-600">{text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {modo === 'detalhado' ? (
          rows.length === 0 ? (
            <p className="rounded-xl bg-amber-50 p-4 text-sm">Ainda não escolheu trabalhos. Volte ao passo &ldquo;Trabalhos&rdquo;.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-2 font-normal">Trabalho</th>
                    <th className="w-44 py-2 text-right font-normal">Preço (€, sem IVA)</th>
                    <th className="w-32 py-2 text-right font-normal">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.key} className={r.estado === 'base' ? '' : 'text-slate-500'}>
                      <td className="py-3 pr-3">
                        <span className="font-medium text-slate-900">{r.descricao}</span>
                        <span className="block text-xs">
                          {r.unidade === 'vg' ? 'Valor global do trabalho' : `${(r.quantidade / 100).toLocaleString('pt-PT', { maximumFractionDigits: 2 })} ${UNIT[r.unidade]}`}
                          {r.estado !== 'base' && ` · ${WORK_STATE_LABELS[r.estado]}`}
                        </span>
                      </td>
                      <td className="py-3">
                        {r.estado === 'nao_incluido' ? (
                          <span className="block text-right text-xs">Sem preço</span>
                        ) : (
                          <label>
                            <span className="sr-only">Preço de {r.descricao}</span>
                            <input value={priceOf(r)} onChange={(e) => edit(setPrices)({ ...prices, [r.key]: e.target.value })} inputMode="decimal" placeholder={r.unidade === 'vg' ? '€ total' : `€ por ${UNIT[r.unidade]}`} className={field} />
                          </label>
                        )}
                      </td>
                      <td className="py-3 text-right font-medium">{r.estado === 'nao_incluido' ? '—' : formatEuros(lineTotal(r))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <label className="block max-w-sm text-sm font-medium text-slate-700">
            Preço global da obra, sem IVA (€)
            <input value={globalPrice} onChange={(e) => edit(setGlobalPrice)(e.target.value)} inputMode="decimal" className={`mt-1 ${field}`} />
          </label>
        )}

        <dl className="ml-auto grid max-w-sm grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 text-sm">
          <dt className="text-slate-600">Preço sem IVA</dt>
          <dd className="text-right text-base font-semibold">{formatEuros(base)}</dd>
          <dt className="text-slate-600">
            <label htmlFor="iva">IVA (%)</label>
          </dt>
          <dd className="flex items-center justify-end gap-3">
            <input id="iva" value={ivaText} onChange={(e) => edit(setIva)(e.target.value)} inputMode="decimal" className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-right" aria-invalid={!validIva} />
            <span className="w-24 text-right">{formatEuros(iva$)}</span>
          </dd>
          <dt className="font-semibold">Total com IVA</dt>
          <dd className="text-right text-lg font-semibold">{formatEuros(base + iva$)}</dd>
          {modo === 'detalhado' && sum(rows.filter((r) => r.estado === 'opcional')) > 0 && (
            <>
              <dt className="text-slate-500">Opcionais (não somados)</dt>
              <dd className="text-right text-slate-500">{formatEuros(sum(rows.filter((r) => r.estado === 'opcional')))}</dd>
            </>
          )}
          {modo === 'detalhado' && sum(rows.filter((r) => r.estado === 'confirmar')) > 0 && (
            <>
              <dt className="text-slate-500">A confirmar (indicativo)</dt>
              <dd className="text-right text-slate-500">{formatEuros(sum(rows.filter((r) => r.estado === 'confirmar')))}</dd>
            </>
          )}
        </dl>
        <p className="text-xs text-slate-500">O IVA é 23% na maioria dos casos; altere-o se a obra tiver outra taxa (por exemplo, 6%).</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
        <p className="text-sm" role="status">
          {errorText ? <span className="text-red-700">{errorText}</span> : state.ok ? <span className="text-tinta-700">{state.message}</span> : null}
        </p>
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="btn-secondary">
            {pending ? 'A guardar…' : 'Guardar rascunho'}
          </button>
          <button type="button" disabled={pending || !validIva} onClick={() => go('condicoes')} className="btn-primary">
            Continuar para as condições →
          </button>
        </div>
      </div>
    </form>
  );
}
