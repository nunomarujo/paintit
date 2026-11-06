import { notFound } from 'next/navigation';
import { formatEuros } from '@/domain/money';
import { localDate } from '@/domain/deadline';
import { PLAN_INFO, planAllows, planoVigente, withVat } from '@/domain/subscription';
import { CURRENT_RULES } from '@/domain/rules';
import { canManage, myRole } from '@/lib/access';
import { stripeConfigured } from '@/lib/stripe';
import { getUser } from '@/lib/supabase/server';
import { SubscribeButton } from '../produtos/SubscribeButton';

/**
 * Subscrição da empresa fornecedora.
 *
 * Vivia no topo de «Catálogo de produtos», e era a primeira coisa que se via ao ir ver um preço: dois
 * cartões de planos, benefícios e um aviso, antes de chegar a um único produto. Mas a subscrição é
 * assunto da empresa, não do catálogo — decide-se uma vez e volta-se lá poucas vezes. Passou para aqui,
 * em «Empresa» (01/11/2026).
 */
export default async function SubscricaoDoFornecedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();

  const { data: org } = await supabase.from('organizations').select('id, nome, kind, gerida_por').eq('id', id).maybeSingle();
  if (!org || org.kind !== 'fornecedor') notFound();
  const manager = canManage(await myRole(supabase, user!.id, org));

  const { data: sub } = await supabase.from('supplier_subscriptions').select('*').eq('org_id', id).maybeSingle();
  const hoje = localDate(new Date(), CURRENT_RULES.timeZone);
  const plan = planoVigente(sub, hoje);
  const emPt = (d: string) => d.split('-').reverse().join('/');
  const delancamento = sub?.origem === 'lancamento' && plan !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold">Subscrição</h1>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          O plano da empresa na plataforma. A plataforma não recebe nada pelas vendas: só esta mensalidade.
        </p>
      </div>

      {/* Uma só banda com fundo de cor por ecrã, e no topo (regra 13). Âmbar: resolve-se. */}
      {!plan && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5">
          <p className="text-[17px] font-semibold text-amber-900">Sem plano ativo</p>
          <p className="mt-1 max-w-[54ch] text-[17px] text-amber-900">
            A empresa não aparece aos pintores, e os produtos do catálogo não chegam a nenhum orçamento.
          </p>
        </section>
      )}

      {plan && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-[20px] font-semibold text-slate-900">Plano ativo</h2>
          {delancamento ? (
            <p className="mt-1 text-[17px] text-slate-700">
              {PLAN_INFO[plan].label} · de lançamento, sem custo até {emPt(sub!.valida_ate!)}. Não há cobrança nem renovação
              automática: depois dessa data a empresa deixa de aparecer aos pintores, a não ser que subscreva.
            </p>
          ) : (
            <p className="mt-1 text-[17px] text-slate-700">
              {PLAN_INFO[plan].label} · {formatEuros(sub!.price_cents)} por mês mais IVA (
              {formatEuros(withVat(sub!.price_cents))}).
            </p>
          )}
          {planAllows(plan, 'catalogo') ? null : (
            <p className="mt-2 max-w-[54ch] text-[17px] text-slate-600">
              Este plano não inclui catálogo: os produtos ficam guardados, mas não chegam aos pintores.
            </p>
          )}
        </section>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {(['vendedores', 'catalogo'] as const).map((p) => (
          <li key={p} className={`rounded-2xl border bg-white p-4 sm:p-5 ${plan === p ? 'border-tinta-600' : 'border-slate-200'}`}>
            <p className="font-semibold text-slate-900">{PLAN_INFO[p].label}</p>
            <p className="mt-1 text-[26px] font-semibold leading-tight text-slate-900">
              {formatEuros(PLAN_INFO[p].monthlyCents)}
              <span className="text-[17px] font-normal text-slate-600"> /mês + IVA</span>
            </p>
            <ul className="mt-3 list-disc pl-5 text-[17px] text-slate-700">
              {PLAN_INFO[p].features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {manager && stripeConfigured && plan !== p && (
              <div className="mt-4">
                <SubscribeButton orgId={id} plan={p} />
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className="max-w-[54ch] text-[15px] text-slate-600">
        O pagamento é feito no Stripe, e o plano fica ativo quando o Stripe o confirma.
      </p>
    </div>
  );
}
