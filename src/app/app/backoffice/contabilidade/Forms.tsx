'use client';

import type { FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { closePeriodAction, decideRedemption, reopenPeriodAction, syncLedgerAction, syncStripeAction, validateRegimeAction, voidPayoutAction } from '../actions';

const note = (s: FormState) => {
  const m = Object.values(s.errors)[0] ?? s.message;
  return m ? (
    <p className={`text-sm ${s.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
      {m}
    </p>
  ) : null;
};

export function SyncButton() {
  const { state, pending, formProps } = useFormAction<FormState>(async () => syncLedgerAction(), { errors: {} });
  return (
    <form {...formProps} className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? 'A lançar…' : 'Sincronizar agora'}
      </button>
      {note(state)}
    </form>
  );
}

export function SyncStripeButton() {
  const { state, pending, formProps } = useFormAction<FormState>(async () => syncStripeAction(), { errors: {} });
  return (
    <form {...formProps} className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? 'A ler a Stripe…' : 'Obter movimentos da Stripe e reconciliar'}
      </button>
      {note(state)}
    </form>
  );
}

export function RedemptionForm({ id, canPay }: { id: string; canPay: boolean }) {
  const { state, pending, formProps } = useFormAction<FormState>(decideRedemption.bind(null, id), { errors: {} });
  return (
    <form {...formProps} autoComplete="off" className="mt-2 flex flex-wrap items-end gap-3">
      <Field name="texto" label={canPay ? 'Referência da transferência (ou motivo, se anular)' : 'Motivo, se anular'} />
      {canPay && (
        <button type="submit" name="decision" value="paga" disabled={pending} className="btn-primary">
          Marcar como pago
        </button>
      )}
      <button type="submit" name="decision" value="anular" disabled={pending} className="btn-secondary">
        Anular
      </button>
      <div className="basis-full">{note(state)}</div>
    </form>
  );
}

export function VoidPayoutForm({ id }: { id: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(voidPayoutAction.bind(null, id), { errors: {} });
  return (
    <form {...formProps} autoComplete="off" className="mt-1 flex flex-wrap items-end gap-3">
      <Field name="texto" label="Sem efeito (a obra caiu e a comissão do pintor foi devolvida): motivo" />
      <button type="submit" disabled={pending} className="btn-secondary">
        Pôr sem efeito
      </button>
      <div className="basis-full">{note(state)}</div>
    </form>
  );
}

export function RegimeForm({ orgId, current }: { orgId: string; current: number }) {
  const { state, pending, formProps } = useFormAction<FormState>(validateRegimeAction.bind(null, orgId), { errors: {} });
  return (
    <form {...formProps} autoComplete="off" className="mt-1 flex flex-wrap items-end gap-3">
      <Field name="retencao" label="Taxa de retenção (%)" inputMode="numeric" defaultValue={String(current / 100)} hint="0 se não houver retenção. Validar confirma o regime declarado." />
      <button type="submit" disabled={pending} className="btn-primary">
        Validar regime
      </button>
      <div className="basis-full">{note(state)}</div>
    </form>
  );
}

export function PeriodForms({ next, canClose, canReopen }: { next: string; canClose: boolean; canReopen: boolean }) {
  const close = useFormAction<FormState>(closePeriodAction, { errors: {} });
  const reopen = useFormAction<FormState>(async () => reopenPeriodAction(), { errors: {} });
  return (
    <div className="mt-4 space-y-3">
      <form {...close.formProps} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="mes" value={next} />
        <button type="submit" disabled={close.pending || !canClose} className="btn-primary">
          Fechar {next}
        </button>
        {note(close.state)}
      </form>
      {canReopen && (
        <form {...reopen.formProps} className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={reopen.pending} className="btn-secondary">
            Reabrir o último mês fechado
          </button>
          {note(reopen.state)}
        </form>
      )}
    </div>
  );
}
