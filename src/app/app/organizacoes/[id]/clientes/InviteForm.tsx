'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { inviteSupplierPainter } from './actions';

export function InviteForm({ orgId }: { orgId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(inviteSupplierPainter.bind(null, orgId), { errors: {} }, { resetOnSuccess: true });
  const e = state.errors;
  return (
    <form {...formProps} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="block text-sm">
        Nome
        <input name="nome" required className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
        {e.nome && <span className="mt-1 block text-red-700">{e.nome}</span>}
      </label>
      <label className="block text-sm">
        Email
        <input name="email" type="email" required className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
        {e.email && <span className="mt-1 block text-red-700">{e.email}</span>}
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-tinta-600 px-5 py-2 text-sm font-semibold text-white hover:bg-tinta-700 disabled:opacity-60"
      >
        {pending ? 'A enviar…' : 'Enviar convite'}
      </button>
      {state.message && <p className={`text-sm sm:col-span-3 ${state.ok ? 'text-tinta-700' : 'text-red-700'}`}>{state.message}</p>}
    </form>
  );
}
