'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { proposeAddenda, withdrawAddenda } from '@/app/app/obras/actions';

/**
 * Propor um trabalho a mais ao cliente — ou oferecê-lo.
 *
 * A oferta entrou a 28/10/2026 e não é um detalhe: o pintor que fez o que não estava contratado e
 * decide não cobrar quer à mesma que o cliente o saiba. "Fiz isto a mais e nem lhe cobro por isso"
 * é a melhor propaganda que ele tem, e não tinha onde ficar escrita. Com a caixa marcada o preço
 * passa a opcional, não há nada à espera de resposta, e o trabalho entra no relatório de entrega
 * como oferecido.
 */
export function ProposeAddenda({ engagementId }: { engagementId: string }) {
  const [oferta, setOferta] = useState(false);
  const { state, pending, formProps } = useFormAction<FormState>(proposeAddenda.bind(null, engagementId), { errors: {} }, { resetOnSuccess: true });
  const msg = Object.values(state.errors)[0] ?? state.message;
  return (
    <form {...formProps} className="space-y-3 text-[17px]">
      <label className="block">
        O que é o trabalho a mais
        <textarea
          name="descricao"
          rows={2}
          placeholder="Pintura da caixa de escadas, três pisos, com preparação e duas demãos"
          className="campo mt-1"
        />
      </label>

      <label className="flex min-h-[44px] items-start gap-2.5">
        <input type="checkbox" name="oferta" checked={oferta} onChange={(e) => setOferta(e.target.checked)} className="mt-1" />
        <span>
          Ofereço este trabalho — não cobro ao cliente
          <span className="block text-[15px] leading-snug text-slate-600">
            O cliente vê o que foi feito e que não lhe é cobrado. Não acresce ao valor da obra nem fica à espera de
            resposta.
          </span>
        </span>
      </label>

      <label className="block sm:max-w-xs">
        {oferta ? 'Quanto valeria, sem IVA (€) — opcional' : 'Preço sem IVA (€)'}
        <input name="valor" type="text" inputMode="decimal" placeholder="320,00" className="campo mt-1" />
        {oferta && (
          <span className="mt-1 block text-[15px] leading-snug text-slate-600">
            Em branco não mostra valor nenhum. Escrito, fica no relatório a dizer quanto ofereceu.
          </span>
        )}
      </label>

      {msg && <p className={state.ok ? 'text-tinta-700' : 'text-red-700'}>{msg}</p>}
      <button type="submit" disabled={pending} className="btn-secondary">
        {oferta ? 'Registar como oferecido' : 'Enviar ao cliente'}
      </button>
    </form>
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
