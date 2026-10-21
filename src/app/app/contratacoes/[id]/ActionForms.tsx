'use client';

import { useFormAction } from '@/components/useFormAction';
import type { FormState } from '@/app/app/actions';
import { partyAction, platformAction } from '@/app/app/contratacoes/actions';

const primary =
  'rounded-lg bg-tinta-600 px-5 py-2 text-sm font-semibold text-white hover:bg-tinta-700 disabled:opacity-60';
const secondary =
  'rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60';
const danger =
  'rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60';

function Status({ state }: { state: FormState }) {
  const msg = Object.values(state.errors)[0] ?? state.message;
  return msg ? (
    <p className={`text-sm ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
      {msg}
    </p>
  ) : null;
}

type PartyKind = 'cliente_assinou' | 'cliente_desistiu' | 'pintor_assinou' | 'litigio_aberto' | 'encerrar_sem_contrato';

const PARTY: Record<PartyKind, { label: string; style: string; confirm?: string; reason?: boolean; warning?: string }> = {
  cliente_assinou: {
    label: 'Assinar a minuta',
    style: primary,
    confirm: 'Li a minuta e aceito-a. Tenho poderes para obrigar a entidade (num condomínio, a ata aprova esta proposta).',
  },
  pintor_assinou: {
    label: 'Assinar o contrato',
    style: primary,
    confirm: 'Li o contrato, verifiquei a identidade do cliente e aceito-o. Tenho poderes para obrigar a empresa.',
  },
  cliente_desistiu: {
    label: 'Desistir',
    style: danger,
    warning:
      'Antes de conhecer o pintor, desiste sem perder nada. Depois de o conhecer, perde a caução de 3%; o adiantamento, se houver, é-lhe devolvido.',
  },
  litigio_aberto: {
    label: 'Abrir litígio',
    style: danger,
    reason: true,
    warning: 'As cauções ficam retidas até haver acordo ou decisão; o adiantamento volta ao cliente.',
  },
  encerrar_sem_contrato: {
    label: 'Encerrar sem contrato',
    style: secondary,
    warning: 'A caução e o adiantamento são-lhe devolvidos por inteiro.',
  },
};

export function PartyAction({ engagementId, kind }: { engagementId: string; kind: PartyKind }) {
  const { state, pending, formProps } = useFormAction<FormState>(partyAction.bind(null, engagementId, kind), { errors: {} });
  const c = PARTY[kind];
  return (
    <form {...formProps} className="space-y-2 rounded-xl border border-slate-200 p-4">
      {c.warning && <p className="text-sm text-slate-600">{c.warning}</p>}
      {c.confirm && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="confirmo" value="sim" className="mt-1" />
          <span>{c.confirm}</span>
        </label>
      )}
      {c.reason && (
        <textarea name="motivo" rows={2} placeholder="Motivo" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      )}
      <Status state={state} />
      <button type="submit" disabled={pending} className={c.style}>
        {pending ? 'A registar…' : c.label}
      </button>
    </form>
  );
}

type PlatformKind = 'deposito_confirmado' | 'fee_recebido' | 'litigio_resolvido';

const PLATFORM: Record<PlatformKind, string> = {
  deposito_confirmado: 'Confirmar depósito do cliente',
  fee_recebido: 'Confirmar comissão do pintor',
  litigio_resolvido: 'Registar decisão do litígio',
};

export function PlatformAction({ engagementId, kind, expected }: { engagementId: string; kind: PlatformKind; expected?: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(platformAction.bind(null, engagementId, kind), {
    errors: {},
  });
  return (
    <form {...formProps} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
      <p className="font-semibold">{PLATFORM[kind]}</p>
      {kind === 'litigio_resolvido' ? (
        <select name="decisao" defaultValue="" className="block rounded-lg border border-slate-300 bg-white px-3 py-2">
          <option value="" disabled>
            Decisão…
          </option>
          <option value="culpa_cliente">Culpa do cliente: perde a caução, o pintor recupera a comissão</option>
          <option value="culpa_pintor">Culpa do pintor: perde a comissão, o cliente recupera a caução</option>
          <option value="retomar">Acordo: nova minuta para o cliente assinar</option>
        </select>
      ) : (
        <div className="flex flex-wrap gap-3">
          <label>
            Montante recebido (€)
            <input name="montante" defaultValue={expected} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label>
            Recebido em (hora de Lisboa)
            <input name="quando" type="datetime-local" className="mt-1 block rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        </div>
      )}
      <p className="text-xs text-slate-600">
        Registe só o que o parceiro de pagamentos confirmou. Um montante diferente do esperado é recusado.
      </p>
      <Status state={state} />
      <button type="submit" disabled={pending} className={primary}>
        {pending ? 'A registar…' : 'Registar'}
      </button>
    </form>
  );
}
