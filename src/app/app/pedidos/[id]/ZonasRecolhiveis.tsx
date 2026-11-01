import type { ReactNode } from 'react';

/**
 * Com uma visita pedida, os campos de medição não são tarefa do cliente: ficam recolhidos atrás de
 * «Acrescentar informação que já sei», e o ecrã deixa de parecer que o manda medir. Sem visita (ou
 * quando o cliente a dispensou), aparecem abertos, como sempre.
 */
export function ZonasRecolhiveis({ recolhido, children }: { recolhido: boolean; children: ReactNode }) {
  if (!recolhido) return <div className="mt-4">{children}</div>;
  return (
    <details className="mt-4 rounded-lg border border-slate-200">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 px-4 text-[15px] font-semibold text-tinta-900 [&::-webkit-details-marker]:hidden">
        Acrescentar informação que já sei
        <span className="text-[13px] font-normal text-slate-600">Opcional — zonas, medidas, trabalhos por zona</span>
      </summary>
      <div className="border-t border-slate-200 px-4 pb-4 pt-4">{children}</div>
    </details>
  );
}
