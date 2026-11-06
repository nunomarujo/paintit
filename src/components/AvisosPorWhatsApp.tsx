'use client';

import type { FormState } from '@/app/app/actions';
import { guardarAvisosPorWhatsApp } from '@/app/app/perfil/whatsapp-actions';
import { useFormAction } from '@/components/useFormAction';

/**
 * O consentimento para receber por WhatsApp os avisos de trabalho — o contrato pronto para assinar, desde
 * 05/11/2026. Serve a qualquer pessoa (cliente, pintor, avaliador): a preferência é da pessoa. Sem consentimento
 * não se envia nada (regra do WhatsApp e da casa, docs/WHATSAPP.md).
 *
 * O número já não se escreve aqui (06/11/2026): associa-se e remove-se no cartão dos números
 * (`NumerosDeWhatsApp`), por mensagem enviada desse número. Este formulário só liga e desliga.
 */
export function AvisosPorWhatsApp({ alertaWhatsApp, temNumero }: { alertaWhatsApp: boolean; temNumero: boolean }) {
  const { state, pending, formProps } = useFormAction<FormState>(guardarAvisosPorWhatsApp, { errors: {} });
  const erro = state.errors.alerta_whatsapp;

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
      <p className="text-[15px] text-slate-600">
        {temNumero
          ? 'Por exemplo, quando o contrato está pronto para assinar. Só avisos de trabalho, nunca publicidade.'
          : 'Primeiro, associar um número.'}
      </p>
      {erro && (
        <p className="text-[15px] font-semibold text-amber-800" role="alert">
          {erro}
        </p>
      )}
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
