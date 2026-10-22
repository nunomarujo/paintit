'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { saveWorks } from '@/app/app/oportunidades/orcamento-actions';
import { outcome, useBudget, useStepSaver } from './BudgetContext';
import { useFormAction } from '@/components/useFormAction';
import { EQUIVALENT_LABEL, EQUIVALENT_RULE, equivalentEnabled, equivalentFlag } from '@/domain/equivalence';
import { PRODUCT_TYPE_LABELS, type ProductType } from '@/domain/catalog';
import { formatEuros } from '@/domain/money';
import { pricePerLitre, type Preference } from '@/domain/reference';
import {
  productSuggestions,
  type CatalogueProduct,
  WORKS,
  WORK_STATES,
  WORK_STATE_LABELS,
  describeItem,
  isComplete,
  suggestedQuantity,
  workDef,
  type WorkItem,
  type WorkState,
  type Zone,
} from '@/domain/works';

const input = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base';

function SuggestField({
  id,
  label,
  required,
  placeholder,
  value,
  onChange,
  options,
  preferred,
  equivalent,
}: {
  id: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  options: CatalogueProduct[];
  preferred: Preference[];
  /** Caixa «ou equivalente» (ausente = não se oferece). */
  equivalent?: { checked: boolean; onChange: (v: boolean) => void };
}) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [query, setQuery] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  const pref = new Map(preferred.map((p) => [p.id, p]));
  const shown = options
    .filter((o) => `${o.marca} ${o.nome}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => Number(pref.has(b.id)) - Number(pref.has(a.id)));
  return (
    <div ref={box} className="relative sm:col-span-2">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-700"> *</span>}
      </label>
      <div className="mt-1 flex gap-2">
        <input id={id} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={200} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base" />
        <button type="button" aria-expanded={open} aria-controls={`${id}-lista`} onClick={() => setOpen((o) => !o)} className="shrink-0 rounded-lg border border-tinta-600 bg-white px-4 py-2.5 text-sm font-semibold text-tinta-700 hover:bg-tinta-50">
          Sugestões
        </button>
      </div>
      {equivalent && (
        <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-600">
          <label className="flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={equivalent.checked} onChange={(e) => equivalent.onChange(e.target.checked)} />
            {EQUIVALENT_LABEL}
          </label>
          <button type="button" aria-label="O que é «ou equivalente»?" aria-expanded={help} onClick={() => setHelp((h) => !h)} className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-400 text-[10px] font-bold text-slate-600 hover:bg-slate-100">
            ?
          </button>
        </div>
      )}
      {help && (
        <p className="mt-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900" role="note">
          {EQUIVALENT_RULE} O cliente vê este aviso, bem destacado, na proposta, e o contrato inclui os mesmos termos.
        </p>
      )}
      {open && (
        <div id={`${id}-lista`} className="absolute right-0 z-20 mt-1 w-full max-w-xl rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar por marca ou nome" aria-label="Filtrar sugestões" className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <p className="px-2 pb-1 text-xs text-slate-500">Produtos do catálogo adequados a este trabalho.</p>
          <ul className="max-h-72 space-y-1 overflow-auto">
            {shown.length === 0 && <li className="px-2 py-3 text-sm text-slate-600">Sem produtos com este filtro.</li>}
            {shown.map((o) => {
              const perLitre = pricePerLitre({ preco: o.preco_referencia_cents, litros: o.preco_embalagem_l });
              const asked = pref.get(o.id);
              return (
                <li key={o.id} className="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
                  <button
                    type="button"
                    onClick={() => {
                      onChange(`${o.marca} ${o.nome}`);
                      setOpen(false);
                      setQuery('');
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block text-sm font-medium text-slate-900">
                      {o.marca} {o.nome}
                      {asked && <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${asked.fixo ? 'bg-amber-100 text-amber-800' : 'bg-tinta-50 text-tinta-700'}`}>{asked.fixo ? 'Pedido pelo cliente: não substituir' : 'Pedido pelo cliente'}</span>}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {PRODUCT_TYPE_LABELS[o.tipo as ProductType] ?? o.tipo}
                      {o.acabamento ? ` · ${o.acabamento}` : ''}
                      {o.rendimento_m2_l ? ` · ${o.rendimento_m2_l.toLocaleString('pt-PT')} m²/L` : ''}
                      {perLitre !== null ? ` · ref. ${formatEuros(perLitre)}/L` : ''}
                    </span>
                  </button>
                  <a href={`/app/catalogo/referencia/${o.id}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold text-tinta-700 underline">
                    Ficha ↗
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function WorksEditor({
  proposalId,
  requestId,
  zones,
  initial,
  catalogue = [],
  tipoObra = null,
  preferred = [],
}: {
  proposalId: string;
  requestId: string;
  zones: Zone[];
  initial: WorkItem[];
  /** Produtos de referência do catálogo, para as sugestões. */
  catalogue?: CatalogueProduct[];
  tipoObra?: string | null;
  /** Produtos que o cliente pediu no pedido (aparecem primeiro nas sugestões). */
  preferred?: Preference[];
}) {
  const { go } = useBudget();
  const { state, pending, formProps } = useFormAction<FormState>(saveWorks.bind(null, proposalId, requestId), { errors: {} });
  const [items, setItems] = useState<WorkItem[]>(initial);
  const [current, setCurrent] = useState<string | null>(initial[0]?.key ?? null);
  const payload = JSON.stringify(items);
  const saved = useRef(payload);
  const sent = useRef(payload);

  useEffect(() => {
    if (state.ok) saved.current = sent.current;
  }, [state]);

  useStepSaver('trabalhos', {
    dirty: () => payload !== saved.current,
    save: async () => {
      const form = new FormData();
      form.set('payload', payload);
      const error = outcome(await saveWorks(proposalId, requestId, { errors: {} }, form));
      if (!error) saved.current = payload;
      return error;
    },
  });

  const item = items.find((i) => i.key === current) ?? null;
  const def = item ? workDef(item.code) : null;
  const patch = (key: string, p: Partial<WorkItem>) => setItems((all) => all.map((i) => (i.key === key ? { ...i, ...p } : i)));

  function add(code: string, zonas: WorkItem['zonas'] = 'todas') {
    const d = workDef(code)!;
    const n = items.filter((i) => i.code === code).length;
    const key = n === 0 ? code : `${code}#${n + 1}`;
    const next: WorkItem = { key, code, estado: 'base', zonas, campos: {}, quantidade: suggestedQuantity(d, zonas, zones), notas: '' };
    setItems((all) => [...all, next]);
    setCurrent(key);
  }
  /** Nova versão com os mesmos campos (produto, acabamento…) desta — só as fachadas ficam por escolher, para
   * não começar com as mesmas zonas da versão copiada. */
  function duplicate(i: WorkItem) {
    const d = workDef(i.code)!;
    const n = items.filter((x) => x.code === i.code).length;
    const key = `${i.code}#${n + 1}`;
    setItems((all) => [...all, { ...i, key, zonas: [], quantidade: suggestedQuantity(d, [], zones) }]);
    setCurrent(key);
  }
  function toggle(code: string) {
    const mine = items.filter((i) => i.code === code);
    if (mine.length === 0) return add(code);
    setItems((all) => all.filter((i) => i.code !== code));
    if (mine.some((i) => i.key === current)) setCurrent(null);
  }
  function setZonas(i: WorkItem, zonas: WorkItem['zonas']) {
    const d = workDef(i.code)!;
    const wasSuggested = i.quantidade === '' || i.quantidade === suggestedQuantity(d, i.zonas, zones);
    patch(i.key, { zonas, ...(wasSuggested ? { quantidade: suggestedQuantity(d, zonas, zones) } : {}) });
  }
  function toggleZone(i: WorkItem, id: string) {
    const list = i.zonas === 'todas' ? zones.map((z) => z.id) : i.zonas;
    setZonas(i, list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  const done = items.filter((i) => isComplete(i, zones)).length;
  const errorText = state.message ?? Object.values(state.errors)[0];

  return (
    <form autoComplete="off" {...formProps} onSubmit={(e) => { sent.current = payload; formProps.onSubmit(e); }} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <input type="hidden" name="payload" value={payload} />
      <div className="grid md:grid-cols-[17rem_minmax(0,1fr)]">
        <nav aria-label="Trabalhos" className="border-b border-slate-200 bg-slate-50 p-3 md:border-b-0 md:border-r">
          <p className="px-2 pb-2 text-sm text-slate-600">O que vai executar?</p>
          <ul className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-2 md:overflow-visible md:pb-0">
            {WORKS.map((w) => {
              const mine = items.filter((i) => i.code === w.code);
              const selected = mine.length > 0;
              const complete = selected && mine.every((i) => isComplete(i, zones));
              const active = mine.some((i) => i.key === current);
              return (
                <li key={w.code} className="w-60 shrink-0 md:w-auto">
                  <div
                    className={`flex items-start gap-3 rounded-xl border p-3 ${
                      complete ? 'border-tinta-600 bg-tinta-50' : selected ? 'border-amber-300 bg-amber-50' : 'border-transparent bg-white'
                    } ${active ? 'ring-2 ring-tinta-500' : ''}`}
                  >
                    <input type="checkbox" checked={selected} onChange={() => toggle(w.code)} className="mt-1 h-5 w-5" aria-label={`Incluir ${w.label}`} />
                    <button type="button" onClick={() => (selected ? setCurrent(mine[0]!.key) : add(w.code))} className="min-w-0 flex-1 text-left">
                      <span className="block font-medium text-slate-900">{w.label}</span>
                      <span className={`block text-xs ${complete ? 'font-semibold text-tinta-700' : selected ? 'text-amber-800' : 'text-slate-500'}`}>
                        {complete ? '✓ Preenchido' : selected ? 'Selecionado: por preencher' : 'Por selecionar'}
                      </span>
                    </button>
                  </div>
                  {mine.length > 1 && (
                    <ul className="ml-9 mt-1 flex flex-wrap gap-1">
                      {mine.map((i, n) => (
                        <li key={i.key}>
                          <button
                            type="button"
                            onClick={() => setCurrent(i.key)}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${i.key === current ? 'bg-tinta-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300'}`}
                          >
                            Versão {n + 1}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-5 md:p-7">
          {!item || !def ? (
            <p className="text-slate-600">Escolha, à esquerda, os trabalhos que vai executar. Cada um tem só os campos que lhe dizem respeito.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">
                  {def.label}
                  {item.key.includes('#') ? ` · versão ${item.key.split('#')[1]}` : ''}
                </h2>
                <label className="text-sm">
                  <span className="sr-only">Estado no orçamento</span>
                  <select value={item.estado} onChange={(e) => patch(item.key, { estado: e.target.value as WorkState })} className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 font-medium">
                    {WORK_STATES.map((s) => (
                      <option key={s} value={s}>
                        {WORK_STATE_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {def.where && zones.length > 0 && (
                <fieldset>
                  <legend className="text-sm font-medium text-slate-700">Onde vai executar?</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {([['todas', 'Todas as fachadas'], ['escolher', 'Escolher fachadas']] as const).map(([k, label]) => {
                      const active = k === 'todas' ? item.zonas === 'todas' : item.zonas !== 'todas';
                      return (
                        <button
                          key={k}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setZonas(item, k === 'todas' ? 'todas' : [])}
                          className={`rounded-xl border px-4 py-2.5 ${active ? 'border-tinta-600 bg-tinta-50 font-medium' : 'border-slate-300 bg-white'}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {item.zonas !== 'todas' && (
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      {zones.map((z) => (
                        <label key={z.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                          <input type="checkbox" checked={item.zonas.includes(z.id)} onChange={() => toggleZone(item, z.id)} />
                          {z.label}
                        </label>
                      ))}
                    </div>
                  )}
                </fieldset>
              )}

              {(item.estado === 'base' || item.estado === 'opcional') && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {def.fields.map((f) => {
                    const options = f.kind === 'text' ? productSuggestions(def.code, f.key, tipoObra, catalogue) : [];
                    if (options.length > 0) {
                      return (
                        <SuggestField
                          key={`${item.key}-${f.key}`}
                          id={`${item.key}-${f.key}`}
                          label={f.label}
                          required={f.required}
                          placeholder={f.placeholder}
                          value={item.campos[f.key] ?? ''}
                          onChange={(v) => patch(item.key, { campos: { ...item.campos, [f.key]: v } })}
                          options={options}
                          preferred={preferred}
                          equivalent={
                            equivalentEnabled()
                              ? { checked: item.campos[equivalentFlag(f.key)] === 'sim', onChange: (v) => patch(item.key, { campos: { ...item.campos, [equivalentFlag(f.key)]: v ? 'sim' : '' } }) }
                              : undefined
                          }
                        />
                      );
                    }
                    return (
                    <label key={f.key} className={`block text-sm font-medium text-slate-700 ${f.kind === 'text' ? 'sm:col-span-2' : ''}`}>
                      {f.label}
                      {f.required && <span className="text-red-700"> *</span>}
                      {f.kind === 'select' ? (
                        <select value={item.campos[f.key] ?? ''} onChange={(e) => patch(item.key, { campos: { ...item.campos, [f.key]: e.target.value } })} className={input}>
                          <option value="">Escolher…</option>
                          {f.options!.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="relative block">
                          <input
                            value={item.campos[f.key] ?? ''}
                            onChange={(e) => patch(item.key, { campos: { ...item.campos, [f.key]: e.target.value } })}
                            inputMode={f.kind === 'number' ? 'decimal' : 'text'}
                            placeholder={f.placeholder}
                            maxLength={200}
                            className={input}
                          />
                          {f.suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{f.suffix}</span>}
                        </span>
                      )}
                    </label>
                    );
                  })}
                  {def.qtyLabel && (
                    <label className="block text-sm font-medium text-slate-700">
                      {def.qtyLabel}
                      <span className="text-red-700"> *</span>
                      <span className="relative block">
                        <input value={item.quantidade} onChange={(e) => patch(item.key, { quantidade: e.target.value })} inputMode="decimal" placeholder="Medir / estimar" className={input} />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{def.unit === 'ml' ? 'm' : 'm²'}</span>
                      </span>
                      <span className="mt-1 block text-xs font-normal text-slate-500">
                        {def.unit === 'm2' && item.quantidade !== '' && item.quantidade === suggestedQuantity(def, item.zonas, zones)
                          ? 'Área preenchida a partir das fachadas. Confirme ou ajuste.'
                          : 'Quantidade específica deste trabalho.'}
                      </span>
                    </label>
                  )}
                </div>
              )}

              {(item.estado === 'confirmar' || item.estado === 'nao_incluido') && (
                <label className="block text-sm font-medium text-slate-700">
                  {item.estado === 'confirmar' ? 'O que falta confirmar, e como?' : 'Justificação para o cliente'}
                  <span className="text-red-700"> *</span>
                  <textarea
                    value={item.notas}
                    onChange={(e) => patch(item.key, { notas: e.target.value })}
                    rows={3}
                    maxLength={300}
                    placeholder={item.estado === 'confirmar' ? 'Ex.: depende de visita ao tardoz' : 'Ex.: o condomínio trata deste trabalho'}
                    className={input}
                  />
                </label>
              )}

              {(item.estado === 'base' || item.estado === 'opcional') && (
                <details className="group border-t border-slate-200 pt-4">
                  <summary className="cursor-pointer list-none font-medium text-tinta-700">
                    <span className="mr-2 inline-block transition-transform group-open:rotate-90">▸</span>Mais detalhes do trabalho
                  </summary>
                  <label className="mt-3 block text-sm font-medium text-slate-700">
                    Notas para o cliente (opcional)
                    <textarea value={item.notas} onChange={(e) => patch(item.key, { notas: e.target.value })} rows={2} maxLength={300} className={input} />
                  </label>
                </details>
              )}

              <div className="rounded-xl bg-sage p-4">
                <p className="text-sm font-medium text-slate-700">Descrição gerada para o cliente</p>
                <p className="mt-1 text-sm text-slate-700">{describeItem(item, zones)}</p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                {def.where && zones.length > 1 && (
                  <>
                    <button type="button" onClick={() => add(def.code, [])} className="font-semibold text-tinta-700 underline underline-offset-4">
                      Acrescentar outra versão em branco
                    </button>
                    <button type="button" onClick={() => duplicate(item)} className="font-semibold text-tinta-700 underline underline-offset-4">
                      Duplicar esta solução para outra fachada
                    </button>
                  </>
                )}
                {item.key.includes('#') && (
                  <button
                    type="button"
                    onClick={() => {
                      setItems((all) => all.filter((i) => i.key !== item.key));
                      setCurrent(items.find((i) => i.code === item.code)?.key ?? null);
                    }}
                    className="text-red-700 hover:underline"
                  >
                    Remover esta versão
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
        <p className="text-sm text-slate-600" role="status">
          {errorText ? <span className="text-red-700">{errorText}</span> : state.ok ? <span className="text-tinta-700">{state.message}</span> : `${done} de ${items.length} trabalhos preenchidos`}
        </p>
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="btn-secondary">
            {pending ? 'A guardar…' : 'Guardar rascunho'}
          </button>
          <button type="button" disabled={pending || items.length === 0} onClick={() => go('precos')} className="btn-primary">
            Continuar para os preços →
          </button>
        </div>
      </div>
    </form>
  );
}
