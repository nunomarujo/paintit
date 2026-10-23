import { DISTRITOS } from '@/lib/concelhos';

/** Seleção de concelhos por distrito, em grupos que se abrem com um "+" (decisão de 23/10/2026,
 * docs/DECISOES.md) — substitui o campo de texto livre "separados por vírgulas". Cada concelho
 * marcado é um valor próprio sob o mesmo `name`; o servidor lê-os com `form.getAll(name)`, nunca
 * com `.split(',')`. Sem JavaScript nenhum: `<details>` nativo trata de abrir/fechar. */
export function ConcelhosPicker({ name, defaultValue = [] }: { name: string; defaultValue?: string[] }) {
  const selected = new Set(defaultValue);
  return (
    <div className="mt-1 max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-300">
      {DISTRITOS.map((d) => {
        const n = d.concelhos.filter((c) => selected.has(c)).length;
        return (
          <details key={d.distrito} className="group" open={n > 0}>
            <summary className="flex cursor-pointer select-none items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
              <span>
                {d.distrito}
                {n > 0 && <span className="ml-1.5 font-normal text-tinta-700">({n})</span>}
              </span>
              <span aria-hidden className="text-slate-400 group-open:hidden">
                +
              </span>
              <span aria-hidden className="hidden text-slate-400 group-open:inline">
                −
              </span>
            </summary>
            <div className="grid gap-x-3 gap-y-1 px-3 pb-3 sm:grid-cols-2">
              {d.concelhos.map((c) => (
                <label key={c} className="flex items-center gap-1.5 py-0.5 text-sm text-slate-700">
                  <input type="checkbox" name={name} value={c} defaultChecked={selected.has(c)} className="rounded border-slate-300 text-tinta-600" />
                  {c}
                </label>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
