'use client';

import type { FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { classifyBankLineAction, importBankFileAction, rematchAction } from './bank-actions';
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

export function BankImportForm() {
  const { state, pending, formProps } = useFormAction<FormState>(importBankFileAction, { errors: {} }, { resetOnSuccess: true });
  return (
    <form {...formProps} className="space-y-3">
      <Field name="ficheiro" label="Extrato do banco (CSV ou CAMT.053 em XML)" required error={state.errors.ficheiro} hint="Até 3 MB. Pode importar extratos que se sobrepõem: o que já existe não se repete.">
        <input name="ficheiro" type="file" required accept=".csv,.txt,.xml,text/csv,text/plain,application/xml,text/xml" className="mt-1 block text-sm" />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? 'A importar…' : 'Importar extrato'}
        </button>
        {note(state)}
      </div>
    </form>
  );
}

export function RematchButton() {
  const { state, pending, formProps } = useFormAction<FormState>(async () => rematchAction(), { errors: {} });
  return (
    <form {...formProps} className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? 'A casar…' : 'Casar de novo'}
      </button>
      {note(state)}
    </form>
  );
}

export interface BankOption {
  value: string;
  label: string;
}

export function BankLineForm({ lineId, options, classified }: { lineId: string; options: BankOption[]; classified: boolean }) {
  const { state, pending, formProps } = useFormAction<FormState>(classifyBankLineAction.bind(null, lineId), { errors: {} });
  if (classified) {
    return (
      <form {...formProps} className="inline">
        <button type="submit" name="decision" value="desfazer" disabled={pending} className="text-sm text-slate-600 hover:underline">
          Desfazer
        </button>
        {note(state)}
      </form>
    );
  }
  return (
    <form {...formProps} autoComplete="off" className="mt-2 flex flex-wrap items-end gap-2 text-sm">
      {options.length > 0 && (
        <label className="font-medium">
          Casar com
          <select name="casar" defaultValue="" className="mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-2">
            <option value="">Escolher…</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <Field name="notas" label="Nota (obrigatória em «Outro»)" error={state.errors.notas} />
      <button type="submit" disabled={pending} className="btn-secondary" title="Casar com a opção escolhida">
        Casar
      </button>
      <button type="submit" name="decision" value="outro" disabled={pending} className="btn-secondary">
        Outro movimento da empresa
      </button>
      <button type="submit" name="decision" value="ignorada" disabled={pending} className="text-slate-600 hover:underline">
        Ignorar
      </button>
      <div className="basis-full">{note(state)}</div>
    </form>
  );
}
