'use client';

import type { FormState } from '@/app/app/actions';
import { Field, selectClass } from '@/components/Field';
import {
  DATA_FLEXIVEL_LABELS,
  DESIRED_WORKS,
  DESIRED_WORK_LABELS,
  VIA_PUBLICA,
  VIA_PUBLICA_LABELS,
  WORKS_MODES,
  WORKS_MODE_LABELS,
  WORK_TYPES,
  WORK_TYPE_LABELS,
  type DataFlexivel,
} from '@/domain/request';
import { useFormAction } from '@/components/useFormAction';
import { EscolherProdutos, type ProdutoEscolhivel } from '@/components/EscolherProdutos';
import type { Preference } from '@/domain/reference';

export interface RequestInitial {
  building_id: string;
  titulo: string;
  tipo_obra: string;
  tipos_obra?: string[] | null;
  datas_flexiveis?: string[] | null;
  descricao: string;
  trabalhos: string[];
  cor_acabamento: string | null;
  prazo_propostas: string | null;
  execucao_desde: string | null;
  execucao_ate: string | null;
  ocupacao_via_publica?: string;
  produtos_preferidos?: Preference[];
  trabalhos_modo?: string;
}

interface Props {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  buildings: { id: string; nome_interno: string }[];
  initial?: RequestInitial;
  disabled?: boolean;
  references?: ProdutoEscolhivel[];
}

export function RequestForm({ action: submit, buildings, initial, disabled, references = [] }: Props) {
  const { state, pending, formProps } = useFormAction<FormState>(submit, { errors: {} });
  const e = state.errors;
  // Pedidos criados antes de 28/10/2026 só têm o tipo principal; valem por uma escolha de um só tipo.
  const tiposIniciais = initial?.tipos_obra?.length ? initial.tipos_obra : initial ? [initial.tipo_obra] : ['fachadas'];
  const flexiveisIniciais = initial?.datas_flexiveis ?? [];
  const flexivel = (d: DataFlexivel) => (
    <label className="mt-2 flex min-h-[44px] items-start gap-2 text-[15px] font-normal text-slate-600">
      <input type="checkbox" name="dataFlexivel" value={d} defaultChecked={flexiveisIniciais.includes(d)} className="mt-0.5" />
      {DATA_FLEXIVEL_LABELS[d]}
    </label>
  );

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

        <fieldset>
          <legend className="text-[17px] font-medium text-slate-700">
            Tipo de obra <span className="text-red-700">*</span>
          </legend>
          <p className="mt-1 text-[15px] text-slate-500">
            Assinale todos os que se aplicam. Uma obra pode ser exterior e interior ao mesmo tempo.
          </p>
          <div className="mt-2 grid gap-2 text-[17px] sm:grid-cols-2">
            {WORK_TYPES.map((t) => (
              <label key={t} className="flex min-h-[44px] items-center gap-2">
                <input type="checkbox" name="tipoObra" value={t} defaultChecked={tiposIniciais.includes(t)} />
                {WORK_TYPE_LABELS[t]}
              </label>
            ))}
          </div>
          {e.tipoObra && (
            <p className="mt-1 text-[15px] text-red-700" role="alert">
              {e.tipoObra}
            </p>
          )}
        </fieldset>

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
            className="mt-1 campo"
          />
        </Field>

        <fieldset>
          <legend className="text-[17px] font-medium text-slate-700">Trabalhos pretendidos</legend>
          <div className="mt-2 grid gap-2 text-[17px] sm:grid-cols-3">
            {DESIRED_WORKS.map((w) => (
              <label key={w} className="flex items-center gap-2">
                <input type="checkbox" name="trabalhos" value={w} defaultChecked={initial?.trabalhos.includes(w)} />
                {DESIRED_WORK_LABELS[w]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-[17px] font-medium text-slate-700">Os trabalhos são iguais em todas as fachadas ou zonas?</legend>
          <div className="mt-2 space-y-2 text-[17px]">
            {WORKS_MODES.map((m) => (
              <label key={m} className="flex items-start gap-2">
                <input type="radio" name="trabalhosModo" value={m} defaultChecked={(initial?.trabalhos_modo ?? 'iguais') === m} className="mt-1" />
                {WORKS_MODE_LABELS[m]}
              </label>
            ))}
          </div>
          <p className="mt-2 text-[15px] text-slate-500">
            Com diferenças, é possível indicar, em cada zona, os trabalhos que só nela se aplicam (depois de guardar, ao acrescentar zonas).
            Fotografias e problemas observados ficam sempre associados à zona.
          </p>
        </fieldset>

        <Field
          name="corAcabamento"
          label="Cor e acabamento"
          defaultValue={initial?.cor_acabamento ?? undefined}
          error={e.corAcabamento}
          hint="Por exemplo: manter as cores atuais, acabamento mate. Pode deixar em aberto."
        />

        {references.length > 0 && (
          <EscolherProdutos produtos={references} inicial={initial?.produtos_preferidos ?? []} />
        )}

        <Field
          name="ocupacaoViaPublica"
          label="A obra prevê ocupação da via pública?"
          error={e.ocupacaoViaPublica}
          hint="As licenças camarárias dos trabalhos (incluindo a via pública) são obtidas pelo pintor. Licenciamento especial, como alterar janelas ou a fachada, é da responsabilidade do cliente."
        >
          <select name="ocupacaoViaPublica" defaultValue={initial?.ocupacao_via_publica ?? 'a_avaliar'} className={selectClass}>
            {VIA_PUBLICA.map((v) => (
              <option key={v} value={v}>
                {VIA_PUBLICA_LABELS[v]}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <Field
              name="prazoPropostas"
              label="Propostas até"
              type="date"
              defaultValue={initial?.prazo_propostas ?? undefined}
              error={e.prazoPropostas}
              hint="Pelo menos 7 dias."
            />
            {flexivel('propostas')}
          </div>
          <div>
            <Field
              name="execucaoDesde"
              label="Execução a partir de"
              type="date"
              defaultValue={initial?.execucao_desde ?? undefined}
              error={e.execucaoDesde}
            />
            {flexivel('execucao_desde')}
          </div>
          <div>
            <Field
              name="execucaoAte"
              label="Execução até"
              type="date"
              defaultValue={initial?.execucao_ate ?? undefined}
              error={e.execucaoAte}
            />
            {flexivel('execucao_ate')}
          </div>
        </div>
      </fieldset>

      {state.message && (
        <p className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {state.message}
        </p>
      )}
      {!disabled && (
        <button
          type="submit"
          disabled={pending}
          className="btn-primary"
        >
          {pending ? 'A guardar…' : initial ? 'Guardar' : 'Criar pedido'}
        </button>
      )}
    </form>
  );
}
