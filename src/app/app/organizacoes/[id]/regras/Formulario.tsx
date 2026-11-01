'use client';

import type { FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { guardarLimite } from './actions';

export type Alvo = { valor: string; etiqueta: string; grupo: string };

export function NovoLimite({ orgId, alvos }: { orgId: string; alvos: Alvo[] }) {
  const { state, pending, formProps } = useFormAction<FormState>(guardarLimite.bind(null, orgId), { errors: {} }, { resetOnSuccess: true });
  const grupos = [...new Set(alvos.map((a) => a.grupo))];
  const m = Object.values(state.errors)[0] ?? state.message;

  return (
    <form {...formProps} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="alvo" label="Aplica-se a" required error={state.errors.alvo}>
          <select id="alvo" name="alvo" required className="campo mt-1">
            <option value="">Escolher…</option>
            {grupos.map((g) => (
              <optgroup key={g} label={g}>
                {alvos
                  .filter((a) => a.grupo === g)
                  .map((a) => (
                    <option key={a.valor} value={a.valor}>
                      {a.etiqueta}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field name="limite" label="Limite (%)" required error={state.errors.limite} hint="0 retira a autorização.">
          <input id="limite" name="limite" type="text" inputMode="decimal" required placeholder="10" className="campo mt-1" />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
          {pending ? 'A guardar…' : 'Guardar limite'}
        </button>
        {m && (
          <p className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
            {m}
          </p>
        )}
      </div>
    </form>
  );
}
