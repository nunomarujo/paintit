'use client';

import type { FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { guardarDisponibilidade } from './actions';

export function Disponibilidade({
  suspensoAte,
  alertaEmail,
  alertaWhatsApp = false,
  telemovelWhatsApp = null,
  whatsappDisponivel = false,
}: {
  suspensoAte: string | null;
  alertaEmail: boolean;
  alertaWhatsApp?: boolean;
  telemovelWhatsApp?: string | null;
  /** O canal existe neste ambiente (chaves configuradas). Sem ele, a preferência guarda-se na mesma. */
  whatsappDisponivel?: boolean;
}) {
  const { state, pending, formProps } = useFormAction<FormState>(guardarDisponibilidade, { errors: {} });
  const m = Object.values(state.errors)[0] ?? state.message;
  return (
    <form {...formProps} className="space-y-5">
      <Field
        name="suspenso_ate"
        label="Suspender a presença até"
        hint="Enquanto estiver suspensa, não chegam oportunidades novas. Vazio: disponível."
        error={state.errors.suspenso_ate}
      >
        <input
          id="suspenso_ate"
          name="suspenso_ate"
          type="date"
          defaultValue={suspensoAte ?? ''}
          className="campo mt-1 max-w-[16rem]"
        />
      </Field>

      <label className="flex min-h-[44px] items-center gap-3 text-[17px] text-slate-900">
        <input
          name="alerta_email"
          type="checkbox"
          defaultChecked={alertaEmail}
          className="h-5 w-5 rounded border-slate-300 text-tinta-600"
        />
        Receber por email o aviso de oportunidades e de prazos
      </label>
      <p className="max-w-[54ch] text-[15px] text-slate-600">
        Desligar o email não cala o aviso dentro da aplicação: esse aparece sempre, e é o que fica como prova
        de que foi avisada.
      </p>

      <label className="flex min-h-[44px] items-center gap-3 text-[17px] text-slate-900">
        <input
          name="alerta_whatsapp"
          type="checkbox"
          defaultChecked={alertaWhatsApp}
          className="h-5 w-5 rounded border-slate-300 text-tinta-600"
        />
        Receber também por WhatsApp
      </label>
      <Field
        name="telemovel_whatsapp"
        label="Telemóvel para o WhatsApp"
        hint={
          whatsappDisponivel
            ? 'Só recebe mensagens de aviso; nunca publicidade. Pode desligar quando quiser.'
            : 'O canal de WhatsApp ainda está a ser preparado: a preferência fica guardada e passa a valer assim que abrir.'
        }
        error={state.errors.telemovel_whatsapp}
      >
        <input
          id="telemovel_whatsapp"
          name="telemovel_whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={telemovelWhatsApp ?? ''}
          placeholder="912 345 678"
          className="campo mt-1 max-w-[16rem]"
        />
      </Field>

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
