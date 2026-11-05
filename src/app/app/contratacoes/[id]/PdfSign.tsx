'use client';

import type { FormState } from '@/app/app/actions';
import { signWithPdf } from '@/app/app/contratacoes/actions';
import type { ReactNode } from 'react';
import { useFormAction } from '@/components/useFormAction';

/** A aplicação gratuita para computador (Windows, macOS, Linux). */
export const APLICACAO_AUTENTICACAO_GOV = 'https://www.autenticacao.gov.pt/web/guest/cc-aplicacao';
/**
 * O guia oficial para assinar com a Chave Móvel Digital, que leva ao serviço de assinatura sem instalar nada
 * (serve no telemóvel). Liga-se ao guia e não ao endereço da ferramenta: esse não ficou confirmado
 * (05/11/2026), e um endereço adivinhado num passo destes perde a pessoa no pior sítio.
 */
export const GUIA_ASSINAR_COM_CMD = 'https://www.gov.pt/guias/assinar-com-a-chave-movel-digital';

/**
 * Os três passos da assinatura, numa sequência real (descarregar → assinar → carregar), cada um com o que
 * se faz e onde. É o fim do rasto de avisos que trouxe a pessoa até aqui (05/11/2026: «avisos bem evidentes
 * para que o user não se perca onde está o doc e como fazer»).
 */
export function PdfSign({ engagementId, side }: { engagementId: string; side: 'cliente' | 'pintor' }) {
  const { state, pending, formProps } = useFormAction<FormState & { aviso?: string }>(signWithPdf.bind(null, engagementId, side), { errors: {} });
  const download = `/app/contratacoes/${engagementId}/pdf?v=${side === 'cliente' ? 'base' : 'cliente'}`;
  // O aviso dos poderes de representação nunca recusa a assinatura: vai como texto âmbar debaixo da
  // confirmação (a banda do ecrã é a do topo, regra 13).
  if (state.ok) {
    return (
      <div className="text-[17px]">
        <p className="font-semibold text-tinta-700">{state.message}</p>
        <p className="mt-1 text-slate-700">
          {side === 'cliente'
            ? 'Segue-se a assinatura do pintor: recebe o aviso agora. Quando ele assinar, o contrato com as duas assinaturas fica para descarregar nesta página.'
            : 'O contrato está assinado pelas duas partes e fica para descarregar nesta página.'}
        </p>
        {state.aviso && <p className="mt-2 text-amber-800">{state.aviso}</p>}
      </div>
    );
  }
  const erro = state.errors.pdf ?? state.message;
  return (
    <ol className="space-y-6 text-[17px]">
      <Passo n={1} titulo={side === 'cliente' ? 'Descarregar o contrato' : 'Descarregar o contrato assinado pelo cliente'}>
        <p className="text-slate-700">
          {side === 'cliente'
            ? 'É o PDF que as duas partes vão assinar. Guardar no aparelho onde vai assinar.'
            : 'Já traz a assinatura do cliente: é neste ficheiro que entra a sua, para o contrato ficar com as duas.'}
        </p>
        <a href={download} className="btn-secondary mt-3">
          Descarregar o PDF
        </a>
      </Passo>

      <Passo n={2} titulo="Assinar com a Chave Móvel Digital ou o Cartão de Cidadão">
        {/* Dois caminhos lado a lado, cada um com o seu botão (44px, regra 17): o computador e o telemóvel. */}
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="font-semibold text-tinta-900">No computador</p>
            <p className="text-slate-700">Abrir o PDF na aplicação gratuita Autenticação.gov e escolher «Assinar».</p>
            <a href={APLICACAO_AUTENTICACAO_GOV} target="_blank" rel="noreferrer" className="btn-secondary btn-sm mt-2">
              Obter a aplicação ↗
            </a>
          </div>
          <div>
            <p className="font-semibold text-tinta-900">No telemóvel, sem instalar nada</p>
            <p className="text-slate-700">Assinar no serviço do Estado com a Chave Móvel Digital e descarregar o PDF assinado.</p>
            <a href={GUIA_ASSINAR_COM_CMD} target="_blank" rel="noreferrer" className="btn-secondary btn-sm mt-2">
              Guia oficial no gov.pt ↗
            </a>
          </div>
        </div>
        <p className="mt-3 max-w-[54ch] text-[15px] text-slate-600">
          A Chave Móvel Digital tem de ter a assinatura ativa (ativa-se no portal Autenticação.gov). Não alterar o documento, nem
          imprimir e digitalizar: o ficheiro tem de ser o mesmo, só com a assinatura acrescentada.
        </p>
      </Passo>

      <Passo n={3} titulo="Carregar aqui o PDF assinado">
        <form {...formProps} className="space-y-3">
          <p className="text-slate-700">Confirmamos que é o mesmo contrato e que a assinatura é válida.</p>
          <input name="pdf" type="file" accept="application/pdf" aria-label="PDF assinado" className="campo block w-full" />
          {/* Âmbar: um PDF recusado resolve-se — assinar de novo e carregar (regra 13). */}
          {erro && (
            <p className="max-w-[54ch] font-semibold text-amber-800" role="alert">
              {erro}
            </p>
          )}
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? 'A verificar…' : 'Carregar o PDF assinado'}
          </button>
        </form>
      </Passo>
    </ol>
  );
}

function Passo({ n, titulo, children }: { n: number; titulo: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[36px_minmax(0,1fr)] gap-x-3">
      <span aria-hidden className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-tinta-900 text-[15px] font-semibold text-white">
        {n}
      </span>
      <div>
        <h3 className="pt-[7px] text-[17px] font-semibold leading-snug">
          <span className="sr-only">Passo {n}: </span>
          {titulo}
        </h3>
        {children}
      </div>
    </li>
  );
}
