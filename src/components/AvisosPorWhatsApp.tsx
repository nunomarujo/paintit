'use client';

import type { FormState } from '@/app/app/actions';
import { guardarAvisosPorWhatsApp } from '@/app/app/perfil/whatsapp-actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';

/**
 * O consentimento e o número para receber por WhatsApp os avisos de trabalho — o contrato pronto para
 * assinar, desde 05/11/2026. Serve a qualquer pessoa (cliente, pintor, avaliador): a preferência é da pessoa.
 * Sem consentimento não se envia nada (regra do WhatsApp e da casa, docs/WHATSAPP.md).
 */
export function AvisosPorWhatsApp({
  alertaWhatsApp,
  telemovel,
  whatsappDisponivel,
}: {
  alertaWhatsApp: boolean;
  telemovel: string | null;
  /** O canal existe neste ambiente (chaves configuradas). Sem ele, a preferência guarda-se na mesma. */
  whatsappDisponivel: boolean;
}) {
  const { state, pending, formProps } = useFormAction<FormState>(guardarAvisosPorWhatsApp, { errors: {} });

  return (
    <form {...formProps} className="space-y-4">
      <label className="flex min-h-[44px] items-center gap-3 text-[17px] text-slate-900">
        <input
          name="alerta_whatsapp"
          type="checkbox"
          defaultChecked={alertaWhatsApp}
          className="h-5 w-5 rounded border-slate-300 text-tinta-600"
        />
        Receber também por WhatsApp os avisos de trabalho
      </label>
      <Field
        name="telemovel_whatsapp"
        label="Telemóvel"
        hint={
          whatsappDisponivel
            ? 'Por exemplo, quando o contrato está pronto para assinar. Só avisos de trabalho, nunca publicidade.'
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
      {state.message && (
        <p className={state.ok ? 'text-[15px] text-tinta-700' : 'text-[15px] font-semibold text-amber-800'} role="status">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? 'A guardar…' : 'Guardar'}
      </button>
    </form>
  );
}
