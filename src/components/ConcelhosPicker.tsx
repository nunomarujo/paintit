import { DISTRITOS } from '@/lib/concelhos';

/** Seleção de concelhos por distrito, em grupos que se abrem ao clicar no nome do distrito (decisão de
 * 23/10/2026, docs/DECISOES.md) — substitui o campo de texto livre "separados por vírgulas". Cada
 * concelho marcado é um valor próprio sob o mesmo `name`; o servidor lê-os com `form.getAll(name)`,
 * nunca com `.split(',')`. Sem JavaScript nenhum: `<details>` nativo trata de abrir/fechar. Um distrito
 * com pelo menos um concelho marcado fica com o fundo ligeiramente destacado mesmo fechado (pedido do
 * promotor, 23/10/2026) — o "(n)" ao lado do nome já dizia quantos, mas não dava para ver de relance,
 * numa lista comprida, que distritos tinham alguma marca.
 * O ícone era um "+"/"−" (auditoria de UX, 23/10/2026: lido como "adicionar o distrito inteiro", quando só
 * abre a lista de concelhos para escolher um a um) — trocado por um "chevron" (▸/▾) sem esse significado
 * de adição, e acrescentada uma legenda fixa a dizer o que o clique faz. */
export function ConcelhosPicker({ name, defaultValue = [] }: { name: string; defaultValue?: string[] }) {
  const selected = new Set(defaultValue);
  return (
    <div className="mt-1">
      <p className="mb-1 text-xs text-slate-500">Abra um distrito para escolher os concelhos um a um.</p>
      <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-300">
        {DISTRITOS.map((d) => {
          const n = d.concelhos.filter((c) => selected.has(c)).length;
          return (
            <details key={d.distrito} className="group" open={n > 0}>
              <summary
                className={`flex cursor-pointer select-none items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 [&::-webkit-details-marker]:hidden ${
                  n > 0 ? 'bg-tinta-50 hover:bg-tinta-100' : 'hover:bg-slate-50'
                }`}
              >
                <span>
                  {d.distrito}
                  {n > 0 && <span className="ml-1.5 font-normal text-tinta-700">({n})</span>}
                </span>
                <span aria-hidden className="text-slate-400 group-open:hidden">
                  ▸
                </span>
                <span aria-hidden className="hidden text-slate-400 group-open:inline">
                  ▾
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
    </div>
  );
}
