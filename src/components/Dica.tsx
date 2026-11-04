import type { ReactNode } from 'react';

/**
 * O (i) que guarda uma explicação longa fora do caminho: abre ao carregar (e, em computador, ao
 * passar o rato), com o texto num balão. Serve para não gastar altura do ecrã com frases que só
 * interessam a quem as quer ler (promotor, 01/11/2026). `<details>` nativo: funciona sem script.
 *
 * O círculo que se vê tem 20 px, mas o que se toca tem 44 × 44 (regra 17): o `summary` é o quadrado de
 * 44 px, com margens negativas de 12 px para continuar a ocupar 20 px na linha — e o texto à volta não
 * se mexe. Até 04/11/2026 o alvo era o próprio círculo, 20 × 20 px, num ecrã que se usa em obra.
 */
export function Dica({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <details className="group relative inline-block align-middle">
      <summary
        aria-label={rotulo}
        className="-m-3 inline-flex h-11 w-11 cursor-pointer list-none items-center justify-center [&::-webkit-details-marker]:hidden"
      >
        <span
          aria-hidden="true"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-400 text-[13px] font-semibold text-slate-600 group-hover:border-tinta-600 group-hover:text-tinta-700 group-open:border-tinta-600 group-open:text-tinta-700"
        >
          i
        </span>
      </summary>
      <span className="absolute left-0 top-7 z-20 block w-[min(32rem,80vw)] rounded-lg border border-slate-200 bg-white p-3 text-left text-[15px] font-normal leading-snug text-slate-700 shadow-lg">
        {children}
      </span>
    </details>
  );
}
