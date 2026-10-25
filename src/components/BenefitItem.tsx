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
  // A etiqueta por item volta a existir, apesar de o cabeçalho do grupo já o dizer: numa página de
  // vendas, uma promessa por cumprir tem de estar marcada onde é lida, não três linhas acima. O
  // título e a etiqueta vão numa caixa que quebra, para não partir mal nos títulos longos.
  return (
    <li className={b.destaque ? 'rounded-xl border border-marca-border bg-marca-cream p-3' : undefined}>
      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-semibold text-marca-ink">{b.titulo}</span>
        {b.aChegar && (
          <span className="rounded-full bg-marca-tag px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-marca-ink-soft">
            Por lançar
          </span>
        )}
      </span>
      <span className="block text-[12.5px] leading-snug text-marca-muted">{b.detalhe}</span>
      {b.maisInfo && (
        <details className="group mt-1">
          <summary className="inline-flex cursor-pointer list-none text-[12px] font-semibold text-marca-orange-deep underline underline-offset-4 marker:hidden hover:text-marca-orange [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">{b.rotuloMaisInfo ?? '+ saber mais'}</span>
            <span className="hidden group-open:inline">Mostrar menos</span>
          </summary>
          <p className="mt-1 rounded-lg bg-marca-cream px-3 py-2 text-[12px] leading-snug text-marca-muted">{b.maisInfo}</p>
        </details>
      )}
    </li>
  );
}
