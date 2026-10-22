'use client';

import type { FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { createRequestInvite, setRequestInviteActive } from '@/app/app/pedidos/actions';
import { BRAND } from '@/config/brand';

const msg = (s: FormState) => {
  const m = Object.values(s.errors)[0] ?? s.message;
  return m ? (
    <p className={`text-sm ${s.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
      {m}
    </p>
  ) : null;
};

export interface RequestInvite {
  id: string;
  code: string;
  nota: string | null;
  active: boolean;
  estado: 'disponivel' | 'associado' | 'desativado';
  painterNome: string | null;
}

/** "Traga o seu pintor" (docs/DECISOES.md, 22/10/2026): um código por obra publicada, para entregar à empresa de
 * confiança do cliente. Ganhando a obra por este caminho, a comissão é muito mais baixa do que a normal — não é
 * esta página que o diz (o cliente nunca vê a comissão do pintor, CLAUDE.md regra 13); só se explica o essencial. */
export function RequestInvites({ requestId, invites }: { requestId: string; invites: RequestInvite[] }) {
  const { state, pending, formProps } = useFormAction<FormState>(createRequestInvite.bind(null, requestId), { errors: {} }, { resetOnSuccess: true });
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold">Convide diretamente a sua empresa de confiança</h2>
      <p className="mt-1 text-sm text-slate-600">
        Já tem uma empresa de pintura com quem trabalha bem? Crie um código e entregue-o (ou mostre o QR, se preferir imprimi-lo) para ela orçamentar esta
        obra diretamente, como mais uma das propostas a comparar — sem ter de a procurar na Quem Pinta.
      </p>
      <form {...formProps} autoComplete="off" className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <Field name="nota" label="Nota para si (opcional)" hint="Por exemplo, o nome da empresa a quem entrega o código." />
        </div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? 'A criar…' : 'Criar código'}
        </button>
        <div className="basis-full">{msg(state)}</div>
      </form>
      {invites.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">Ainda não criou nenhum código.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 text-sm">
          {invites.map((i) => (
            <li key={i.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-base font-semibold tracking-wider">{i.code}</span>
                  {i.nota && <span className="ml-2 text-slate-600">{i.nota}</span>}
                  <span className="block text-slate-600">
                    {i.estado === 'desativado' ? 'Desativado' : i.estado === 'associado' ? `Associado a ${i.painterNome ?? 'uma empresa'}` : 'Disponível'}
                  </span>
                </div>
                <form action={setRequestInviteActive.bind(null, requestId, i.id, !i.active)}>
                  <button type="submit" className="text-tinta-700 hover:underline">
                    {i.active ? 'Desativar' : 'Reativar'}
                  </button>
                </form>
              </div>
              {i.active && (
                <p className="mt-1 break-all text-xs text-slate-500">
                  {BRAND.url}/convite/{i.code}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
