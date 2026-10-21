import Link from 'next/link';

export type StepId = 'trabalhos' | 'precos' | 'condicoes' | 'rever';
export const STEP_IDS: StepId[] = ['trabalhos', 'precos', 'condicoes', 'rever'];
const LABELS: Record<StepId, string> = { trabalhos: 'Trabalhos', precos: 'Preços', condicoes: 'Condições', rever: 'Rever' };

/** Separadores do orçamento. Verde: passo preenchido; escuro: passo atual. */
export function BudgetSteps({ basePath, current, done }: { basePath: string; current: StepId; done: Record<StepId, boolean> }) {
  return (
    <nav aria-label="Passos do orçamento" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STEP_IDS.map((id, i) => {
        const active = id === current;
        return (
          <Link
            key={id}
            href={`${basePath}?passo=${id}`}
            aria-current={active ? 'step' : undefined}
            className={`rounded-xl px-4 py-3 text-center font-semibold ${
              active ? 'bg-tinta-600 text-white' : done[id] ? 'bg-tinta-50 text-tinta-700 ring-1 ring-tinta-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {i + 1}. {LABELS[id]}
            {done[id] && !active ? ' ✓' : ''}
          </Link>
        );
      })}
    </nav>
  );
}
