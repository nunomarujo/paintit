'use client';

import { PendingBar } from '@/components/PendingBar';
import type { BudgetPending } from '@/domain/works';
import { useBudget } from './BudgetContext';

/** Âncora que o editor de trabalhos escuta para abrir o trabalho certo. */
export const workHash = (key: string) => `#trabalho-${key}`;

/** A barra de pendências do orçamento: sabe mudar de passo e abrir o trabalho em falta. */
export function BudgetPendingBar({ pendings }: { pendings: BudgetPending[] }) {
  const { go } = useBudget();
  return (
    <PendingBar
      pendings={pendings}
      onIr={async (p) => {
        await go(p.passo);
        if (p.key) {
          window.location.hash = workHash(p.key);
          requestAnimationFrame(() => document.getElementById('orcamento')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }
      }}
    />
  );
}
