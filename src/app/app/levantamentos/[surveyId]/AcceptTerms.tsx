'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { acceptSurveyTerms } from '../actions';

/** Antes de ver a morada e os dados de uma obra reservada, o avaliador aceita estes termos — uma vez,
 * válidos para todas as visitas (decisão de 23/10/2026, docs/DECISOES.md). O texto fica aqui, não no
 * domínio: só a versão (src/domain/surveyTerms.ts) tem de ficar certa nos dois sítios. */
export function AcceptTerms({ surveyId }: { surveyId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(acceptSurveyTerms.bind(null, surveyId), { errors: {} });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold">Antes de ver a morada e os dados desta obra</h2>
      <p className="mt-2 text-sm text-slate-600">
        A morada exata e os dados desta e de qualquer outra obra reservada só se veem depois de aceitar estes termos, uma vez, válidos para todas as
        visitas na Quem Pinta:
      </p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
        <li>
          <strong>Confidencialidade.</strong> A morada, os contactos e os dados desta obra não se partilham, copiam nem usam fora desta plataforma, com
          ninguém.
        </li>
        <li>
          <strong>Sem responsabilidade pelos dados.</strong> O levantamento é uma ajuda a quem pede: a responsabilidade pelas medidas e pelas informações
          registadas continua do cliente, como se as tivesse preenchido sozinho.
        </li>
        <li>
          <strong>Sem custo, sem obrigação de escolha.</strong> A visita não introduz nenhum custo para o cliente e não dá direito a ser escolhido para a
          obra nem a tratar diretamente com o cliente fora da plataforma.
        </li>
        <li>
          <strong>Conduta da visita.</strong> A visita respeita o horário combinado e os limites do que foi pedido: medir e fotografar para o
          levantamento, nada mais.
        </li>
      </ol>
      <p className="mt-4 text-xs text-slate-500">
        Aceitar substitui qualquer versão anterior destes termos. Sendo alterados de forma substancial, pede-se a aceitação de novo.
      </p>
      <form {...formProps} className="mt-4">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? 'A registar…' : 'Aceito estes termos'}
        </button>
        {state.message && (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {state.message}
          </p>
        )}
      </form>
    </div>
  );
}
