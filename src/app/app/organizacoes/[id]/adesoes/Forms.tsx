'use client';

import type { FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { createReferralCode, savePayoutDetails, submitReferralInvoice } from './actions';

const button = 'rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60';
const msg = (s: FormState) => {
  const m = Object.values(s.errors)[0] ?? s.message;
  return m ? (
    <p className={`text-sm ${s.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
      {m}
    </p>
  ) : null;
};

export function NewCodeForm({ orgId }: { orgId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(createReferralCode.bind(null, orgId), { errors: {} }, { resetOnSuccess: true });
  return (
    <form {...formProps} autoComplete="off" className="flex flex-wrap items-end gap-3">
      <div className="min-w-64 flex-1">
        <Field name="nota" label="Nota para si (opcional)" hint="Por exemplo, o nome do pintor a quem entrega o código. Só a sua equipa a vê." />
      </div>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? 'A criar…' : 'Criar código'}
      </button>
      <div className="basis-full">{msg(state)}</div>
    </form>
  );
}

export function PayoutDetailsForm({ orgId, initial }: { orgId: string; initial: { iban: string; titular: string; cobraIva: boolean } | null }) {
  const { state, pending, formProps } = useFormAction<FormState>(savePayoutDetails.bind(null, orgId), { errors: {} });
  const e = state.errors;
  return (
    <form {...formProps} autoComplete="off" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="iban" label="IBAN" required error={e.iban} defaultValue={initial?.iban ?? ''} placeholder="PT50 0000 0000 0000 0000 0000 0" />
        <Field name="titular" label="Titular da conta" required error={e.titular} defaultValue={initial?.titular ?? ''} />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="cobraIva" value="sim" defaultChecked={initial?.cobraIva ?? true} className="mt-1" />
        <span>A minha empresa liquida IVA na fatura desta comissão (a comissão acresce de IVA à taxa normal).</span>
      </label>
      {msg(state)}
      <button type="submit" disabled={pending} className={button}>
        {pending ? 'A guardar…' : 'Guardar dados de pagamento'}
      </button>
    </form>
  );
}

export function InvoiceForm({ orgId, payoutId }: { orgId: string; payoutId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(submitReferralInvoice.bind(null, orgId, payoutId), { errors: {} });
  const e = state.errors;
  return (
    <form {...formProps} autoComplete="off" className="mt-2 flex flex-wrap items-end gap-3 rounded-xl bg-amber-50 p-3">
      <Field name="numero" label="N.º da fatura" required error={e.numero} />
      <Field name="ficheiro" label="Fatura (PDF)" required error={e.ficheiro}>
        <input name="ficheiro" type="file" required accept="application/pdf" className="mt-1 block text-sm" />
      </Field>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? 'A enviar…' : 'Enviar fatura'}
      </button>
      <div className="basis-full">{msg(state)}</div>
    </form>
  );
}
