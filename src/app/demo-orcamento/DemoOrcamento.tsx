'use client';

// Casca cliente mínima só para montar o WorksEditor real fora do BudgetShell (que pede uma
// proposta e um pedido verdadeiros). `register`/`go` nunca são chamados nesta rota — não há
// separadores a trocar nem "Guardar" a submeter — por isso ficam como no-op: o WorksEditor só
// precisa do contexto para existir, não de o usar.
import { useMemo } from 'react';
import { BudgetContext } from '@/app/app/oportunidades/[id]/orcamento/BudgetContext';
import { BudgetSteps } from '@/app/app/oportunidades/[id]/orcamento/BudgetSteps';
import { WorksEditor } from '@/app/app/oportunidades/[id]/orcamento/WorksEditor';
import type { CatalogueProduct, WorkItem, Zone } from '@/domain/works';

export function DemoOrcamento({ zones, items, catalogue }: { zones: Zone[]; items: WorkItem[]; catalogue: CatalogueProduct[] }) {
  const api = useMemo(() => ({ register: () => () => {}, go: async () => {} }), []);
  return (
    <BudgetContext.Provider value={api}>
      <BudgetSteps current="trabalhos" done={{ trabalhos: false, precos: false, condicoes: false, rever: false }} onSelect={() => {}} />
      <div className="mt-4">
        <WorksEditor proposalId="demo" requestId="demo" zones={zones} initial={items} catalogue={catalogue} tipoObra="fachadas" />
      </div>
    </BudgetContext.Provider>
  );
}
