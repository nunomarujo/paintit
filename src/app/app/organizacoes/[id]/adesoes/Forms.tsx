'use client';

import type { FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { useState } from 'react';
import { createReferralCode, requestRedemption, savePayoutDetails, submitRedemptionInvoice } from './actions';

const button = 'btn-secondary';
const msg = (s: FormState) => {
  const m = Object.values(s.errors)[0] ?? s.message;
  return m ? (
    <p className={`text-[17px] ${s.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
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

export function PayoutDetailsForm({
  orgId,
  initial,
}: {
  orgId: string;
  initial: { iban: string; titular: string; cobraIva: boolean; isencao: string; retencao: string; validado: boolean; retencaoBps: number } | null;
}) {
  const { state, pending, formProps } = useFormAction<FormState>(savePayoutDetails.bind(null, orgId), { errors: {} });
  const [iva, setIva] = useState(initial?.cobraIva === false ? 'isento' : 'normal');
  const e = state.errors;
  return (
    <form {...formProps} autoComplete="off" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="iban" label="IBAN" required error={e.iban} defaultValue={initial?.iban ?? ''} placeholder="PT50 0000 0000 0000 0000 0000 0" />
        <Field name="titular" label="Titular da conta" required error={e.titular} defaultValue={initial?.titular ?? ''} />
      </div>
      <fieldset className="space-y-2 rounded-xl bg-slate-50 p-4 text-[17px]">
        <legend className="px-1 font-semibold">Regime da sua empresa</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="iva" value="normal" checked={iva === 'normal'} onChange={() => setIva('normal')} /> Liquida IVA na fatura (taxa normal)
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="iva" value="isento" checked={iva === 'isento'} onChange={() => setIva('isento')} /> Isenta de IVA
        </label>
        {iva === 'isento' && <Field name="isencao" label="Fundamento da isenção" required error={e.isencao} defaultValue={initial?.isencao ?? ''} />}
        <Field name="retencao" label="Retenção na fonte" required error={e.retencao}>
          <select name="retencao" defaultValue={initial?.retencao ?? ''} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[17px]">
            <option value="" disabled>
              Escolher…
            </option>
            <option value="nao_sujeito">Não sujeito a retenção (por exemplo, empresa)</option>
            <option value="sujeito">Sujeito a retenção</option>
            <option value="dispensa">Dispensado de retenção (declaração de dispensa)</option>
          </select>
        </Field>
        <p className="text-[15px] text-slate-600">
          A plataforma valida o regime antes do primeiro resgate e define a taxa de retenção, se houver.{' '}
          {initial ? (initial.validado ? `Regime validado${initial.retencaoBps ? ` (retenção ${initial.retencaoBps / 100}%)` : ''}.` : 'Regime por validar.') : ''}
        </p>
      </fieldset>
      {msg(state)}
      <button type="submit" disabled={pending} className={button}>
        {pending ? 'A guardar…' : 'Guardar dados de pagamento'}
      </button>
    </form>
  );
}

export function RedeemButton({ orgId, disabled }: { orgId: string; disabled: boolean }) {
  const { state, pending, formProps } = useFormAction<FormState>(async () => requestRedemption(orgId), { errors: {} });
  return (
    <form {...formProps} className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending || disabled} className="btn-primary">
        {pending ? 'A pedir…' : 'Resgatar saldo'}
      </button>
      {msg(state)}
    </form>
  );
}

export function InvoiceForm({ orgId, redemptionId }: { orgId: string; redemptionId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(submitRedemptionInvoice.bind(null, orgId, redemptionId), { errors: {} });
  const e = state.errors;
  return (
    <form {...formProps} autoComplete="off" className="mt-2 flex flex-wrap items-end gap-3 rounded-xl bg-amber-50 p-3">
      <Field name="numero" label="N.º da fatura" required error={e.numero} />
      <Field name="ficheiro" label="Fatura (PDF)" required error={e.ficheiro}>
        <input name="ficheiro" type="file" required accept="application/pdf" className="mt-1 block text-[17px]" />
      </Field>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? 'A enviar…' : 'Enviar fatura'}
      </button>
      <div className="basis-full">{msg(state)}</div>
    </form>
  );
}
