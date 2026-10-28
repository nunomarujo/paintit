'use client';

import type { FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';

/**
 * Corrigir quem é o cliente, depois de o orçamento existir.
 *
 * Nome, local e título ficavam como tivessem sido escritos na criação, e o contacto não era escrito
 * em lado nenhum: não havia ecrã que o gravasse. O orçamento dizia «o contacto do cliente está por
 * preencher» e não dava onde — e o seguimento, que depende desse email, ficava inalcançável.
 *
 * Fica fechado, para não encher o ecrã com o que raramente muda, e abre sozinho quando falta o que
 * está a travar alguma coisa.
 */
export function DadosDoCliente({
  action,
  inicial,
  abrir,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  inicial: { nome: string; contacto: string | null; nif: string | null; local: string | null; titulo: string | null };
  /** Abrir à chegada: falta o contacto e já há quem espere por ele. */
  abrir?: boolean;
}) {
  const { state, pending, formProps } = useFormAction<FormState>(action, { errors: {} });
  const e = state.errors;

  return (
    <details open={abrir} className="rounded-2xl border border-slate-200 bg-white">
      <summary className="flex min-h-[44px] cursor-pointer items-center px-4 text-[17px] font-semibold text-slate-900 sm:px-5">
        Dados do cliente
      </summary>
      <form {...formProps} className="space-y-4 border-t border-slate-100 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="cliente" label="Cliente" required defaultValue={inicial.nome} error={e.cliente} />
          <Field
            name="nif"
            label="NIPC ou NIF"
            inputMode="numeric"
            defaultValue={inicial.nif ?? undefined}
            error={e.nif}
            hint="Nove dígitos. Evita escrevê-lo outra vez na fatura, e serve para encontrar este orçamento."
          />
          <Field
            name="contacto"
            label="Email do cliente"
            type="email"
            defaultValue={inicial.contacto ?? undefined}
            error={e.contacto}
            hint="É por aqui que a plataforma pergunta, por si, se o orçamento foi visto."
          />
          <Field name="local" label="Local da obra" defaultValue={inicial.local ?? undefined} error={e.local} />
          <Field name="titulo" label="Título do orçamento" defaultValue={inicial.titulo ?? undefined} error={e.titulo} />
        </div>
        {state.message && (
          <p className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
            {state.message}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? 'A guardar…' : 'Guardar'}
        </button>
      </form>
    </details>
  );
}
