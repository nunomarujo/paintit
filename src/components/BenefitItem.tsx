import type { Beneficio } from '@/domain/painterPlan';

/**
 * Um benefício de plano, com o detalhe opcional atrás de "+ saber mais".
 *
 * Sem JavaScript: `<details>` com o rótulo trocado em CSS conforme o estado aberto. Cada item tem o
 * seu próprio estado e abrir um não fecha os outros — é o comportamento natural do elemento, e não
 * precisa de componente de cliente. O rótulo em CSS resolve o defeito encontrado a 24/10/2026, em
 * que o texto do botão não acompanhava o estado por estar escrito uma vez só.
 */
export function BenefitItem({ b }: { b: Beneficio }) {
  // Dentro do grupo "A chegar em breve" a etiqueta por item era a mesma informação duas vezes, e
  // partia para a linha seguinte nos títulos longos. O cabeçalho do grupo já o diz (25/10/2026).
  return (
    <li className={b.destaque ? 'rounded-xl border border-tinta-200 bg-tinta-50/60 p-3' : undefined}>
      <span className="font-semibold text-slate-900">{b.titulo}</span>
      <span className="block text-[12.5px] leading-snug text-slate-600">{b.detalhe}</span>
      {b.maisInfo && (
        <details className="group mt-1">
          <summary className="inline-flex cursor-pointer list-none text-[12px] font-semibold text-tinta-700 underline underline-offset-4 marker:hidden [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">{b.rotuloMaisInfo ?? '+ saber mais'}</span>
            <span className="hidden group-open:inline">Mostrar menos</span>
          </summary>
          <p className="mt-1 text-[12px] leading-snug text-slate-600">{b.maisInfo}</p>
        </details>
      )}
    </li>
  );
}
