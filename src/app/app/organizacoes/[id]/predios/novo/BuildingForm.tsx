'use client';

import type { FormState } from '@/app/app/actions';
import { AddressFields } from '@/components/AddressFields';
import { Field, selectClass } from '@/components/Field';
import { BUILDING_KINDS, BUILDING_KIND_LABELS } from '@/domain/organization';
import type { Database } from '@/lib/database.types';
import { useFormAction } from '@/components/useFormAction';

type Building = Database['public']['Tables']['buildings']['Row'];

interface Props {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  defaultKind: string;
  /** Ao editar: os valores atuais. */
  initial?: Building;
}

const str = (n: number | null | undefined) => (n === null || n === undefined ? undefined : String(n));

export function BuildingForm({ action: submit, defaultKind, initial }: Props) {
  const { state, pending, formProps } = useFormAction<FormState>(submit, { errors: {} });
  const e = state.errors;

  return (
    <form {...formProps} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="nomeInterno"
          label="Nome interno"
          required
          defaultValue={initial?.nome_interno}
          error={e.nomeInterno}
          hint="Para o identificar na sua lista. Não é mostrado aos pintores."
        />
        <Field name="tipo" label="Tipo de imóvel" required error={e.tipo}>
          <select name="tipo" required defaultValue={initial?.tipo ?? defaultKind} className={selectClass}>
            {BUILDING_KINDS.map((k) => (
              <option key={k} value={k}>
                {BUILDING_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset className="space-y-4 rounded-xl bg-slate-50 p-4">
        <legend className="px-1 text-sm font-semibold">Localização</legend>
        <p className="text-xs text-slate-600">A morada fica privada até à apresentação. Os pintores só veem o concelho.</p>
        <AddressFields
          moradaName="morada"
          moradaLabel="Morada"
          required
          withConcelho
          initial={{ morada: initial?.morada, codigoPostal: initial?.codigo_postal, localidade: initial?.localidade, concelho: initial?.concelho }}
          errors={e}
        />
        <Field
          name="artigoMatricial"
          label="Artigo matricial"
          defaultValue={initial?.artigo_matricial ?? undefined}
          error={e.artigoMatricial}
          hint="Opcional; útil para o contrato."
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Características</legend>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field name="pisos" label="Pisos" inputMode="numeric" defaultValue={str(initial?.pisos)} error={e.pisos} />
          <Field name="fracoes" label="Frações" inputMode="numeric" defaultValue={str(initial?.fracoes)} error={e.fracoes} />
          <Field name="fachadas" label="Fachadas" inputMode="numeric" defaultValue={str(initial?.fachadas)} error={e.fachadas} />
          <Field
            name="anoConstrucao"
            label="Ano de construção"
            inputMode="numeric"
            defaultValue={str(initial?.ano_construcao)}
            error={e.anoConstrucao}
          />
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="temVarandas" defaultChecked={initial?.tem_varandas} /> Tem varandas
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="temElevador" defaultChecked={initial?.tem_elevador} /> Tem elevador
          </label>
        </div>
        <Field
          name="acessos"
          label="Acessos e condicionantes"
          defaultValue={initial?.acessos ?? undefined}
          error={e.acessos}
          hint="Por exemplo: rua estreita, prédios contíguos, telhado sem acesso. Pode responder mais tarde."
        />
      </fieldset>

      {state.message && (
        <p className="text-sm text-red-700" role="alert">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-tinta-600 px-5 py-2 font-semibold text-white hover:bg-tinta-700 disabled:opacity-60"
      >
        {pending ? 'A guardar…' : initial ? 'Guardar alterações' : 'Guardar'}
      </button>
    </form>
  );
}
