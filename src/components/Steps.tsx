/** Passos numerados, os já feitos a cheio (como no protótipo). */
export function Steps({ steps, done }: { steps: string[]; done: number }) {
  return (
    <ol className="my-6 grid grid-cols-2 gap-3 md:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s} className={`flex items-center gap-2 text-[12px] ${i < done ? 'text-tinta-600' : 'text-slate-500'}`}>
          <span
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] ${
              i < done ? 'border-tinta-600 bg-tinta-600 text-white' : i === done ? 'border-tinta-600 bg-sage' : 'border-slate-200 bg-white'
            }`}
          >
            {i < done ? '✓' : i + 1}
          </span>
          {s}
        </li>
      ))}
    </ol>
  );
}
