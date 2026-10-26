'use client';

import type { FormState } from '@/app/app/actions';
import { ConcelhosPicker } from '@/components/ConcelhosPicker';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { requestSurveyRedemption, setSurveyCoverage, submitSurveyRedemptionInvoice } from './actions';

const button = 'rounded-lg border border-slate-300 px-4 py-2 text-[17px] font-semibold hover:bg-slate-50 disabled:opacity-60';
const msg = (s: FormState) => {
  const m = Object.values(s.errors)[0] ?? s.message;
  return m ? (
    <p className={`text-[17px] ${s.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
      {m}
    </p>
  ) : null;
};

export function CoverageForm({ orgId, initial }: { orgId: string; initial: string[] }) {
  const { state, pending, formProps } = useFormAction<FormState>(setSurveyCoverage.bind(null, orgId), { errors: {} });
  return (
    <form {...formProps} className="flex flex-wrap items-end gap-3">
      <div className="min-w-64 flex-1">
        <Field name="concelhos" label="Concelhos" hint="Vazio = todo o país.">
          <ConcelhosPicker name="concelhos" defaultValue={initial} />
        </Field>
      </div>
      <button type="submit" disabled={pending} className={button}>
        {pending ? 'A guardar…' : 'Guardar'}
      </button>
      <div className="basis-full">{msg(state)}</div>
    </form>
  );
}

export function RedeemButton({ orgId, disabled }: { orgId: string; disabled: boolean }) {
  const { state, pending, formProps } = useFormAction<FormState>(async () => requestSurveyRedemption(orgId), { errors: {} });
  return (
    <form {...formProps} className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending || disabled} className={button}>
        {pending ? 'A pedir…' : 'Resgatar saldo'}
      </button>
      {msg(state)}
    </form>
  );
}

export function SurveyInvoiceForm({ orgId, redemptionId }: { orgId: string; redemptionId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(submitSurveyRedemptionInvoice.bind(null, orgId, redemptionId), { errors: {} });
  const e = state.errors;
  return (
    <form {...formProps} autoComplete="off" className="mt-2 flex flex-wrap items-end gap-3 rounded-xl bg-amber-50 p-3">
      <Field name="numero" label="N.º da fatura" required error={e.numero} />
      <Field name="ficheiro" label="Fatura (PDF)" required error={e.ficheiro}>
        <input name="ficheiro" type="file" required accept="application/pdf" className="mt-1 block text-[17px]" />
      </Field>
      <button type="submit" disabled={pending} className={button}>
        {pending ? 'A enviar…' : 'Enviar fatura'}
      </button>
      <div className="basis-full">{msg(state)}</div>
    </form>
  );
}
