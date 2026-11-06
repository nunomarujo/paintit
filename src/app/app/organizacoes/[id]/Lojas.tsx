'use client';

import type { FormState } from '@/app/app/actions';
import { AddressFields } from '@/components/AddressFields';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { adicionarLoja, removerLoja } from './lojas-actions';

export interface LojaNaLista {
  id: string;
  nome: string;
  morada: string;
  codigo_postal: string;
  localidade: string;
  concelho: string | null;
}

/**
 * As lojas do fornecedor (06/11/2026). Servem, por agora, para os concelhos por omissão: quando a empresa
 * não indica concelhos de levantamento ou de entrega, valem o da morada e os das lojas.
 */
export function Lojas({ orgId, lojas, podeGerir }: { orgId: string; lojas: LojaNaLista[]; podeGerir: boolean }) {
  return (
    <div>
      <h2 className="text-[20px] font-semibold text-slate-900">Lojas</h2>
      <p className="mt-1 max-w-[54ch] text-[15px] text-slate-600">
        Os concelhos das lojas juntam-se ao da morada da empresa quando não se indicam concelhos de levantamento ou
        de entrega. As moradas das lojas ficam só para a empresa e para a plataforma.
      </p>
      {lojas.length === 0 ? (
        <p className="mt-3 text-[17px] text-slate-600">Ainda sem lojas registadas.</p>
      ) : (
        <ul className="mt-3">
          {lojas.map((l) => (
            <li key={l.id} className="flex min-h-[44px] flex-wrap items-center justify-between gap-3 border-t border-slate-200 py-3 first:border-t-0">
              <span className="min-w-0">
                <span className="block text-[17px] font-semibold text-slate-900">{l.nome}</span>
                <span className="block text-[15px] text-slate-600">
                  {l.morada}, {l.codigo_postal} {l.localidade} · {l.concelho ?? 'concelho por ler'}
                </span>
              </span>
              {podeGerir && (
                <form action={removerLoja.bind(null, orgId, l.id)}>
                  <button type="submit" className="btn-quiet btn-sm text-red-700">
                    Remover
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      {podeGerir && <NovaLoja orgId={orgId} />}
    </div>
  );
}

function NovaLoja({ orgId }: { orgId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(adicionarLoja.bind(null, orgId), { errors: {} }, { resetOnSuccess: true });
  const e = state.errors;
  return (
    <form {...formProps} className="mt-5 space-y-4 border-t border-slate-200 pt-5">
      <h3 className="text-[17px] font-semibold text-slate-900">Acrescentar uma loja</h3>
      <Field name="nome" label="Nome da loja" error={e.nome} placeholder="Ex.: Loja de Braga" />
      <AddressFields moradaName="morada" moradaLabel="Morada da loja" required errors={e} />
      {state.message && (
        <p className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? 'A guardar…' : 'Guardar a loja'}
      </button>
    </form>
  );
}
