import { deleteDiscount } from '@/app/app/catalogo/actions';
import { ProdutosEPrecos } from '@/components/vendas/ProdutosEPrecos';
import { BUYER_PROFILE_LABELS, PAYMENT_TERMS_LABELS, PRODUCT_TYPE_LABELS, productLabel } from '@/domain/catalog';
import { formatArea } from '@/domain/request';
import { supplierCustomers } from '@/lib/queries';
import { limiteAplicavel, limiteEmPalavras } from '@/domain/limitesDeDesconto';
import { contextoDoCatalogo } from '../dados';
import { DiscountForm } from '../SupplierRules';

/** Produtos e preços — separador «Preços e descontos». */
export default async function PrecosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, manager, catalogo } = await contextoDoCatalogo(id);

  const [{ data: products }, { data: discounts }, clientes, { data: papel }, { data: tetos }] = await Promise.all([
    supabase.from('products').select('*').eq('org_id', id).order('marca').order('nome'),
    supabase.from('supplier_discounts').select('*').eq('org_id', id).order('created_at'),
    supplierCustomers(supabase, id),
    supabase.from('org_members').select('role').eq('org_id', id).eq('user_id', user!.id).maybeSingle(),
    supabase.from('supplier_discount_limits').select('vendedor_user_id, tipo, product_id, limite_bps').eq('org_id', id),
  ]);

  // Um vendedor desconta até ao limite que o responsável definiu em «Regras comerciais» (01/11/2026).
  // O teto diz-se aqui, antes de alguém tentar: um formulário que só recusa no fim faz perder tempo e
  // não ensina nada.
  const souVendedor = papel?.role === 'vendedor';
  const regras = (tetos ?? []).map((l) => ({
    vendedorUserId: l.vendedor_user_id,
    tipo: l.tipo,
    productId: l.product_id,
    limiteBps: l.limite_bps,
  }));
  const meuTeto = souVendedor ? limiteAplicavel(regras, user!.id, { tipo: null, productId: null }) : null;
  const posso = manager || (souVendedor && (meuTeto ?? 0) > 0);

  const nomeDoProduto = (pid: string | null) => {
    const p = (products ?? []).find((x) => x.id === pid);
    return p ? productLabel(p) : '';
  };
  const nomeDoCliente = (pid: string | null) => clientes.find((c) => c.id === pid)?.nome ?? null;

  // Quem criou cada desconto: o responsável tem de ver o que os vendedores andaram a dar, e o vendedor
  // tem de distinguir os seus dos da casa.
  const autores = [...new Set((discounts ?? []).map((d) => d.created_by))];
  const { data: perfis } = autores.length
    ? await supabase.from('profiles').select('user_id, nome, email').in('user_id', autores)
    : { data: [] };
  const nomeDeQuemCriou = new Map((perfis ?? []).map((p) => [p.user_id, p.nome || p.email || 'um colega']));

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
      podeGerir={posso && catalogo}
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
                          d.created_by !== user!.id ? `criado por ${nomeDeQuemCriou.get(d.created_by) ?? 'um colega'}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'sem condições'}
                      </span>
                    </span>
                    {(manager || d.created_by === user!.id) && (
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

          {souVendedor && catalogo && (meuTeto ?? 0) <= 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-[20px] font-semibold text-slate-900">Sem autorização para descontar</h2>
              <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
                O responsável da empresa define os limites em «Regras comerciais». Enquanto não houver
                limite, as condições são dadas por ele.
              </p>
            </section>
          )}

          {posso && catalogo && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-[20px] font-semibold text-slate-900">Criar um desconto</h2>
              {meuTeto !== null && (
                <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
                  {limiteEmPalavras(meuTeto)} para todo o catálogo. Num artigo com teto próprio pode ser
                  menos, e o ecrã avisa.
                </p>
              )}
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
