'use client';

import { useFormAction } from '@/components/useFormAction';
import type { FormState } from '@/app/app/actions';
import { publishRequest } from '@/app/app/pedidos/actions';
import type { Bloqueio } from '@/domain/request';

/**
 * Publicar, e o que falta para isso.
 *
 * **O que mudou a 29/10/2026.** A caixa âmbar dizia «Antes de publicar:» e listava tudo junto,
 * medições incluídas. A um cliente com um profissional a caminho para medir, isso lê-se como uma
 * lista de coisas que ele fez mal — e foi o que o promotor apanhou. Agora as medições, quando há
 * visita a caminho, saem da lista e passam a uma frase que diz o que se passa: ficam para o
 * levantamento. O âmbar fica para o que é mesmo dele, e só quando é.
 */
export function PublishButton({
  requestId,
  blockers,
  aguardaLevantamento = false,
}: {
  requestId: string;
  blockers: Bloqueio[];
  /** Há um levantamento aberto ou reservado: as medições não são tarefa do cliente. */
  aguardaLevantamento?: boolean;
}) {
  const { state, pending, formProps } = useFormAction<FormState>(publishRequest.bind(null, requestId), {
    errors: {},
  });

  // Com visita a caminho, as medições saem da lista: são do levantamento, e dizem-se noutra frase.
  const doCliente = aguardaLevantamento ? blockers.filter((b) => b.de === 'cliente') : blockers;

  return (
    <form {...formProps} className="space-y-3">
      {aguardaLevantamento && blockers.some((b) => b.de === 'levantamento') && (
        <p className="text-[17px] text-slate-700">
          As medições serão preenchidas no levantamento. Não precisa de as indicar agora.
        </p>
      )}
      {doCliente.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-4 text-[17px]">
          <p className="font-medium">Antes de publicar:</p>
          <ul className="mt-1 list-disc pl-5">
            {doCliente.map((b) => (
              <li key={b.texto}>{b.texto}</li>
            ))}
          </ul>
        </div>
      )}
      {state.message && (
        <p className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || blockers.length > 0}
        className="rounded-lg bg-tinta-600 px-5 py-2 font-semibold text-white hover:bg-tinta-700 disabled:opacity-50"
      >
        {pending ? 'A publicar…' : 'Publicar pedido'}
      </button>
    </form>
  );
}
