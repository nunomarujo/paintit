'use client';

import { useState, type ReactNode } from 'react';
import { useConfirmacao } from '@/components/Confirmar';

/**
 * O pedido publicado tem uma interface própria, de acompanhamento — não a de preparação
 * (canvas «Espaço do cliente», 01/11/2026). Até aqui, um pedido «a receber propostas» continuava a
 * mostrar a navegação de preenchimento, «Rever e publicar» e as instruções de rascunho.
 *
 * Separadores: só os que fazem sentido para uma obra publicada. O conteúdo de cada um é o mesmo
 * que já existia (resumo, zonas, fotografias, pré-visualização do anúncio); muda a organização.
 */
export const SEPARADORES = [
  { id: 'geral', nome: 'Visão geral' },
  { id: 'detalhes', nome: 'Detalhes da obra' },
  { id: 'levantamento', nome: 'Levantamento' },
  { id: 'propostas', nome: 'Propostas' },
  { id: 'documentos', nome: 'Documentos' },
] as const;
export type SeparadorId = (typeof SEPARADORES)[number]['id'];

export function Acompanhamento({
  slots,
  contagens,
  inicial = 'geral',
}: {
  slots: Record<SeparadorId, ReactNode>;
  contagens?: Partial<Record<SeparadorId, number>>;
  inicial?: SeparadorId;
}) {
  const [ativo, setAtivo] = useState<SeparadorId>(inicial);
  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-slate-200 max-md:overflow-x-auto">
        {SEPARADORES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={ativo === s.id}
            onClick={() => setAtivo(s.id)}
            className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 px-3.5 text-[15px] ${
              ativo === s.id ? '-mb-px border-b-2 border-tinta-600 font-semibold text-tinta-900' : 'text-slate-600 hover:text-tinta-900'
            }`}
          >
            {s.nome}
            {contagens?.[s.id] !== undefined && (
              <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[13px] font-semibold text-slate-700">
                {contagens[s.id]}
              </span>
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-6">
        {slots[ativo]}
      </div>
    </div>
  );
}

/**
 * As duas ações de consequência do pedido publicado — editar (volta a rascunho: o anúncio sai do
 * ar e os pintores deixam de o ver até republicar) e encerrar — pedem confirmação com a consequência
 * escrita, em vez de estarem a um clique ao lado da informação corrente.
 */
export function AcaoComConsequencia({
  action,
  titulo,
  texto,
  confirmar,
  children,
  className,
  destrutivo = false,
}: {
  action: () => Promise<void>;
  titulo: string;
  texto: string;
  confirmar: string;
  children: ReactNode;
  className: string;
  destrutivo?: boolean;
}) {
  const [pedir, dialogo] = useConfirmacao();
  const [aEnviar, setAEnviar] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={aEnviar}
        className={className}
        onClick={async () => {
          if (!(await pedir({ titulo, texto, confirmar, destrutivo }))) return;
          setAEnviar(true);
          await action();
        }}
      >
        {children}
      </button>
      {dialogo}
    </>
  );
}
