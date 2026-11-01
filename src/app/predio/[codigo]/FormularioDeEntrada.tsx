'use client';

import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { registar, type Estado } from './actions';

export function FormularioDeEntrada({ codigo }: { codigo: string }) {
  const { state, pending, formProps } = useFormAction<Estado>(registar.bind(null, codigo), { errors: {} });
  const e = state.errors;

  if (state.enviado) {
    return (
      <div className="rounded-2xl bg-tinta-900 p-6 text-white" role="status">
        <p className="text-[13px] font-semibold text-lima">Falta um passo</p>
        <h2 className="mt-1 text-[20px] font-semibold">Veja o email</h2>
        <p className="mt-2 text-[17px] text-tinta-200">
          Seguiu um link de entrada para <span className="font-semibold text-white">{state.email}</span>. Abra-o neste
          telemóvel ou no computador: a área do prédio fica logo disponível, com os seus dados preenchidos.
        </p>
        <p className="mt-3 text-[15px] text-tinta-200">Não chegou? Veja a pasta de spam ou volte a este código daqui a uns minutos.</p>
      </div>
    );
  }

  return (
    <form {...formProps} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="fracao" label="Fração" required placeholder="3.º Esq, B, loja 2…" error={e.fracao} />
        <Field name="andar" label="Andar" required placeholder="3, R/C, cave…" error={e.andar} />
      </div>
      <Field name="nome" label="Nome" error={e.nome} />
      <Field name="email" label="Email" type="email" inputMode="email" required error={e.email} hint="É para aqui que segue o link de entrada." />
      <Field name="telemovel" label="Telemóvel" type="tel" inputMode="tel" required error={e.telemovel} />
      {state.message && (
        <p className="text-[17px] text-red-700" role="alert">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? 'A registar…' : 'Pedir acesso'}
      </button>
      <p className="text-[13px] text-slate-500">
        Os dados servem só para a administração saber quem é quem no prédio. Não vão a pintores nem a fornecedores.
      </p>
    </form>
  );
}
