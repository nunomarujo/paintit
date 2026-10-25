import { notFound } from 'next/navigation';
import {
  BENEFICIOS_GRATUITO,
  BENEFICIOS_PRO,
  PRECO_ATUAL,
  PRO_DISCOUNT_BP,
  poupancaAnual,
  subscriberDiscountBp,
} from '@/domain/painterPlan';
import { formatEuros } from '@/domain/money';
import { CURRENT_RULES } from '@/domain/rules';
import { painterOrgs, painterSubscription } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';
import { CancelForm, SubscribeForm } from './PlanForms';

/**
 * Planos da empresa de pintura (25/10/2026). A página existe para uma decisão só — aderir ou não —
 * por isso o que decide está em cima: o que a comissão passa a ser, em euros, numa obra real. O resto
 * é o que vem a seguir, com o que ainda está por lançar marcado como tal, que é o que justifica o
 * preço de lançamento estar abaixo do preço de tabela.
 */
export default async function SubscriptionPage() {
  const { supabase, user } = await getUser();
  const orgs = await painterOrgs(supabase, user!.id);
  const org = orgs[0];
  if (!org) notFound();

  const subscricao = await painterSubscription(supabase, org.id);
  const hoje = new Date().toISOString().slice(0, 10);
  const ativo = subscriberDiscountBp(subscricao, hoje) > 0;
  const pendente = subscricao?.plano === 'pro' && subscricao.estado === 'por_pagar';

  // Exemplo com uma obra de 30 000 €: um número redondo e plausível numa fachada de prédio, para que a
  // diferença se leia em euros e não em pontos percentuais.
  const exemplo = 3_000_000;
  const comissaoBase = (exemplo * CURRENT_RULES.commissionBp) / 10_000;
  const comissaoPro = (exemplo * (CURRENT_RULES.commissionBp - PRO_DISCOUNT_BP)) / 10_000;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Plano da sua empresa</h1>
        <p className="mt-1 text-sm text-slate-600">
          Orçamentar é sempre gratuito. O plano Pro baixa a comissão de cada obra que ganhar e abre as ferramentas que
          estamos a construir.
        </p>
      </div>

      {ativo && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Plano Pro activo{subscricao?.validaAte ? `, pago até ${subscricao.validaAte.split('-').reverse().join('/')}` : ''}. A
          comissão das suas propostas está a {(CURRENT_RULES.commissionBp - PRO_DISCOUNT_BP) / 100}%.
        </p>
      )}
      {pendente && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">A adesão ficou a meio: falta o pagamento.</strong> Enquanto não estiver pago,
          a comissão mantém-se nos {CURRENT_RULES.commissionBp / 100}% e nada muda. Carregue de novo em aderir para
          retomar.
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-tinta-200 bg-tinta-50/60">
        <div className="grid gap-px bg-tinta-200/70 sm:grid-cols-3">
          <div className="bg-white px-5 py-4">
            <p className="eyebrow">Comissão hoje</p>
            <p className="mt-1 text-[26px] font-semibold leading-none text-slate-700">{formatEuros(comissaoBase)}</p>
            <p className="mt-1 text-[12px] text-slate-600">{CURRENT_RULES.commissionBp / 100}% numa obra de {formatEuros(exemplo)}</p>
          </div>
          <div className="bg-white px-5 py-4">
            <p className="eyebrow text-tinta-700">Com o plano Pro</p>
            <p className="mt-1 text-[26px] font-semibold leading-none text-tinta-800">{formatEuros(comissaoPro)}</p>
            <p className="mt-1 text-[12px] text-slate-600">{(CURRENT_RULES.commissionBp - PRO_DISCOUNT_BP) / 100}% na mesma obra</p>
          </div>
          <div className="bg-white px-5 py-4">
            <p className="eyebrow">Poupa</p>
            <p className="mt-1 text-[26px] font-semibold leading-none text-slate-900">{formatEuros(comissaoBase - comissaoPro)}</p>
            <p className="mt-1 text-[12px] text-slate-600">numa obra só, contra {formatEuros(PRECO_ATUAL.anualCents)} de plano anual</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="eyebrow">Gratuito</p>
          <p className="mt-1 text-[22px] font-semibold tracking-tight text-slate-900">0 €</p>
          <p className="text-[12px] text-slate-600">o que tem hoje</p>
          <ul className="mt-4 space-y-3 text-sm">
            {BENEFICIOS_GRATUITO.map((b) => (
              <li key={b.titulo}>
                <span className="font-semibold text-slate-900">{b.titulo}</span>
                <span className="block text-[12.5px] leading-snug text-slate-600">{b.detalhe}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border-2 border-tinta-600 bg-white p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="eyebrow text-tinta-700">Pro</p>
            <span className="badge badge-amber">Preço de lançamento</span>
          </div>
          <p className="mt-1 text-[22px] font-semibold tracking-tight text-slate-900">
            {formatEuros(PRECO_ATUAL.mensalCents)}<span className="text-[13px] font-normal text-slate-600">/mês</span>
            <span className="text-[13px] font-normal text-slate-600"> ou {formatEuros(PRECO_ATUAL.anualCents)}/ano</span>
          </p>
          <p className="text-[12px] text-slate-600">
            Preço de tabela {formatEuros(PRECO_ATUAL.tabelaMensalCents)}/mês e {formatEuros(PRECO_ATUAL.tabelaAnualCents)}/ano,
            quando tudo o que está por lançar estiver no ar. Quem subscrever agora mantém este preço enquanto não cancelar.
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            {BENEFICIOS_PRO.map((b) => (
              <li key={b.titulo}>
                <span className="font-semibold text-slate-900">{b.titulo}</span>
                {b.porLancar && <span className="badge ml-2 align-middle">Por lançar</span>}
                <span className="block text-[12.5px] leading-snug text-slate-600">{b.detalhe}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5">
            {ativo ? <CancelForm /> : <SubscribeForm />}
          </div>
        </section>
      </div>

      <p className="text-[12px] text-slate-500">
        O desconto de subscritor soma-se aos descontos de códigos de adesão e de fornecedores indicados. Com todos
        empilhados, a comissão nunca desce abaixo de {(CURRENT_RULES.commissionFloorBp ?? 0) / 100}%. A anual é uma só
        cobrança por ano, renovável, e poupa {formatEuros(poupancaAnual())} face a doze meses.
      </p>
    </div>
  );
}
