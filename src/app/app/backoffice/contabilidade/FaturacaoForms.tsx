'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { emitAllInvoicesAction, emitInvoiceAction } from '../actions';

const note = (s: FormState) => {
  const m = Object.values(s.errors)[0] ?? s.message;
  return m ? (
    <p className={`text-[17px] ${s.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
      {m}
    </p>
  ) : null;
};

export function EmitAllButton() {
  const { state, pending, formProps } = useFormAction<FormState>(async () => emitAllInvoicesAction(), { errors: {} });
  return (
    <form {...formProps} className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? 'A emitir…' : 'Emitir todos os pendentes'}
      </button>
      {note(state)}
    </form>
  );
}

export function EmitOneButton({ originType, originId }: { originType: string; originId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(async () => emitInvoiceAction(originType, originId), { errors: {} });
  return (
    <form {...formProps} className="mt-1 flex flex-wrap items-center gap-2 text-[17px]">
      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? 'A emitir…' : 'Emitir'}
      </button>
      {note(state)}
    </form>
  );
}
