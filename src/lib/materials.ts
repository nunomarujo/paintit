import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  APPLICATION_LABELS,
  bestDiscount,
  conditionalOffers,
  deliveryFor,
  discounted,
  productLabel,
  type ApplicationMethod,
  type DiscountRule,
  type ProductType,
} from '@/domain/catalog';
import { formatEuros } from '@/domain/money';
import type { Database } from '@/lib/database.types';

export interface MaterialOption {
  id: string;
  label: string;
  tipo: ProductType;
  fornecedor: { id: string; nome: string; email: string | null; telefone: string | null; avaliacao: string | null };
  caracteristicas: string[];
  temFicha: boolean;
  precoMercado: string | null;
  precoFornecedor: string | null;
  descontoPct: number | null;
  /** Descontos maiores, sujeitos a condições (ex.: "−25% com pronto pagamento"). */
  ofertas: string[];
  precoComDesconto: string | null;
  entrega: string;
}

/**
 * Produtos ativos do catálogo, com o desconto que cada fornecedor dá para a área
 * desta obra e as condições de entrega no concelho dela. Ordenados pelo maior
 * desconto, como sugestões; a qualidade não se deduz do preço (CMP-04).
 */
export async function materialOptions(
  supabase: SupabaseClient<Database>,
  obra: { area: number; concelho: string; today: string; painterOrgId?: string | null },
): Promise<MaterialOption[]> {
  const [{ data: products }, { data: active }, { data: discounts }, { data: deliveries }, { data: suppliers }, { data: reviews }] = await Promise.all([
    supabase.from('products').select('*').eq('ativo', true).limit(500),
    supabase.rpc('active_suppliers', { p_plan: 'catalogo' }),
    supabase.from('supplier_discounts').select('*'),
    supabase.from('supplier_delivery').select('*'),
    supabase.from('organizations').select('id, nome, email_contacto, telefone').eq('kind', 'fornecedor'),
    supabase.from('supplier_reviews').select('supplier_org_id, produto, entrega, atendimento'),
  ]);
  const { data: orders } = obra.painterOrgId
    ? await supabase.from('material_orders').select('supplier_org_id').eq('painter_org_id', obra.painterOrgId).eq('estado', 'entregue')
    : { data: [] };
  const delivered = (supplier: string) => (orders ?? []).filter((o) => o.supplier_org_id === supplier).length;
  const withPlan = new Set(active ?? []);
  const options = (products ?? []).filter((p) => withPlan.has(p.org_id)).map((p): [number, MaterialOption] => {
    const rules: DiscountRule[] = (discounts ?? [])
      .filter((d) => d.org_id === p.org_id)
      .map((d) => ({
        id: d.id,
        productId: d.product_id,
        tipo: d.tipo,
        minArea: d.min_area_cm2,
        maxArea: d.max_area_cm2,
        bps: d.desconto_bps,
        validUntil: d.valido_ate,
        painterOrgId: d.painter_org_id,
        pagamento: d.pagamento,
        minQuantidade: d.min_quantidade,
        perfil: d.perfil,
      }));
    const ctx = { painterOrgId: obra.painterOrgId ?? null, deliveredOrders: delivered(p.org_id) };
    const d = bestDiscount(p, obra.area, obra.today, rules, ctx);
    const ofertas = conditionalOffers(p, obra.area, obra.today, rules, ctx).map(
      (o) => `−${(o.bps / 100).toLocaleString('pt-PT')}% com ${o.condicoes.join(' e ')}`,
    );
    const preco = p.preco_fornecedor_cents;
    const final = preco !== null ? discounted(preco, d?.bps ?? 0) : null;
    const q = deliveryFor(
      (deliveries ?? [])
        .filter((x) => x.org_id === p.org_id)
        .map((x) => ({ concelhos: x.concelhos, incluida: x.incluida, custo: x.custo_cents, minimo: x.minimo_cents, condicoes: x.condicoes })),
      obra.concelho,
      final ?? 0,
    );
    const s = (suppliers ?? []).find((x) => x.id === p.org_id);
    const rs = (reviews ?? []).filter((r) => r.supplier_org_id === p.org_id);
    const avg = rs.length ? rs.reduce((n, r) => n + (r.produto + r.entrega + r.atendimento) / 3, 0) / rs.length : null;
    return [d?.bps ?? 0, {
      id: p.id,
      label: productLabel(p),
      tipo: p.tipo,
      fornecedor: {
        id: p.org_id,
        nome: s?.nome ?? 'Fornecedor',
        email: s?.email_contacto ?? null,
        telefone: s?.telefone ?? null,
        avaliacao: rs.length >= 3 && avg !== null ? `${avg.toFixed(1).replace('.', ',')}/5 (${rs.length} pintores)` : null,
      },
      caracteristicas: [
        p.rendimento ? `Rendimento ${(p.rendimento / 100).toLocaleString('pt-PT')} m²/${p.unidade} por demão` : null,
        p.embalagem_ml ? `Embalagem ${(p.embalagem_ml / 1000).toLocaleString('pt-PT')} ${p.unidade}` : null,
        p.modos_aplicacao.length ? `Aplicação: ${p.modos_aplicacao.map((m) => APPLICATION_LABELS[m as ApplicationMethod] ?? m).join(', ')}` : null,
        p.demaos_recomendadas ? `${p.demaos_recomendadas} demão(s) recomendada(s)` : null,
        p.secagem_horas !== null ? `Secagem ${p.secagem_horas} h` : null,
        p.diluicao ? `Diluição ${p.diluicao}` : null,
        [p.acabamento, p.uso, p.base ? `base ${p.base}` : null].filter(Boolean).join(' · ') || null,
      ].filter((x): x is string => Boolean(x)),
      temFicha: Boolean(p.ficha_path),
      precoMercado: p.preco_referencia_cents !== null ? `${formatEuros(p.preco_referencia_cents)} (${p.preco_data?.split('-').reverse().join('/')})` : null,
      precoFornecedor: preco !== null ? formatEuros(preco) : null,
      descontoPct: d ? d.bps / 100 : null,
      ofertas,
      precoComDesconto: final !== null ? formatEuros(final) : null,
      entrega:
        q.kind === 'incluida'
          ? `Entrega em obra incluída em ${obra.concelho}`
          : q.kind === 'paga'
            ? `Entrega paga${q.custo !== null ? ` (${formatEuros(q.custo)})` : ''}${q.condicoes ? `: ${q.condicoes}` : ''}`
            : `Sem entrega em ${obra.concelho}: levantamento no fornecedor`,
    }];
  });
  return options.sort((a, b) => b[0] - a[0]).map(([, o]) => o);
}

/** Desconto e preço fixados numa linha, recalculados no servidor (nunca confiar no navegador). */
export async function pricedProduct(
  supabase: SupabaseClient<Database>,
  productId: string,
  obra: { area: number; today: string; painterOrgId?: string | null },
) {
  const { data: p } = await supabase.from('products').select('*').eq('id', productId).eq('ativo', true).maybeSingle();
  if (!p) return null;
  const { data: discounts } = await supabase.from('supplier_discounts').select('*').eq('org_id', p.org_id);
  const { count: deliveredCount } = obra.painterOrgId
    ? await supabase
        .from('material_orders')
        .select('id', { count: 'exact', head: true })
        .eq('painter_org_id', obra.painterOrgId)
        .eq('supplier_org_id', p.org_id)
        .eq('estado', 'entregue')
    : { count: undefined };
  const d = bestDiscount(
    p,
    obra.area,
    obra.today,
    (discounts ?? []).map((x) => ({
      id: x.id,
      productId: x.product_id,
      tipo: x.tipo,
      minArea: x.min_area_cm2,
      maxArea: x.max_area_cm2,
      bps: x.desconto_bps,
      validUntil: x.valido_ate,
      painterOrgId: x.painter_org_id,
      pagamento: x.pagamento,
      minQuantidade: x.min_quantidade,
      perfil: x.perfil,
    })),
    { painterOrgId: obra.painterOrgId ?? null, deliveredOrders: deliveredCount ?? undefined },
  );
  return { label: productLabel(p), precoFornecedor: p.preco_fornecedor_cents, descontoBps: d?.bps ?? 0 };
}
