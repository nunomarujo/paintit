'use client';

import type { FormState } from '@/app/app/actions';
import { MiniForm } from '@/components/MiniForm';
import { useFormAction } from '@/components/useFormAction';
import { proposeAddenda, withdrawAddenda } from '@/app/app/obras/actions';

/** Propor um trabalho a mais ao cliente. */
export function ProposeAddenda({ engagementId }: { engagementId: string }) {
  return (
    <MiniForm
      action={proposeAddenda.bind(null, engagementId)}
      fields={[
        {
          name: 'descricao',
          label: 'O que é o trabalho a mais',
          type: 'textarea',
          placeholder: 'Pintura da caixa de escadas, três pisos, com preparação e duas demãos',
        },
        { name: 'valor', label: 'Preço sem IVA (€)', type: 'text', placeholder: '320,00' },
      ]}
      submit="Enviar ao cliente"
    />
  );
}

/** Retirar um trabalho a mais que o cliente ainda não respondeu. */
export function WithdrawAddenda({ engagementId, addendaId }: { engagementId: string; addendaId: string }) {
  const { pending, formProps } = useFormAction<FormState>(withdrawAddenda.bind(null, engagementId, addendaId), { errors: {} });
  return (
    <form {...formProps}>
      <button type="submit" disabled={pending} className="text-[15px] text-slate-500 underline underline-offset-4 hover:text-slate-700">
        {pending ? 'A retirar…' : 'Retirar'}
      </button>
    </form>
  );
}
