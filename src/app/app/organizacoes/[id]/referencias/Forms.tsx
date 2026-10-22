'use client';

import type { FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { createSupplierReferralInvite } from './actions';

const msg = (s: FormState) => {
  const m = Object.values(s.errors)[0] ?? s.message;
  return m ? (
    <p className={`text-sm ${s.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
      {m}
    </p>
  ) : null;
};

export function NewInviteForm({ orgId }: { orgId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(createSupplierReferralInvite.bind(null, orgId), { errors: {} }, { resetOnSuccess: true });
  return (
    <form {...formProps} autoComplete="off" className="flex flex-wrap items-end gap-3">
      <div className="min-w-64 flex-1">
        <Field name="nota" label="Nota para si (opcional)" hint="Por exemplo, o nome do fornecedor a quem entrega o código. Só a sua equipa a vê." />
      </div>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? 'A criar…' : 'Criar código'}
      </button>
      <div className="basis-full">{msg(state)}</div>
    </form>
  );
}
