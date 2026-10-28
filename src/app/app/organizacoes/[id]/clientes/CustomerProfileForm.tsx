'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { saveCustomerProfile } from './actions';

export function CustomerProfileForm({
  orgId,
  painterOrgId,
  initial,
}: {
  orgId: string;
  painterOrgId: string;
  initial: { premium: boolean; nota: string };
}) {
  const { state, pending, formProps } = useFormAction<FormState>(saveCustomerProfile.bind(null, orgId, painterOrgId), { errors: {} });
  const m = Object.values(state.errors)[0] ?? state.message;
  return (
    <form {...formProps} className="space-y-3 text-[17px]">
      <label className="flex items-center gap-2">
        <input type="checkbox" name="premium" defaultChecked={initial.premium} /> Cliente premium
      </label>
      <label className="block">
        Notas e condições específicas
        <textarea
          name="nota"
          rows={3}
          defaultValue={initial.nota}
          placeholder="Ex.: pagamento a 30 dias combinado, entrega grátis acima de 50 €…"
          className="mt-1 campo"
        />
      </label>
      {m && <p className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`}>{m}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn-secondary"
      >
        {pending ? 'A guardar…' : 'Guardar'}
      </button>
    </form>
  );
}
