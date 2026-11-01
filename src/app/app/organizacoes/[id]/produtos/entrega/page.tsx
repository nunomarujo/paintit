import { deleteDelivery } from '@/app/app/catalogo/actions';
import { ProdutosEPrecos } from '@/components/vendas/ProdutosEPrecos';
import { formatEuros } from '@/domain/money';
import { contextoDoCatalogo } from '../dados';
import { DeliveryForm } from '../SupplierRules';

/** Produtos e preços — separador «Entrega em obra». */
export default async function EntregaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, manager, catalogo } = await contextoDoCatalogo(id);

  const { data: deliveries } = await supabase
    .from('supplier_delivery')
    .select('*')
    .eq('org_id', id)
    .order('created_at');

  return (
    <ProdutosEPrecos
      base={`/app/organizacoes/${id}/produtos`}
      aba="entrega"
      produtos={[]}
      podeGerir={manager && catalogo}
      semCatalogo={!catalogo}
      entrega={
        <div className="space-y-6">
          <section aria-labelledby="condicoes">
            <h2 id="condicoes" className="text-[20px] font-semibold text-slate-900">
              Condições de entrega
            </h2>
            {(deliveries ?? []).length === 0 ? (
              <p className="mt-2 max-w-[54ch] text-[17px] text-slate-600">
                Sem condições de entrega: os pintores veem «levantamento na loja».
              </p>
            ) : (
              <ul className="mt-2">
                {(deliveries ?? []).map((d) => (
                  <li
                    key={d.id}
                    className="flex min-h-[44px] flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-2 py-3 text-[17px] first:border-t-0"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-slate-900">
                        {d.concelhos.length ? d.concelhos.join(', ') : 'Todo o país'}
                      </span>
                      <span className="block text-[15px] text-slate-600">
                        {[
                          d.incluida ? 'entrega incluída' : `entrega paga${d.custo_cents !== null ? ` (${formatEuros(d.custo_cents)})` : ''}`,
                          d.minimo_cents !== null ? `encomenda mínima ${formatEuros(d.minimo_cents)}` : null,
                          d.condicoes || null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    {manager && (
                      <form action={deleteDelivery.bind(null, id, d.id)}>
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
              <h2 className="text-[20px] font-semibold text-slate-900">Acrescentar condições</h2>
              <div className="mt-4">
                <DeliveryForm orgId={id} />
              </div>
            </section>
          )}
        </div>
      }
    />
  );
}
