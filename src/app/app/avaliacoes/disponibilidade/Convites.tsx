'use client';

import type { FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { REGRAS_DA_CONVOCATORIA } from '@/domain/convocatoria';
import { DISTRITOS } from '@/lib/concelhos';
import { guardarConvites } from './actions';

/**
 * Convites por WhatsApp: o consentimento, o concelho base e o raio (o número associa-se no cartão ao lado). Os dados para receber a
 * comissão (NIF, IBAN) vivem em «Comissões pessoais» — a comissão é da pessoa (05/11/2026).
 */
export function ConvitesWhatsApp({
  alertaWhatsApp,
  concelhoBase,
  raioKm,
  whatsappDisponivel,
}: {
  alertaWhatsApp: boolean;
  concelhoBase: string | null;
  raioKm: number | null;
  /** O canal existe neste ambiente (chaves configuradas). Sem ele, a preferência guarda-se na mesma. */
  whatsappDisponivel: boolean;
}) {
  const { state, pending, formProps } = useFormAction<FormState>(guardarConvites, { errors: {} });
  const m = state.ok ? state.message : (Object.values(state.errors)[0] ?? state.message);

  return (
    <form {...formProps} className="space-y-5">
      <label className="flex min-h-[44px] items-center gap-3 text-[17px] text-slate-900">
        <input name="alerta_whatsapp" type="checkbox" defaultChecked={alertaWhatsApp} className="h-5 w-5 rounded border-slate-300 text-tinta-600" />
        Receber convites e avisos por WhatsApp
      </label>
      {state.errors.alerta_whatsapp && (
        <p className="text-[15px] font-semibold text-amber-800" role="alert">
          {state.errors.alerta_whatsapp}
        </p>
      )}
      <p className="text-[15px] text-slate-600">
        {whatsappDisponivel
          ? 'Os convites vão para os números associados, no cartão ao lado. O número da loja é partilhado: os convites vão para quem os aceita. Só mensagens de trabalho, nunca publicidade.'
          : 'O canal de WhatsApp ainda está a ser preparado: poderá associar o número assim que abrir.'}
      </p>

      <Field name="concelho_base" label="Concelho base" hint="De onde parte para os levantamentos." error={state.errors.concelho_base}>
        <select id="concelho_base" name="concelho_base" defaultValue={concelhoBase ?? ''} className="campo mt-1 max-w-[22rem]">
          <option value="">Escolher…</option>
          {DISTRITOS.map((d) => (
            <optgroup key={d.distrito} label={d.distrito}>
              {d.concelhos.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>

      <fieldset>
        <legend className="text-[17px] font-medium text-slate-900">Até onde se desloca</legend>
        <p className="mt-0.5 text-[15px] text-slate-600">Medido em linha reta entre os centros dos concelhos. Nunca chegam convites para lá deste raio.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {REGRAS_DA_CONVOCATORIA.raiosKm.map((r) => (
            <label
              key={r}
              className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-[17px] text-slate-900 has-[:checked]:border-tinta-600 has-[:checked]:bg-marca-tag"
            >
              <input type="radio" name="raio_km" value={r} defaultChecked={raioKm === r} className="h-4 w-4 text-tinta-600" />
              {r} km
            </label>
          ))}
        </div>
        {state.errors.raio_km && <p className="mt-1 text-[15px] text-red-700">{state.errors.raio_km}</p>}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
          {pending ? 'A guardar…' : 'Guardar'}
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
