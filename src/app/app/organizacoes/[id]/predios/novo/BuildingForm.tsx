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
  /** Esconde as características (pisos, frações, …) — na ficha do prédio elas gravam-se sozinhas,
   * campo a campo, fora deste formulário (`Characteristics`). */
  semCaracteristicas?: boolean;
}

const str = (n: number | null | undefined) => (n === null || n === undefined ? undefined : String(n));

export function BuildingForm({ action: submit, defaultKind, initial, semCaracteristicas }: Props) {
  const { state, pending, formProps } = useFormAction<FormState>(submit, { errors: {} });
  const e = state.errors;

  // Grelha de quadros por função (promotor, 01/11/2026): identificação, localização,
  // características — e não uma coluna. Os campos e a acção são os mesmos.
  const quadro = 'rounded-2xl border border-slate-200 bg-white p-5';
  const cabeca = (n: string, titulo: string, sub: string) => (
    <>
      <header className="flex items-baseline gap-2">
        <span className="text-[15px] font-semibold text-tinta-600">{n}</span>
        <span className="text-slate-400">·</span>
        <h2 className="text-[17px] font-semibold text-tinta-900">{titulo}</h2>
      </header>
      <p className="mt-0.5 mb-4 text-[15px] text-slate-500">{sub}</p>
    </>
  );

  return (
    <form {...formProps} className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-12">
        <section className={`${quadro} lg:col-span-4`}>
          {cabeca('01', 'Identificação', 'Como aparece na sua lista. Não é mostrado aos pintores.')}
          <div className="space-y-4">
            <Field name="nomeInterno" label="Nome interno" required defaultValue={initial?.nome_interno} error={e.nomeInterno} />
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
        </section>

        <section className={`${quadro} lg:col-span-8`}>
          {cabeca('02', 'Localização', 'A morada fica privada até à apresentação. Os pintores só veem o concelho.')}
          <div className="space-y-4">
            <AddressFields
              moradaName="morada"
              moradaLabel="Morada"
              required
              withConcelho
              initial={{ morada: initial?.morada, codigoPostal: initial?.codigo_postal, localidade: initial?.localidade, concelho: initial?.concelho }}
              errors={e}
            />
            <Field name="artigoMatricial" label="Artigo matricial" defaultValue={initial?.artigo_matricial ?? undefined} error={e.artigoMatricial} hint="Opcional; útil para o contrato." />
          </div>
        </section>

        <section className={`${quadro} lg:col-span-12 ${semCaracteristicas ? 'hidden' : ''}`}>
          {cabeca('03', 'Características', 'Opcional. Ajudam os pintores a perceber a dimensão da obra; pode responder mais tarde.')}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field name="pisos" label="Pisos" inputMode="numeric" defaultValue={str(initial?.pisos)} error={e.pisos} />
            <Field name="fracoes" label="Frações" inputMode="numeric" defaultValue={str(initial?.fracoes)} error={e.fracoes} />
            <Field name="fachadas" label="Fachadas" inputMode="numeric" defaultValue={str(initial?.fachadas)} error={e.fachadas} />
            <Field name="anoConstrucao" label="Ano de construção" inputMode="numeric" defaultValue={str(initial?.ano_construcao)} error={e.anoConstrucao} />
          </div>
          <div className="mt-4 flex flex-wrap gap-6 text-[17px]">
            <label className="flex min-h-[44px] items-center gap-2">
              <input type="checkbox" name="temVarandas" defaultChecked={initial?.tem_varandas} /> Tem varandas
            </label>
            <label className="flex min-h-[44px] items-center gap-2">
              <input type="checkbox" name="temElevador" defaultChecked={initial?.tem_elevador} /> Tem elevador
            </label>
          </div>
          <div className="mt-4">
            <Field
              name="acessos"
              label="Acessos e condicionantes"
              defaultValue={initial?.acessos ?? undefined}
              error={e.acessos}
              hint="Por exemplo: rua estreita, prédios contíguos, telhado sem acesso."
            />
          </div>
        </section>
      </div>

      {state.message && (
        <p className="text-[17px] text-red-700" role="alert">
          {state.message}
        </p>
      )}
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary btn-lg">
          {pending ? 'A guardar…' : initial ? 'Guardar alterações' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
