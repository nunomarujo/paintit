'use client';

import { useFormAction } from '@/components/useFormAction';
import type { FormState } from '@/app/app/actions';
import { chooseProposal } from '@/app/app/oportunidades/actions';

export function ChooseButton({ proposalId, requestId, summary }: { proposalId: string; requestId: string; summary: string[] }) {
  const { state, pending, formProps } = useFormAction<FormState>(chooseProposal.bind(null, proposalId, requestId), {
    errors: {},
  });
  return (
    <details className="rounded-xl border border-tinta-100 bg-tinta-50 p-4 text-[17px]">
      <summary className="cursor-pointer font-semibold text-tinta-900">Escolher esta proposta</summary>
      <div className="mt-3 space-y-3">
        <p className="font-medium">O que acontece a seguir:</p>
        <ul className="list-disc space-y-1 pl-5">
          {summary.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        {state.message && (
          <p className="text-red-700" role="alert">
            {state.message}
          </p>
        )}
        <form {...formProps}>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-tinta-600 px-5 py-2 font-semibold text-white hover:bg-tinta-700 disabled:opacity-60"
          >
            {pending ? 'A registar…' : 'Confirmo a escolha'}
          </button>
        </form>
      </div>
    </details>
  );
}
