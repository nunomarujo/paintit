'use client';

import { useState } from 'react';
import { Field, selectClass } from '@/components/Field';
import { ESTADOS_CALEIRA, ESTADO_CALEIRA_LABELS, INTERVENCOES_CALEIRA, INTERVENCAO_CALEIRA_LABELS } from '@/domain/caleiras';
import type { RequestInitial } from './RequestForm';

const metros = (cm: number | null | undefined) => (cm ? String(cm / 100).replace('.', ',') : '');

/**
 * O campo das caleiras, só com o tipo «Caleiras» marcado (pedido do promotor, 06/11/2026).
 *
 * O que se pretende fazer é obrigatório; o estado e o comprimento total ajudam o pintor e podem
 * ficar por dizer. «Substituir partes» pede os metros a substituir. Os mesmos nomes de campo que o
 * servidor lê em `parseCaleiras`, que valida tudo outra vez.
 */
export function CamposDasCaleiras({ initial, errors }: { initial?: RequestInitial; errors: Record<string, string | undefined> }) {
  const [intervencao, setIntervencao] = useState(initial?.caleiras_intervencao ?? '');
  return (
    <fieldset className="mt-5 rounded-lg border border-slate-200 p-4">
      <legend className="px-1 text-[15px] font-semibold text-slate-700">Caleiras</legend>
      <div className="space-y-4">
        <fieldset>
          <legend className="text-[17px] font-medium text-slate-700">
            O que pretende fazer? <span className="text-red-700">*</span>
          </legend>
          <div className="mt-1 grid gap-1 sm:grid-cols-2">
            {INTERVENCOES_CALEIRA.map((i) => (
              <label key={i} className="flex min-h-[44px] items-center gap-2 text-[17px]">
                <input type="radio" name="caleirasIntervencao" value={i} checked={intervencao === i} onChange={() => setIntervencao(i)} />
                {INTERVENCAO_CALEIRA_LABELS[i]}
              </label>
            ))}
          </div>
          {errors.caleirasIntervencao && (
            <p className="mt-1 text-[15px] text-red-700" role="alert">
              {errors.caleirasIntervencao}
            </p>
          )}
        </fieldset>
        {intervencao === 'substituir_partes' && (
          <Field
            name="caleirasMetrosSubstituir"
            label="Quantos metros se substituem?"
            required
            inputMode="text"
            placeholder="Por exemplo: 6,5"
            defaultValue={metros(initial?.caleiras_metros_substituir_cm)}
            error={errors.caleirasMetrosSubstituir}
            hint="Em metros. Uma estimativa serve; o pintor confirma em obra."
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="caleirasEstado" label="Estado das caleiras" error={errors.caleirasEstado}>
            <select name="caleirasEstado" defaultValue={initial?.caleiras_estado ?? ''} className={selectClass}>
              <option value="">Por indicar</option>
              {ESTADOS_CALEIRA.map((e) => (
                <option key={e} value={e}>
                  {ESTADO_CALEIRA_LABELS[e]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            name="caleirasComprimento"
            label="Comprimento total (opcional)"
            inputMode="text"
            placeholder="Por exemplo: 24"
            defaultValue={metros(initial?.caleiras_comprimento_cm)}
            error={errors.caleirasComprimento}
            hint="Em metros. Pode ficar em branco."
          />
        </div>
      </div>
    </fieldset>
  );
}
