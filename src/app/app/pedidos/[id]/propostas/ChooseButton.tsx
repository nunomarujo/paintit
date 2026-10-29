'use client';

import { useFormAction } from '@/components/useFormAction';
import type { FormState } from '@/app/app/actions';
import { chooseProposal } from '@/app/app/oportunidades/actions';

/**
 * Escolher a proposta e avançar para o contrato.
 *
 * **Era um `<details>` fechado** (corrigido a 29/10/2026, a pedido do promotor): quem chegava ao fim
 * da comparação via uma linha de texto, tinha de perceber que era clicável, abri-la, e só então
 * encontrava o botão. O passo mais importante do produto — aquele em que o cliente decide — estava
 * escondido atrás de um clique que não se anunciava como tal.
 *
 * Agora o botão está sempre à vista, e **o que acontece a seguir também**. Não se esconde o que uma
 * decisão implica atrás de um «ver mais», quando essa decisão envolve depositar uma caução e perdê-la
 * em certas circunstâncias. Quem decide tem direito a ler antes, sem procurar.
 */
export function ChooseButton({
  proposalId,
  requestId,
  alias,
  summary,
}: {
  proposalId: string;
  requestId: string;
  alias: string;
  summary: string[];
}) {
  const { state, pending, formProps } = useFormAction<FormState>(chooseProposal.bind(null, proposalId, requestId), {
    errors: {},
  });
  return (
    <section className="rounded-2xl border border-tinta-100 bg-tinta-50 p-4 text-[17px] sm:p-5">
      <h3 className="font-semibold text-tinta-900">Escolher {alias} e avançar para o contrato</h3>
      <p className="mt-1 text-[15px] text-tinta-900/80">
        A plataforma prepara a minuta do contrato entre as duas partes. Qualquer uma pode propor ajustes à minuta, e as
        alterações só entram se as duas concordarem.
      </p>

      {state.message && (
        <p className="mt-3 text-red-700" role="alert">
          {state.message}
        </p>
      )}

      <form {...formProps} className="mt-3">
        <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto">
          {pending ? 'A avançar…' : `Selecionar ${alias} e avançar para o contrato`}
        </button>
      </form>

      <div className="mt-4 border-t border-tinta-100 pt-3">
        <p className="font-medium">O que acontece a seguir</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-[15px]">
          {summary.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
