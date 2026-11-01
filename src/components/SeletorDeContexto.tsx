'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { contextoDoCaminho, inicioDoContexto } from '@/domain/workspaceFornecedor';

/**
 * Vendas | Avaliações — os dois contextos do workspace do fornecedor (01/11/2026).
 *
 * Fica no topo da navegação, acima dos destinos, porque é o que decide o que a lista por baixo mostra: um
 * seletor escondido no meio dos destinos seria mais um destino. O ativo não se marca só pela cor — leva
 * também `aria-current`, e o contraste do texto muda, para quem não distingue os dois verdes.
 *
 * São contextos, não entidades: a mesma pessoa, na mesma empresa, a fazer duas coisas diferentes. Vendas é
 * o lado da empresa; Avaliações é o trabalho pessoal de quem está a ver, e o responsável não vê o dos
 * outros (ver `src/domain/workspaceFornecedor.ts`).
 */
export function SeletorDeContexto() {
  const contexto = contextoDoCaminho(usePathname());
  return (
    <div role="group" aria-label="Contexto de trabalho" className="mb-4 flex gap-0.5 rounded-xl border border-marca-border bg-marca-tag p-0.5">
      {(['vendas', 'avaliacoes'] as const).map((c) => {
        const ativo = c === contexto;
        return (
          <Link
            key={c}
            href={inicioDoContexto(c)}
            aria-current={ativo ? 'page' : undefined}
            className={`flex min-h-[40px] flex-1 items-center justify-center rounded-[10px] px-3 text-[15px] ${
              ativo ? 'bg-tinta-600 font-semibold text-white' : 'font-medium text-slate-700 hover:bg-white/60'
            }`}
          >
            {c === 'vendas' ? 'Vendas' : 'Avaliações'}
          </Link>
        );
      })}
    </div>
  );
}
