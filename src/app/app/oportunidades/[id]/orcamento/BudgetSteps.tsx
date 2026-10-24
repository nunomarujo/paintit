'use client';

import { STEP_IDS, STEP_LABELS, type StepId } from './steps';

/** Separadores do orçamento. Verde: passo preenchido; escuro: passo atual. */
export function BudgetSteps({ current, done, onSelect }: { current: StepId; done: Record<StepId, boolean>; onSelect: (id: StepId) => void }) {
  return (
    <nav aria-label="Passos do orçamento" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {STEP_IDS.map((id, i) => {
        const active = id === current;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={active ? 'step' : undefined}
            className={`rounded-xl px-4 py-3 text-center font-semibold ${
              active ? 'bg-tinta-600 text-white' : done[id] ? 'bg-tinta-50 text-tinta-700 ring-1 ring-tinta-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {i + 1}. {STEP_LABELS[id]}
            {done[id] && !active ? ' ✓' : ''}
          </button>
        );
      })}
    </nav>
  );
}
