'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { LINE_CATEGORIES, LINE_CATEGORY_LABELS, UNITS, UNIT_LABELS } from '@/domain/proposal';
import type { PriceEntry } from '@/domain/priceBook';
import { addQuoteLine, removeQuoteLine, updateQuoteLine } from '../actions';

const input = 'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm';

/**
 * Acrescentar uma linha, com os preços da própria empresa a aparecer à medida que escreve. Escolher
 * uma sugestão preenche o preço — é aqui que se poupam os 25 minutos de "quanto é que eu cobrei da
 * última vez".
 */
export function AddLine({ quoteId, book }: { quoteId: string; book: PriceEntry[] }) {
  const { state, pending, formProps } = useFormAction<FormState>(addQuoteLine.bind(null, quoteId), { errors: {} }, { resetOnSuccess: true });
  const [preco, setPreco] = useState('');
  const [unidade, setUnidade] = useState('m2');

  // Ao escolher uma descrição que já conhece, traz o preço e a unidade com que a praticou.
  const aoEscrever = (valor: string) => {
    const achado = book.find((b) => b.descricao.toLowerCase() === valor.trim().toLowerCase());
    if (achado) {
      setPreco((achado.precoUnitario / 100).toLocaleString('pt-PT', { minimumFractionDigits: 2 }));
      setUnidade(achado.unidade);
    }
  };

  const msg = Object.values(state.errors)[0] ?? state.message;

  return (
    <form {...formProps} className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-12">
        <label className="sm:col-span-5">
          <span className="block text-[11px] text-slate-500">Trabalho</span>
          <input
            name="descricao"
            list={`book-${quoteId}`}
            onChange={(e) => aoEscrever(e.target.value)}
            placeholder="Duas demãos de tinta acrílica"
            className={`${input} w-full`}
          />
          <datalist id={`book-${quoteId}`}>
            {book.map((b) => (
              <option key={b.id} value={b.descricao}>
                {(b.precoUnitario / 100).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} € · usou {b.vezes}x
              </option>
            ))}
          </datalist>
        </label>
        <label className="sm:col-span-3">
          <span className="block text-[11px] text-slate-500">Capítulo</span>
          <select name="categoria" defaultValue="pintura" className={`${input} w-full`}>
            {LINE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {LINE_CATEGORY_LABELS[c].split(' (')[0]}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-1">
          <span className="block text-[11px] text-slate-500">Un.</span>
          <select name="unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} className={`${input} w-full`}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {UNIT_LABELS[u]}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-1">
          <span className="block text-[11px] text-slate-500">Qt.</span>
          <input name="quantidade" inputMode="decimal" placeholder="0" className={`${input} w-full text-right`} />
        </label>
        <label className="sm:col-span-2">
          <span className="block text-[11px] text-slate-500">Preço unit.</span>
          <input name="preco" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="0,00" className={`${input} w-full text-right`} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-secondary">
          {pending ? 'A acrescentar…' : 'Acrescentar linha'}
        </button>
        {msg && <span className="text-[12px] text-slate-600">{msg}</span>}
      </div>
    </form>
  );
}

/** Quantidade e preço de uma linha existente, editáveis no sítio. */
export function EditLine({
  quoteId,
  lineId,
  quantidade,
  preco,
}: {
  quoteId: string;
  lineId: string;
  quantidade: number;
  preco: number;
}) {
  const { pending, formProps } = useFormAction<FormState>(updateQuoteLine.bind(null, quoteId, lineId), { errors: {} });
  const n = (v: number) => (v / 100).toLocaleString('pt-PT', { minimumFractionDigits: 2 });
  return (
    <form {...formProps} className="flex items-center justify-end gap-1.5">
      <input name="quantidade" defaultValue={n(quantidade)} inputMode="decimal" className={`${input} w-20 text-right`} aria-label="Quantidade" />
      <input name="preco" defaultValue={n(preco)} inputMode="decimal" className={`${input} w-24 text-right`} aria-label="Preço unitário" />
      <button type="submit" disabled={pending} className="text-[12px] font-semibold text-tinta-700 underline underline-offset-4">
        {pending ? '…' : 'Guardar'}
      </button>
    </form>
  );
}

export function RemoveLine({ quoteId, lineId }: { quoteId: string; lineId: string }) {
  const { pending, formProps } = useFormAction<FormState>(removeQuoteLine.bind(null, quoteId, lineId), { errors: {} });
  return (
    <form {...formProps}>
      <button type="submit" disabled={pending} className="text-[12px] text-slate-400 underline underline-offset-4 hover:text-slate-700">
        {pending ? '…' : 'Remover'}
      </button>
    </form>
  );
}
