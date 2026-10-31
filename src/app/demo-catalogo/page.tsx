import { ProductCard } from '@/components/ProductCard';
import { BUYER_PROFILE_LABELS, PAYMENT_TERMS_LABELS, PRODUCT_TYPE_LABELS, productLabel } from '@/domain/catalog';
import { formatArea } from '@/domain/request';
import { DISCOUNTS, PRODUCTS } from './fixtures';

// Rota de demonstração para a captura do popup "Para quem → fornecedores de tintas" (ver
// layout.tsx). Reproduz as duas secções reais do fornecedor que o promotor pediu — o catálogo
// (ProductCard, com fichas técnicas) e "Descontos para pintores" (condições comerciais) — com a
// mesma lista usada em src/app/app/organizacoes/[id]/produtos/page.tsx, sem o formulário de criar
// um desconto novo (não há nada para submeter nesta rota) e sem qualquer leitura da base real:
// produtos e descontos vêm todos de fixtures.ts.
// Repetido por rota (já vem do layout.tsx): se esta página sair um dia de debaixo desse layout,
// o build falha em vez de a rota passar a dinâmica sem ninguém notar.
export const dynamic = 'force-static';

export default function Page() {
  const productName = (id: string | null) => {
    const p = PRODUCTS.find((x) => x.id === id);
    return p ? productLabel(p) : '';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl space-y-8 p-6">
        <div>
          <h1 className="text-[20px] font-semibold">Catálogo e condições comerciais</h1>
          <p className="text-[15px] text-slate-600">Fornecedor fictício, só para demonstração.</p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-[17px]">
          <h2 className="font-semibold">Descontos para pintores</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {DISCOUNTS.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span>
                  <strong>{(d.desconto_bps / 100).toLocaleString('pt-PT')}%</strong> ·{' '}
                  {d.product_id ? productName(d.product_id) : d.tipo ? PRODUCT_TYPE_LABELS[d.tipo] : 'todo o catálogo'}
                  {d.min_area_cm2 !== null ? ` · a partir de ${formatArea(d.min_area_cm2)}` : ''}
                  {d.max_area_cm2 !== null ? ` · até ${formatArea(d.max_area_cm2)}` : ''}
                  {d.valido_ate ? ` · até ${d.valido_ate.split('-').reverse().join('/')}` : ''}
                  {d.perfil ? ` · ${BUYER_PROFILE_LABELS[d.perfil]}` : ''}
                  {d.pagamento ? ` · ${PAYMENT_TERMS_LABELS[d.pagamento]}` : ''}
                  {d.min_quantidade ? ` · a partir de ${d.min_quantidade} embalagens` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-[20px] font-semibold">Catálogo de produtos</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {PRODUCTS.map((p) => (
              <li key={p.id}>
                <ProductCard p={p} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
