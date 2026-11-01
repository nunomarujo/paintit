import type { ReactNode } from 'react';

/**
 * O (i) que guarda uma explicação longa fora do caminho: abre ao carregar (e, em computador, ao
 * passar o rato), com o texto num balão. Serve para não gastar altura do ecrã com frases que só
 * interessam a quem as quer ler (promotor, 01/11/2026). `<details>` nativo: funciona sem script.
 */
export function Dica({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <details className="group relative inline-block align-middle">
      <summary
        aria-label={rotulo}
        className="inline-flex h-5 w-5 cursor-pointer list-none items-center justify-center rounded-full border border-slate-400 text-[13px] font-semibold text-slate-600 hover:border-tinta-600 hover:text-tinta-700 group-open:border-tinta-600 group-open:text-tinta-700 [&::-webkit-details-marker]:hidden"
      >
        i
      </summary>
      <span className="absolute left-0 top-7 z-20 block w-[min(32rem,80vw)] rounded-lg border border-slate-200 bg-white p-3 text-left text-[15px] font-normal leading-snug text-slate-700 shadow-lg">
        {children}
      </span>
    </details>
  );
}
