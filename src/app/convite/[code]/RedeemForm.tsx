'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { redeemAndGo } from '@/app/convite/actions';

export function RedeemForm({ code, orgs }: { code: string; orgs: { id: string; nome: string }[] }) {
  const { state, pending, formProps } = useFormAction<FormState>(
    async (prev: FormState, form: FormData) => redeemAndGo(code, String(form.get('painterOrgId') ?? ''), prev),
    { errors: {} },
  );
  return (
    <form {...formProps} className="mt-6 space-y-3">
      {orgs.length > 1 && (
        <label className="block text-[17px] font-medium text-slate-700">
          Com qual entidade?
          <select name="painterOrgId" required defaultValue={orgs[0]!.id} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[17px]">
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </label>
      )}
      {orgs.length === 1 && <input type="hidden" name="painterOrgId" value={orgs[0]!.id} />}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? 'Um momento…' : 'Ver esta obra'}
      </button>
      {state.message && (
        <p className="text-[17px] text-red-700" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
