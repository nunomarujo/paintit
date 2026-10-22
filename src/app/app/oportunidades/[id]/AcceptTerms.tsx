'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { acceptPainterTerms } from '@/app/app/oportunidades/actions';

/** Antes de ver a ficha completa de uma obra (fotografias, superfícies e descrição), a entidade de pintura aceita
 * estes termos — uma vez, válidos para todas as obras (decisão de 22/10/2026, docs/DECISOES.md). O texto fica
 * aqui, não no domínio: não há nenhuma regra de dinheiro a testar, só a versão (src/domain/painterTerms.ts) tem
 * de ficar certa nos dois sítios. */
export function AcceptTerms({ orgId, requestId }: { orgId: string; requestId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(acceptPainterTerms.bind(null, orgId, requestId), { errors: {} });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold">Antes de ver os pormenores desta obra</h2>
      <p className="mt-2 text-sm text-slate-600">
        A ficha completa — fotografias, superfícies e descrição — só se vê depois de aceitar estes termos, uma vez, válidos para todas as obras na Quem
        Pinta:
      </p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
        <li>
          <strong>Comissão confidencial.</strong> O valor ou a percentagem que a Quem Pinta cobra nesta ou em qualquer obra não se revela ao cliente nem a
          terceiros, em nenhuma circunstância.
        </li>
        <li>
          <strong>Uso só para orçamentar.</strong> As fotografias, a descrição e as superfícies servem só para preparar um orçamento nesta plataforma; não
          se partilham, copiam nem usam para contactar o cliente fora da Quem Pinta.
        </li>
        <li>
          <strong>Sem contacto direto antes da apresentação.</strong> Até à apresentação, não se procura identificar nem contactar o cliente, o prédio ou a
          morada da obra, por nenhum meio.
        </li>
        <li>
          <strong>A obra contrata-se na plataforma.</strong> Se for escolhido, o contrato celebra-se através da Quem Pinta; não se combina com o cliente
          contornar a plataforma.
        </li>
        <li>
          <strong>Dados verdadeiros.</strong> As informações dadas sobre a entidade (habilitação, seguros, disponibilidade) são verdadeiras e atuais.
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
