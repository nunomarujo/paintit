import { deleteDiscount } from '@/app/app/catalogo/actions';
import { ProdutosEPrecos } from '@/components/vendas/ProdutosEPrecos';
import { BUYER_PROFILE_LABELS, PAYMENT_TERMS_LABELS, PRODUCT_TYPE_LABELS, productLabel } from '@/domain/catalog';
import { formatArea } from '@/domain/request';
import { supplierCustomers } from '@/lib/queries';
import { contextoDoCatalogo } from '../dados';
import { DiscountForm } from '../SupplierRules';

/** Produtos e preços — separador «Preços e descontos». */
export default async function PrecosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, manager, catalogo } = await contextoDoCatalogo(id);

  const [{ data: products }, { data: discounts }, clientes] = await Promise.all([
    supabase.from('products').select('*').eq('org_id', id).order('marca').order('nome'),
    supabase.from('supplier_discounts').select('*').eq('org_id', id).order('created_at'),
    supplierCustomers(supabase, id),
  ]);

  const nomeDoProduto = (pid: string | null) => {
    const p = (products ?? []).find((x) => x.id === pid);
    return p ? productLabel(p) : '';
  };
  const nomeDoCliente = (pid: string | null) => clientes.find((c) => c.id === pid)?.nome ?? null;

  const hoje = new Date().toISOString().slice(0, 10);
  const descontoDe = (p: { id: string; tipo: string }) => {
    const bate = (discounts ?? []).filter(
      (d) =>
        !d.painter_org_id &&
        (!d.valido_ate || d.valido_ate >= hoje) &&
        (d.product_id === p.id || d.tipo === p.tipo || (!d.product_id && !d.tipo)),
    );
    return bate.length ? Math.max(...bate.map((d) => d.desconto_bps)) : null;
  };

  return (
    <ProdutosEPrecos
      base={`/app/organizacoes/${id}/produtos`}
      aba="precos"
      produtos={[]}
      podeGerir={manager && catalogo}
      semCatalogo={!catalogo}
      precos={
        <div className="space-y-6">
          <section aria-labelledby="descontos">
            <h2 id="descontos" className="text-[20px] font-semibold text-slate-900">
              Descontos para pintores
            </h2>
            {(discounts ?? []).length === 0 ? (
              <p className="mt-2 max-w-[54ch] text-[17px] text-slate-600">
                Ainda sem descontos.{' '}
                {catalogo
                  ? 'Um desconto criado aqui aparece ao pintor no catálogo, já aplicado ao preço.'
                  : 'Disponível no plano de catálogo.'}
              </p>
            ) : (
              <ul className="mt-2">
                {(discounts ?? []).map((d) => (
                  <li
                    key={d.id}
                    className="flex min-h-[44px] flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-2 py-3 text-[17px] first:border-t-0"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-slate-900">
                        {(d.desconto_bps / 100).toLocaleString('pt-PT')}% ·{' '}
                        {d.product_id ? nomeDoProduto(d.product_id) : d.tipo ? PRODUCT_TYPE_LABELS[d.tipo] : 'todo o catálogo'}
                      </span>
                      <span className="block text-[15px] text-slate-600">
                        {[
                          d.min_area_cm2 !== null ? `a partir de ${formatArea(d.min_area_cm2)}` : null,
                          d.max_area_cm2 !== null ? `até ${formatArea(d.max_area_cm2)}` : null,
                          d.valido_ate ? `até ${d.valido_ate.split('-').reverse().join('/')}` : null,
                          d.perfil ? BUYER_PROFILE_LABELS[d.perfil] : null,
                          d.pagamento ? PAYMENT_TERMS_LABELS[d.pagamento] : null,
                          d.min_quantidade ? `a partir de ${d.min_quantidade} embalagens` : null,
                          d.painter_org_id ? `só para ${nomeDoCliente(d.painter_org_id) ?? 'um cliente'}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'sem condições'}
                      </span>
                    </span>
                    {manager && (
                      <form action={deleteDiscount.bind(null, id, d.id)}>
                        <button type="submit" className="btn-quiet btn-sm text-red-700">
                          Remover
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {manager && catalogo && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-[20px] font-semibold text-slate-900">Criar um desconto</h2>
              <div className="mt-4">
                <DiscountForm
                  orgId={id}
                  products={(products ?? [])
                    .filter((p) => p.ativo)
                    .map((p) => ({ id: p.id, label: productLabel(p), currentBps: descontoDe(p) }))}
                  clientes={clientes.map((c) => ({ id: c.id, nome: c.nome }))}
                />
              </div>
            </section>
          )}
        </div>
      }
    />
  );
}
