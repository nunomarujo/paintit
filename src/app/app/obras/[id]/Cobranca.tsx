'use client';

import { setCobranca } from '@/app/app/obras/actions';
import { useFormAction } from '@/components/useFormAction';
import { formatEuros } from '@/domain/money';

/**
 * Autorizar a plataforma a lembrar o cliente desta obra das tranches vencidas.
 *
 * Desligado por omissão. O texto todo fica à vista antes de se carregar no botão: quem autoriza tem
 * de saber exactamente o que vai ser escrito em nome dele, e a quantas vezes se compromete.
 */
export function Cobranca({
  worksiteId,
  ligada,
  contacto,
  emAtrasoCents,
}: {
  worksiteId: string;
  ligada: boolean;
  contacto: string | null;
  emAtrasoCents: number;
}) {
  const { state, pending, formProps } = useFormAction(setCobranca.bind(null, worksiteId), { errors: {} });

  return (
    <form {...formProps} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[17px] font-semibold text-slate-900">
        {ligada ? 'A Quem Pinta está a lembrar o cliente' : 'Quer que lembremos o cliente?'}
      </p>
      <p className="mt-1 text-[15px] leading-relaxed text-slate-600">
        Três mensagens por cada tranche que passe da data prevista: no próprio dia, aos oito dias e aos vinte. Dizem que
        são escritas pelo assistente de IA da sua empresa, com a sua autorização, e dão ao cliente forma de as fazer
        parar. Sem juros, sem ameaças, sem uma quarta. Ao fim de um mês deixamos de escrever ao cliente e avisamo-lo a
        si — a partir daí isto não se resolve por email.
        {emAtrasoCents > 0 && (
          <>
            {' '}
            <strong className="font-semibold text-amber-800">Nesta obra há {formatEuros(emAtrasoCents)} por receber fora do prazo.</strong>
          </>
        )}
      </p>

      <label className="mt-3 block text-[15px] text-slate-700">
        Email do cliente desta obra
        <input
          type="email"
          name="clienteContacto"
          defaultValue={contacto ?? ''}
          placeholder="nome@exemplo.pt"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-[17px] sm:max-w-sm"
        />
      </label>
      {state.errors.clienteContacto && <p className="mt-1 text-[15px] text-amber-900">{state.errors.clienteContacto}</p>}

      <label className="mt-3 flex items-center gap-2 text-[17px] text-slate-800">
        <input
          type="checkbox"
          name="cobranca"
          defaultChecked={ligada}
          className="h-5 w-5 rounded border-slate-400 text-tinta-600 focus:ring-tinta-500"
        />
        Autorizo a Quem Pinta a lembrar este cliente em meu nome
      </label>

      <button type="submit" disabled={pending} className="btn-secondary mt-3">
        {pending ? 'A guardar…' : 'Guardar'}
      </button>
      {state.message && <p className="mt-2 text-[15px] text-slate-600">{state.message}</p>}
    </form>
  );
}
