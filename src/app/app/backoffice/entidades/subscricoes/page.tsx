import { formatEuros } from '@/domain/money';
import { PLAN_INFO } from '@/domain/subscription';
import { getUser } from '@/lib/supabase/server';
import { SupplierPlanForm } from '../../PromoForms';

const card = 'rounded-2xl border border-slate-200 bg-white p-6';

export default async function SubscriptionsPage() {
  const { supabase } = await getUser();
  const [{ data: suppliers }, { data: subs }] = await Promise.all([
    supabase.from('organizations').select('id, nome').eq('kind', 'fornecedor').order('nome'),
    supabase.from('supplier_subscriptions').select('*'),
  ]);
  return (
    <section className={card}>
      <h2 className="font-semibold">Subscrições dos fornecedores</h2>
      <p className="mt-1 text-sm text-slate-600">O plano fica ativo sozinho quando a Stripe confirma o pagamento. Aqui pode ativá-lo à mão (por exemplo, pago por transferência).</p>
      <ul className="mt-3 space-y-1 text-sm">
        {(suppliers ?? []).map((s) => {
          const sub = (subs ?? []).find((x) => x.org_id === s.id);
          return (
            <li key={s.id}>
              <strong>{s.nome}</strong>: {sub ? `${PLAN_INFO[sub.plan].label} · ${sub.status} · ${formatEuros(sub.price_cents)}/mês + IVA` : 'sem subscrição'}
            </li>
          );
        })}
        {(suppliers ?? []).length === 0 && <li className="text-slate-600">Ainda não há fornecedores.</li>}
      </ul>
      <div className="mt-4">
        <SupplierPlanForm suppliers={suppliers ?? []} />
      </div>
    </section>
  );
}
