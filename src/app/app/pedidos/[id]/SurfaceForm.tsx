'use client';

import type { FormState } from '@/app/app/actions';
import { addSurface } from '@/app/app/pedidos/actions';
import { Field, selectClass } from '@/components/Field';
import { AREA_SOURCES, AREA_SOURCE_LABELS, DESIRED_WORKS, DESIRED_WORK_LABELS, SURFACE_KINDS, SURFACE_KIND_LABELS, type WorksMode } from '@/domain/request';
import { useFormAction } from '@/components/useFormAction';

export function SurfaceForm({ requestId, modo = 'iguais' }: { requestId: string; modo?: WorksMode }) {
  const { state, pending, formProps } = useFormAction<FormState>(
    addSurface.bind(null, requestId),
    { errors: {} },
    { resetOnSuccess: true },
  );
  const e = state.errors;

  return (
    <form {...formProps} className="space-y-4">
      <h3 className="text-[17px] font-semibold">Acrescentar superfície</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          name="kind"
          label="Superfície"
          required
          error={e.kind}
          info="O que é esta zona: uma fachada, um interior, um teto, uma varanda. Uma linha por zona que se pinte em separado — não some fachadas diferentes numa só."
        >
          <select name="kind" required defaultValue="fachada" className={selectClass}>
            {SURFACE_KINDS.map((k) => (
              <option key={k} value={k}>
                {SURFACE_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          name="descricao"
          label="Nome da fachada ou zona"
          error={e.descricao}
          hint="Ex.: fachada principal; tardoz, com fissuras."
          info="Como o pintor vai reconhecer esta zona na lista e nas fotografias. Descreva a zona e o seu estado — nunca a morada, o nome do prédio nem o número de porta."
        />
        <Field
          name="origem"
          label="Origem da medida"
          error={e.origem}
          info="Como chegou a esta área: medida no local, tirada da planta, ou estimada à vista. O pintor usa isto para saber com que margem pode contar — uma estimativa honesta vale mais do que uma medida inventada."
        >
          <select name="origem" defaultValue="estimativa" className={selectClass}>
            {AREA_SOURCES.map((s) => (
              <option key={s} value={s}>
                {AREA_SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="text-[15px] text-slate-600">Indique a área, ou a largura e a altura (os vãos são descontados).</p>
      <div className="grid gap-4 sm:grid-cols-5">
        <Field
          name="area"
          label="Área (m²)"
          inputMode="text"
          error={e.area}
          info="A área a pintar desta zona. Se não a tiver direta, deixe em branco e preencha a largura e a altura."
        />
        <Field name="largura" label="Largura (m)" inputMode="text" error={e.largura} info="Usada só se não indicar a área." />
        <Field name="altura" label="Altura (m)" inputMode="text" error={e.altura} info="Do chão ao remate da zona, não do prédio inteiro." />
        <Field
          name="vaos"
          label="Vãos (m²)"
          inputMode="text"
          error={e.vaos}
          hint="Janelas e portas."
          info="Soma das janelas e portas desta zona. É descontada da área: sem isto, o pintor orçamenta parede a mais."
        />
        <Field
          name="quantidade"
          label="Quantidade"
          inputMode="numeric"
          defaultValue="1"
          error={e.quantidade}
          info="Para zonas repetidas e iguais (ex.: 8 varandas com a mesma medida). A área indicada é multiplicada por este número."
        />
      </div>
      {modo === 'diferencas' && (
        <fieldset className="rounded-xl bg-slate-50 p-4">
          <legend className="px-1 text-[17px] font-semibold">Trabalhos só desta zona (opcional)</legend>
          <p className="text-[15px] text-slate-600">
            Assinale apenas se esta zona tiver trabalhos diferentes dos comuns do pedido. Sem nada assinalado, aplicam-se os comuns.
          </p>
          <div className="mt-2 grid gap-2 text-[17px] sm:grid-cols-3">
            {DESIRED_WORKS.map((w) => (
              <label key={w} className="flex items-center gap-2">
                <input type="checkbox" name="trabalhosZona" value={w} />
                {DESIRED_WORK_LABELS[w]}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {state.message && (
        <p className="text-[17px] text-red-700" role="alert">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-slate-300 px-4 py-2 text-[17px] font-semibold hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? 'A acrescentar…' : 'Acrescentar'}
      </button>
    </form>
  );
}
