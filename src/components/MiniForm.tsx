'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';

export interface MiniField {
  name: string;
  label: string;
  type?: 'text' | 'date' | 'number' | 'textarea';
  options?: { value: string; label: string }[];
  placeholder?: string;
  wide?: boolean;
}

/** Formulário curto em linha, para as ferramentas de obra e afins. */
export function MiniForm({
  action,
  fields,
  submit,
  hidden,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  fields: MiniField[];
  submit: string;
  /** Valores que o formulário envia sem os mostrar (ex.: o modelo escolhido noutro sítio do ecrã). */
  hidden?: Record<string, string>;
}) {
  const { state, pending, formProps } = useFormAction<FormState>(action, { errors: {} }, { resetOnSuccess: true });
  const input = 'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2';
  const msg = Object.values(state.errors)[0] ?? state.message;
  return (
    <form {...formProps} className="space-y-3 text-[17px]">
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className="grid gap-3 sm:grid-cols-4">
        {fields.map((f) => (
          <label key={f.name} className={f.wide || f.type === 'textarea' ? 'sm:col-span-4' : ''}>
            {f.label}
            {f.options ? (
              <select name={f.name} defaultValue="" className={input}>
                <option value="">—</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea name={f.name} rows={2} placeholder={f.placeholder} className={input} />
            ) : (
              <input name={f.name} type={f.type === 'date' ? 'date' : 'text'} placeholder={f.placeholder} className={input} />
            )}
          </label>
        ))}
      </div>
      {msg && <p className={state.ok ? 'text-tinta-700' : 'text-red-700'}>{msg}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50 disabled:opacity-60"
      >
        {submit}
      </button>
    </form>
  );
}
