'use client';

import type { ReactNode } from 'react';
import { Countdown } from '@/components/Countdown';
import { PendingBar } from '@/components/PendingBar';
import { Workspace } from '@/components/Workspace';
import type { SurveyPending } from '@/domain/surveyPendings';

/**
 * Área de trabalho do avaliador (pedido do promotor, 24/10/2026). Segue a do pintor — cabeçalho
 * compacto, separadores, barra de pendências — mas adaptada a quem trabalha **de pé, na rua, ao
 * telemóvel**, numa tarefa sequencial com relógio a correr:
 *
 * - a morada manda no cabeçalho: é o que ele precisa e o pintor nunca vê;
 * - o prazo aparece no cabeçalho **e** no separador dos esclarecimentos, em cor de aviso. É o
 *   inverso do separador bloqueado: ali diz "ainda não", aqui diz "está a correr". Um separador
 *   fechado que ele não abra pode custar-lhe a comissão da obra toda;
 * - três separadores, não cinco, e uma coluna só: no telemóvel não há grelha que sobreviva.
 */
export function SurveyWorkspace({
  morada,
  concelho,
  caracteristicas,
  concluido,
  prazo,
  pendings,
  levantamento,
  esclarecimentos,
  obra,
}: {
  morada: string | null;
  concelho: string | null;
  caracteristicas: string;
  concluido: boolean;
  /** Prazo do esclarecimento em curso, se houver. */
  prazo: string | null;
  pendings: SurveyPending[];
  levantamento: ReactNode;
  esclarecimentos: ReactNode;
  obra: ReactNode;
}) {
  const irPara = (p: SurveyPending) => {
    const alvo = document.getElementById(p.ancora);
    alvo?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Workspace
      titulo={`Levantamento${concelho ? ` · ${concelho}` : ''}`}
      referencia={morada ?? 'Morada disponível depois de aceitar os termos'}
      resumo={[
        ...(caracteristicas ? [{ label: 'O prédio', valor: caracteristicas }] : []),
        { label: 'Estado', valor: concluido ? 'Concluído' : 'Reservado por si' },
      ]}
      barra={
        <>
          {prazo && !concluido && (
            <p className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[17px] text-amber-900">
              <span aria-hidden>⏱</span> Esclarecimento com prazo a correr: <Countdown deadline={prazo} />
            </p>
          )}
          <PendingBar pendings={pendings} onIr={irPara} />
        </>
      }
      inicial="levantamento"
      tabs={[
        { id: 'levantamento', label: 'Levantamento', content: levantamento },
        {
          id: 'esclarecimentos',
          label: prazo && !concluido ? <>Esclarecimentos ⏱</> : 'Esclarecimentos',
          destaque: !!prazo && !concluido,
          content: esclarecimentos,
        },
        { id: 'obra', label: 'A obra', content: obra },
      ]}
    />
  );
}
