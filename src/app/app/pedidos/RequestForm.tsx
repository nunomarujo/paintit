'use client';

import type { FormState } from '@/app/app/actions';
import { Field, selectClass } from '@/components/Field';
import { DESIRED_WORKS, DESIRED_WORK_LABELS, WORK_TYPES, WORK_TYPE_LABELS } from '@/domain/request';
import { useFormAction } from '@/components/useFormAction';

export interface RequestInitial {
  building_id: string;
  titulo: string;
  tipo_obra: string;
  descricao: string;
  trabalhos: string[];
  cor_acabamento: string | null;
  prazo_propostas: string | null;
  execucao_desde: string | null;
  execucao_ate: string | null;
}

interface Props {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  buildings: { id: string; nome_interno: string }[];
  initial?: RequestInitial;
  disabled?: boolean;
}

export function RequestForm({ action: submit, buildings, initial, disabled }: Props) {
  const { state, pending, formProps } = useFormAction<FormState>(submit, { errors: {} });
  const e = state.errors;

  return (
    <form {...formProps} className="space-y-5">
      <fieldset disabled={disabled} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="buildingId" label="Prédio" required error={e.buildingId}>
            <select name="buildingId" required defaultValue={initial?.building_id ?? buildings[0]?.id} className={selectClass}>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome_interno}
                </option>
              ))}
            </select>
          </Field>
          <Field
            name="titulo"
            label="Nome interno do pedido"
            required
            defaultValue={initial?.titulo}
            error={e.titulo}
            hint="Só a sua equipa o vê. Por exemplo: Fachadas 2027."
          />
        </div>

        <Field name="tipoObra" label="Tipo de obra" required error={e.tipoObra}>
          <select name="tipoObra" required defaultValue={initial?.tipo_obra ?? 'fachadas'} className={selectClass}>
            {WORK_TYPES.map((t) => (
              <option key={t} value={t}>
                {WORK_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          name="descricao"
          label="Descrição para os pintores"
          error={e.descricao}
          hint="Estado atual, problemas observados, o que pretende. Não indique morada, nomes nem contactos: são revelados só depois da escolha."
        >
          <textarea
            name="descricao"
            rows={5}
            defaultValue={initial?.descricao}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
          />
        </Field>

        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Trabalhos pretendidos</legend>
          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
            {DESIRED_WORKS.map((w) => (
              <label key={w} className="flex items-center gap-2">
                <input type="checkbox" name="trabalhos" value={w} defaultChecked={initial?.trabalhos.includes(w)} />
                {DESIRED_WORK_LABELS[w]}
              </label>
            ))}
          </div>
        </fieldset>

        <Field
          name="corAcabamento"
          label="Cor e acabamento"
          defaultValue={initial?.cor_acabamento ?? undefined}
          error={e.corAcabamento}
          hint="Por exemplo: manter as cores atuais, acabamento mate. Pode deixar em aberto."
        />

        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            name="prazoPropostas"
            label="Propostas até"
            type="date"
            defaultValue={initial?.prazo_propostas ?? undefined}
            error={e.prazoPropostas}
            hint="Pelo menos 7 dias."
          />
          <Field
            name="execucaoDesde"
            label="Execução a partir de"
            type="date"
            defaultValue={initial?.execucao_desde ?? undefined}
            error={e.execucaoDesde}
          />
          <Field
            name="execucaoAte"
            label="Execução até"
            type="date"
            defaultValue={initial?.execucao_ate ?? undefined}
            error={e.execucaoAte}
          />
        </div>
      </fieldset>

      {state.message && (
        <p className={`text-sm ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {state.message}
        </p>
      )}
      {!disabled && (
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-tinta-600 px-5 py-2 font-semibold text-white hover:bg-tinta-700 disabled:opacity-60"
        >
          {pending ? 'A guardar…' : initial ? 'Guardar' : 'Criar pedido'}
        </button>
      )}
    </form>
  );
}
