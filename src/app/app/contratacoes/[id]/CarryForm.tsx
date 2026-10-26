'use client';

import { useFormAction } from '@/components/useFormAction';
import type { FormState } from '@/app/app/actions';
import { carryToProposal } from '@/app/app/contratacoes/actions';

export function CarryForm({ engagementId, requestId, proposalId, label }: { engagementId: string; requestId: string; proposalId: string; label: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(carryToProposal.bind(null, engagementId, requestId, proposalId),
    { errors: {} },);
  return (
    <form {...formProps} className="flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-slate-300 px-4 py-2 text-[17px] font-semibold hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? 'A passar…' : label}
      </button>
      {state.message && <span className="text-[17px] text-red-700">{state.message}</span>}
    </form>
  );
}
