'use client';

import type { FormState } from '@/app/app/actions';
import { signWithPdf } from '@/app/app/contratacoes/actions';
import { useFormAction } from '@/components/useFormAction';

export function PdfSign({ engagementId, side }: { engagementId: string; side: 'cliente' | 'pintor' }) {
  const { state, pending, formProps } = useFormAction<FormState>(signWithPdf.bind(null, engagementId, side), { errors: {} });
  const download = `/app/contratacoes/${engagementId}/pdf?v=${side === 'cliente' ? 'base' : 'cliente'}`;
  if (state.ok) return <p className="rounded-xl bg-tinta-50 p-4 text-sm text-tinta-700">{state.message}</p>;
  return (
    <form {...formProps} className="space-y-4 rounded-xl border border-slate-200 p-5 text-sm">
      <p className="font-semibold">Assinar com Chave Móvel Digital ou Cartão de Cidadão</p>
      <ol className="list-decimal space-y-2 pl-5 text-slate-700">
        <li>
          <a href={download} className="font-semibold text-tinta-700 hover:underline">
            Descarregue o PDF do contrato
          </a>
          {side === 'pintor' ? ' (já assinado pelo cliente).' : '.'}
        </li>
        <li>
          Abra-o na aplicação gratuita{' '}
          <a href="https://www.autenticacao.gov.pt/web/guest/cc-aplicacao" target="_blank" rel="noreferrer" className="text-tinta-700 hover:underline">
            Autenticação.gov
          </a>{' '}
          e escolha “Assinar”, com a Chave Móvel Digital ou o Cartão de Cidadão. Não altere o documento.
        </li>
        <li>Carregue aqui o PDF assinado. Confirmamos que é o mesmo contrato e que a assinatura é válida.</li>
      </ol>
      <input name="pdf" type="file" accept="application/pdf" className="block w-full text-sm" />
      {(state.errors.pdf || state.message) && (
        <p className="text-red-700" role="alert">
          {state.errors.pdf ?? state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? 'A verificar…' : 'Carregar PDF assinado'}
      </button>
    </form>
  );
}
