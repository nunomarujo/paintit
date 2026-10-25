'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { MiniForm } from '@/components/MiniForm';
import { useFormAction } from '@/components/useFormAction';
import { QUOTE_TEMPLATES } from '@/domain/quoteTemplates';
import { createQuote, removeQuote } from './actions';

/**
 * Orçamento novo. O ecrã obriga a escolher de onde parte — modelo ou orçamento anterior — porque um
 * orçamento em branco é precisamente a hora que se quer poupar.
 */
export function CreateQuote({ anteriores }: { anteriores: { id: string; label: string }[] }) {
  const [origem, setOrigem] = useState<'modelo' | 'duplicar'>('modelo');
  const [modelo, setModelo] = useState(QUOTE_TEMPLATES[0]!.code);
  const [duplicar, setDuplicar] = useState(anteriores[0]?.id ?? '');
  const escolhido = QUOTE_TEMPLATES.find((t) => t.code === modelo);

  return (
    <div className="space-y-4">
      {anteriores.length > 0 && (
        <div className="flex gap-2 text-[13px]">
          {(['modelo', 'duplicar'] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOrigem(o)}
              aria-pressed={origem === o}
              className={`rounded-lg border px-3 py-1.5 font-semibold ${
                origem === o ? 'border-tinta-600 bg-tinta-50 text-tinta-800' : 'border-slate-300 bg-white text-slate-600'
              }`}
            >
              {o === 'modelo' ? 'Partir de um modelo' : 'Copiar um orçamento anterior'}
            </button>
          ))}
        </div>
      )}

      {origem === 'modelo' ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {QUOTE_TEMPLATES.map((t) => (
            <button
              key={t.code}
              type="button"
              onClick={() => setModelo(t.code)}
              aria-pressed={modelo === t.code}
              className={`rounded-xl border p-3 text-left transition-colors ${
                modelo === t.code ? 'border-tinta-600 bg-tinta-50' : 'border-slate-300 bg-white hover:bg-slate-50'
              }`}
            >
              <span className="block text-[13px] font-semibold text-slate-900">{t.label}</span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-slate-600">{t.quando}</span>
              <span className="mt-1 block text-[11px] text-slate-500">{t.trabalhos.length} capítulos</span>
            </button>
          ))}
        </div>
      ) : (
        <label className="block text-sm">
          Orçamento a copiar
          <select value={duplicar} onChange={(e) => setDuplicar(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
            {anteriores.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <MiniForm
        action={createQuote as (s: FormState, f: FormData) => Promise<FormState>}
        hidden={origem === 'modelo' ? { modelo } : { duplicar }}
        fields={[
          { name: 'cliente', label: 'Cliente', placeholder: 'Condomínio da Rua das Flores, 12' },
          { name: 'local', label: 'Local (opcional)', placeholder: 'Viana do Castelo' },
          { name: 'titulo', label: 'Título (opcional)', placeholder: 'Pintura das fachadas', wide: true },
        ]}
        submit={origem === 'modelo' ? `Criar a partir de "${escolhido?.label ?? ''}"` : 'Criar a partir do anterior'}
      />
    </div>
  );
}

/** Botão simples ligado a uma server action, com o estado a aparecer ao lado. */
export function ActionButton({
  action,
  label,
  pendingLabel,
  variant = 'secondary',
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  label: string;
  pendingLabel: string;
  variant?: 'primary' | 'secondary' | 'quiet';
}) {
  const { state, pending, formProps } = useFormAction<FormState>(action, { errors: {} });
  const cls =
    variant === 'primary' ? 'btn-primary' : variant === 'secondary' ? 'btn-secondary' : 'text-[12px] text-slate-500 underline underline-offset-4 hover:text-slate-700';
  return (
    <form {...formProps} className="inline-flex items-center gap-2">
      <button type="submit" disabled={pending} className={cls}>
        {pending ? pendingLabel : label}
      </button>
      {state.message && <span className="text-[12px] text-slate-600">{state.message}</span>}
    </form>
  );
}

/**
 * Apagar um orçamento. Confirma-se num segundo clique, no próprio botão: um diálogo do navegador
 * não se estiliza nem se lê bem no telemóvel, e um orçamento apagado não volta.
 */
export function RemoveQuote({ quoteId, numero }: { quoteId: string; numero: number }) {
  const [confirmar, setConfirmar] = useState(false);
  const { pending, formProps, state } = useFormAction<FormState>(removeQuote.bind(null, quoteId), { errors: {} });
  if (!confirmar) {
    return (
      <button
        type="button"
        onClick={() => setConfirmar(true)}
        className="shrink-0 text-[12px] text-slate-400 underline underline-offset-4 hover:text-red-700"
      >
        Apagar
      </button>
    );
  }
  return (
    <form {...formProps} className="shrink-0 text-right">
      <button type="submit" disabled={pending} className="text-[12px] font-semibold text-red-700 underline underline-offset-4">
        {pending ? 'A apagar…' : `Apagar o #${numero}?`}
      </button>
      <button type="button" onClick={() => setConfirmar(false)} className="ml-2 text-[12px] text-slate-500 underline underline-offset-4">
        Não
      </button>
      {state.message && <p className="mt-1 max-w-[28ch] text-[11px] text-red-700">{state.message}</p>}
    </form>
  );
}
