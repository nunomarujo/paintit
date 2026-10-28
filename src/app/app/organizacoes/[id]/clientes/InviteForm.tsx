'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { inviteSupplierPainter } from './actions';

export function InviteForm({ orgId }: { orgId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(inviteSupplierPainter.bind(null, orgId), { errors: {} }, { resetOnSuccess: true });
  const e = state.errors;
  return (
    <form {...formProps} className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="block text-[17px]">
        Nome
        <input name="nome" required className="mt-1 campo" />
        {e.nome && <span className="mt-1 block text-red-700">{e.nome}</span>}
      </label>
      <label className="block text-[17px]">
        Email
        <input name="email" type="email" required className="mt-1 campo" />
        {e.email && <span className="mt-1 block text-red-700">{e.email}</span>}
      </label>
      <label className="block text-[17px]">
        Telefone
        <input name="telefone" type="tel" required className="mt-1 campo" />
        {e.telefone && <span className="mt-1 block text-red-700">{e.telefone}</span>}
      </label>
      <label className="block text-[17px]">
        Morada, sede ou localização
        <input name="morada" required className="mt-1 campo" />
        {e.morada && <span className="mt-1 block text-red-700">{e.morada}</span>}
      </label>
      <label className="block text-[17px] sm:col-span-2">
        Código promocional (opcional)
        <input
          name="codigo"
          maxLength={14}
          autoComplete="off"
          placeholder="Deixe em branco para gerar um ao acaso"
          className="mt-1 block w-48 rounded-lg border border-slate-300 px-3 py-2 font-mono uppercase tracking-wider"
        />
        <span className="mt-1 block text-slate-500">Um código seu, memorável (ex.: nome da empresa), em vez de um gerado ao acaso.</span>
        {e.codigo && <span className="mt-1 block text-red-700">{e.codigo}</span>}
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-tinta-600 px-5 py-2 text-[17px] font-semibold text-white hover:bg-tinta-700 disabled:opacity-60 sm:col-span-2 sm:w-fit"
      >
        {pending ? 'A enviar…' : 'Enviar convite'}
      </button>
      {state.message && <p className={`text-[17px] sm:col-span-2 ${state.ok ? 'text-tinta-700' : 'text-red-700'}`}>{state.message}</p>}
    </form>
  );
}
