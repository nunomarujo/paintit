'use client';

import { prolongarPrazo } from '@/app/app/pedidos/actions';
import { useFormAction } from '@/components/useFormAction';

/**
 * Adiar o fim do prazo, quando ele está a chegar e ainda não chegaram propostas que cheguem.
 *
 * Aparece antes da entrega, nunca depois: assim que o cliente vê uma proposta, prolongar dava-lhe
 * vantagem sobre quem entrasse a seguir. Quem recusa isso é a base de dados; aqui só se evita
 * oferecer um botão que ia dar erro.
 */
export function ProlongarPrazo({ requestId, prazo, quantas }: { requestId: string; prazo: string; quantas: number }) {
  const { state, pending, formProps } = useFormAction(prolongarPrazo.bind(null, requestId), { errors: {} });
  const sugestao = new Date(new Date(`${prazo}T00:00:00Z`).getTime() + 7 * 86_400_000).toISOString().slice(0, 10);

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
      <p className="text-[17px] font-semibold text-amber-900">
        {quantas === 0
          ? 'O prazo está a acabar e ainda não chegou nenhuma proposta.'
          : 'O prazo está a acabar e só chegou uma proposta.'}
      </p>
      <p className="mt-1 text-[15px] text-slate-700">
        {quantas === 0
          ? 'Dar mais uns dias costuma bastar: muitos pintores orçamentam ao fim de semana.'
          : 'Com uma só proposta não há nada para comparar. Pode dar mais uns dias, ou avançar com ela quando o prazo acabar.'}
      </p>
      <form {...formProps} className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-[15px] text-slate-700">
          <span className="block">Novo prazo</span>
          <input
            type="date"
            name="prazo"
            defaultValue={sugestao}
            min={prazo}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-[17px]"
          />
        </label>
        <button type="submit" disabled={pending} className="btn-secondary">
          {pending ? 'A adiar…' : 'Dar mais tempo'}
        </button>
      </form>
      {state.errors.prazo && <p className="mt-2 text-[15px] text-amber-900">{state.errors.prazo}</p>}
    </div>
  );
}
