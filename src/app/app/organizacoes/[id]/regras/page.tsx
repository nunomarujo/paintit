import { notFound } from 'next/navigation';
import { PRODUCT_TYPE_LABELS, productLabel } from '@/domain/catalog';
import { limiteAplicavel, limiteEmPalavras } from '@/domain/limitesDeDesconto';
import { canManage, myRole } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';
import { apagarLimite } from './actions';
import { NovoLimite, type Alvo } from './Formulario';

/**
 * Regras comerciais — até quanto cada vendedor pode descontar (01/11/2026).
 *
 * Isto não existia. Um vendedor não podia descontar de todo: a base recusava qualquer desconto que não
 * viesse do dono ou de um gestor, e não havia onde escrever um limite. O menu apontava para este
 * endereço, que nunca tinha sido criado.
 *
 * Três níveis, que coexistem: o da empresa vale para todos; o de um vendedor substitui-o para essa
 * pessoa, para cima ou para baixo; e o de uma categoria ou produto é um teto que se aplica sempre por
 * cima dos outros dois. Sem regra nenhuma, ninguém desconta — que é o comportamento de hoje.
 */
export default async function RegrasComerciaisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();

  const { data: org } = await supabase.from('organizations').select('id, nome, kind, gerida_por').eq('id', id).maybeSingle();
  if (!org || org.kind !== 'fornecedor') notFound();
  if (!canManage(await myRole(supabase, user!.id, org))) notFound();

  const [{ data: limites }, { data: membros }, { data: produtos }] = await Promise.all([
    supabase
      .from('supplier_discount_limits')
      .select('id, vendedor_user_id, tipo, product_id, limite_bps')
      .eq('org_id', id)
      .order('created_at'),
    supabase.from('org_members').select('user_id, role').eq('org_id', id).eq('role', 'vendedor'),
    supabase.from('products').select('id, marca, nome, referencia, tipo').eq('org_id', id).order('marca').order('nome'),
  ]);

  const ids = (membros ?? []).map((m) => m.user_id);
  const { data: perfis } = ids.length
    ? await supabase.from('profiles').select('user_id, nome, email').in('user_id', ids)
    : { data: [] };
  const nomeDe = new Map((perfis ?? []).map((p) => [p.user_id, p.nome || p.email || 'Vendedor']));
  const produtoDe = new Map((produtos ?? []).map((p) => [p.id, productLabel(p)]));

  const regras = (limites ?? []).map((l) => ({
    vendedorUserId: l.vendedor_user_id,
    tipo: l.tipo,
    productId: l.product_id,
    limiteBps: l.limite_bps,
  }));

  const alvos: Alvo[] = [
    { valor: 'empresa', etiqueta: 'Todos os vendedores da empresa', grupo: 'A empresa' },
    ...(membros ?? []).map((m) => ({
      valor: `vendedor:${m.user_id}`,
      etiqueta: nomeDe.get(m.user_id) ?? 'Vendedor',
      grupo: 'Um vendedor',
    })),
    ...Object.entries(PRODUCT_TYPE_LABELS).map(([t, label]) => ({
      valor: `tipo:${t}`,
      etiqueta: label,
      grupo: 'Uma categoria',
    })),
    ...(produtos ?? []).map((p) => ({ valor: `produto:${p.id}`, etiqueta: productLabel(p), grupo: 'Um produto' })),
  ];

  const descreve = (l: { vendedor_user_id: string | null; tipo: string | null; product_id: string | null }) =>
    l.vendedor_user_id
      ? nomeDe.get(l.vendedor_user_id) ?? 'Um vendedor'
      : l.product_id
        ? produtoDe.get(l.product_id) ?? 'Um produto'
        : l.tipo
          ? PRODUCT_TYPE_LABELS[l.tipo as keyof typeof PRODUCT_TYPE_LABELS]
          : 'Todos os vendedores da empresa';

  const nivel = (l: { vendedor_user_id: string | null; tipo: string | null; product_id: string | null }) =>
    l.vendedor_user_id
      ? 'substitui o limite da empresa para esta pessoa'
      : l.tipo || l.product_id
        ? 'teto que se aplica por cima de qualquer autorização'
        : 'vale para todos os vendedores';

  const geral = regras.find((r) => !r.vendedorUserId && !r.tipo && !r.productId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold">Regras comerciais</h1>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Até quanto cada vendedor pode descontar sem pedir autorização. O desconto que criarem vale de
          imediato, e fica aqui o registo de quem o criou.
        </p>
      </div>

      {/* Uma só banda com fundo de cor, no topo (regra 13). Âmbar: resolve-se. */}
      {!geral && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5">
          <p className="text-[17px] font-semibold text-amber-900">Nenhum vendedor pode descontar</p>
          <p className="mt-1 max-w-[54ch] text-[17px] text-amber-900">
            Sem um limite para a empresa, os vendedores não criam descontos nenhuns. Continua a ser o
            responsável a dar as condições, uma a uma.
          </p>
        </section>
      )}

      <section aria-labelledby="limites">
        <h2 id="limites" className="text-[20px] font-semibold text-slate-900">
          Limites definidos
        </h2>
        {(limites ?? []).length === 0 ? (
          <p className="mt-2 max-w-[54ch] text-[17px] text-slate-600">Ainda sem limites.</p>
        ) : (
          <ul className="mt-2">
            {(limites ?? []).map((l) => (
              <li
                key={l.id}
                className="flex min-h-[44px] flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-2 py-3 first:border-t-0"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-slate-900">{descreve(l)}</span>
                  <span className="block text-[15px] text-slate-600">{nivel(l)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-[17px] font-medium text-slate-900">{limiteEmPalavras(l.limite_bps)}</span>
                  <form action={apagarLimite.bind(null, id, l.id)}>
                    <button type="submit" className="btn-quiet btn-sm">
                      Remover
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(membros ?? []).length > 0 && (
        <section aria-labelledby="quem" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 id="quem" className="text-[20px] font-semibold text-slate-900">
            O que cada vendedor pode dar hoje
          </h2>
          <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
            Para todo o catálogo. Num artigo com teto próprio, o valor pode ser menor.
          </p>
          <ul className="mt-3">
            {(membros ?? []).map((m) => (
              <li
                key={m.user_id}
                className="flex min-h-[44px] items-center justify-between gap-3 border-t border-slate-200 py-2 first:border-t-0"
              >
                <span className="text-[17px] text-slate-900">{nomeDe.get(m.user_id) ?? 'Vendedor'}</span>
                <span className="text-[17px] font-medium text-slate-900">
                  {limiteEmPalavras(limiteAplicavel(regras, m.user_id, { tipo: null, productId: null }))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="novo" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 id="novo" className="text-[20px] font-semibold text-slate-900">
          Definir um limite
        </h2>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Um limite de vendedor substitui o da empresa para essa pessoa. Um limite de categoria ou de
          produto aplica-se sempre por cima, para proteger as margens mais apertadas.
        </p>
        <div className="mt-4">
          <NovoLimite orgId={id} alvos={alvos} />
        </div>
      </section>
    </div>
  );
}
