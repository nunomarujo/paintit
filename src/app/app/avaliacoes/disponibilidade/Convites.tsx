'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { REGRAS_DA_CONVOCATORIA, ROTULO_DO_RECEBIMENTO, type Recebimento } from '@/domain/convocatoria';
import { DISTRITOS } from '@/lib/concelhos';
import { guardarConvites } from './actions';

/**
 * Convites por WhatsApp: o número com o consentimento, o concelho base, o raio e o recebimento da
 * comissão. O NIF pessoal só aparece — e só se guarda — para quem escolhe receber em nome próprio
 * (decisão de 05/11/2026: minimização).
 */
export function ConvitesWhatsApp({
  alertaWhatsApp,
  telemovel,
  concelhoBase,
  raioKm,
  recebimento: recebimentoInicial,
  nifPessoal,
  whatsappDisponivel,
}: {
  alertaWhatsApp: boolean;
  telemovel: string | null;
  concelhoBase: string | null;
  raioKm: number | null;
  recebimento: Recebimento;
  nifPessoal: string | null;
  /** O canal existe neste ambiente (chaves configuradas). Sem ele, a preferência guarda-se na mesma. */
  whatsappDisponivel: boolean;
}) {
  const { state, pending, formProps } = useFormAction<FormState>(guardarConvites, { errors: {} });
  const [recebimento, setRecebimento] = useState<Recebimento>(recebimentoInicial);
  const m = state.ok ? state.message : (Object.values(state.errors)[0] ?? state.message);

  return (
    <form {...formProps} className="space-y-5">
      <label className="flex min-h-[44px] items-center gap-3 text-[17px] text-slate-900">
        <input name="alerta_whatsapp" type="checkbox" defaultChecked={alertaWhatsApp} className="h-5 w-5 rounded border-slate-300 text-tinta-600" />
        Receber convites e avisos por WhatsApp
      </label>
      <Field
        name="telemovel_whatsapp"
        label="Telemóvel pessoal"
        hint={
          whatsappDisponivel
            ? 'O número da loja é partilhado: os convites vão para quem os aceita. Só mensagens de trabalho, nunca publicidade.'
            : 'O canal de WhatsApp ainda está a ser preparado: fica guardado e passa a valer assim que abrir.'
        }
        error={state.errors.telemovel_whatsapp}
      >
        <input
          id="telemovel_whatsapp"
          name="telemovel_whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={telemovel ?? ''}
          placeholder="912 345 678"
          className="campo mt-1 max-w-[16rem]"
        />
      </Field>

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

      <fieldset>
        <legend className="text-[17px] font-medium text-slate-900">Comissão dos levantamentos</legend>
        <div className="mt-2 space-y-1">
          {(['empresa', 'proprio'] as const).map((r) => (
            <label key={r} className="flex min-h-[44px] items-center gap-3 text-[17px] text-slate-900">
              <input
                type="radio"
                name="recebimento"
                value={r}
                checked={recebimento === r}
                onChange={() => setRecebimento(r)}
                className="h-5 w-5 text-tinta-600"
              />
              {ROTULO_DO_RECEBIMENTO[r]}
            </label>
          ))}
        </div>
      </fieldset>

      {recebimento === 'proprio' && (
        <Field
          name="nif_pessoal"
          label="NIF pessoal"
          hint="Para a emissão do recibo verde. Só se pede a quem recebe em nome próprio."
          error={state.errors.nif_pessoal}
        >
          <input
            id="nif_pessoal"
            name="nif_pessoal"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={nifPessoal ?? ''}
            placeholder="123 456 789"
            className="campo mt-1 max-w-[12rem]"
          />
        </Field>
      )}

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
