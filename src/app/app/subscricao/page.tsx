import { notFound } from 'next/navigation';
import {
  BENEFICIOS_GRATUITO,
  BENEFICIOS_PRO,
  PRECO_ATUAL,
  PRO_DISCOUNT_BP,
  descontoDeLancamento,
  poupancaAnual,
  situacaoDe,
} from '@/domain/painterPlan';
import { formatEuros } from '@/domain/money';
import { withVat } from '@/domain/subscription';
import { painterOrgs, painterSubscription } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';
import { BenefitItem } from '@/components/BenefitItem';
import { CancelForm, SubscribeForm } from './PlanForms';

/**
 * Planos da empresa de pintura (25/10/2026). A página existe para uma decisão só — aderir ou não —
 * por isso o que decide está em cima: o que a comissão passa a ser, em euros, numa obra real. O resto
 * é o que vem a seguir, com o que é exclusivo de quem subscreve marcado como tal — desde 25/10/2026,
 * em que se verificou que o plano vendia quatro coisas e só reservava uma.
 */
export default async function SubscriptionPage() {
  const { supabase, user } = await getUser();
  const orgs = await painterOrgs(supabase, user!.id);
  const org = orgs[0];
  if (!org) notFound();

  const subscricao = await painterSubscription(supabase, org.id);
  const hoje = new Date().toISOString().slice(0, 10);
  const situacao = situacaoDe(subscricao, hoje);
  const pendente = situacao.tipo === 'por_pagar';
  const emPt = (d: string) => d.split('-').reverse().join('/');

  // Exemplo com uma obra de 30 000 €: um número redondo e plausível numa fachada de prédio, para que a
  // diferença se leia em euros e não em pontos percentuais.
  const exemplo = 3_000_000;
  // Calcula-se a poupança a partir do desconto, não da diferença entre duas comissões: assim a taxa
  // em vigor não chega sequer a entrar nesta página.
  const poupa = (exemplo * PRO_DISCOUNT_BP) / 10_000;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold">Plano da sua empresa</h1>
        <p className="mt-1 text-[17px] text-slate-600">
          Orçamentar é sempre gratuito. O plano Pro baixa a comissão de cada obra que ganhar e abre as ferramentas que
          estamos a construir.
        </p>
      </div>

      {situacao.tipo === 'activa' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[17px] text-emerald-900">
          <p>
            <strong className="font-semibold">Plano Pro activo.</strong> A comissão das suas propostas está{' '}
            {PRO_DISCOUNT_BP / 100} pontos percentuais mais baixa.
          </p>
          {/* Quem paga tem de ver o que paga, com que frequência e quando é a próxima cobrança, sem
              abrir o Stripe. O ecrã dizia só que o plano estava activo (25/10/2026). */}
          <p className="mt-1 text-emerald-800">
            {situacao.precoCents !== null
              ? `${formatEuros(situacao.precoCents)} ${situacao.periodicidade === 'anual' ? 'por ano' : 'por mês'} + IVA (${formatEuros(withVat(situacao.precoCents))})`
              : `Pagamento ${situacao.periodicidade}`}
            {situacao.renovaEm ? `, com a próxima cobrança a ${emPt(situacao.renovaEm)}.` : '.'}
          </p>
        </div>
      )}
      {situacao.tipo === 'cancelada_ate' && (
        <p className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-[17px] text-slate-800">
          <strong className="font-semibold">Subscrição cancelada.</strong> Não haverá nova cobrança. O desconto de{' '}
          {PRO_DISCOUNT_BP / 100} pontos mantém-se até {emPt(situacao.validaAte)}, o fim do período já pago. Pode voltar a
          aderir a qualquer momento.
        </p>
      )}
      {pendente && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[17px] text-amber-900">
          <strong className="font-semibold">A adesão ficou a meio: falta o pagamento.</strong> Enquanto não estiver pago,
          a comissão mantém-se como está e nada muda. Carregue de novo em aderir para retomar.
        </p>
      )}

      {/* O número grande é a poupança, e a taxa da comissão não aparece em lado nenhum desta página
          (decisão do promotor, 25/10/2026). Não basta tirar a percentagem do título: dizer "de X € para
          Y €" numa obra de valor conhecido revela as duas taxas por divisão. Fica só o que se poupa. */}
      <section className="rounded-2xl border border-marca-border bg-marca-cream px-6 py-5">
        <p className="eyebrow text-marca-ink-soft">Numa obra de {formatEuros(exemplo)}</p>
        <p className="mt-1 text-[34px] font-semibold leading-none tracking-tight text-marca-orange-deep">
          Poupa {formatEuros(poupa)}
        </p>
        <p className="mt-2 max-w-[60ch] text-[15px] text-marca-muted">
          A comissão da plataforma desce {PRO_DISCOUNT_BP / 100} pontos percentuais do valor sem IVA, e soma-se aos
          descontos que já tenha. Numa obra só, mais do que quatro anos de subscrição.
        </p>
      </section>

      <div className="grid items-start gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-marca-border bg-white p-5">
          <p className="eyebrow text-marca-ink-soft">Gratuito</p>
          <p className="mt-1 text-[20px] font-semibold tracking-tight text-marca-ink">0 €</p>
          <p className="text-[15px] text-marca-muted">o que tem hoje</p>
          <ul className="mt-4 space-y-3 text-[17px]">
            {BENEFICIOS_GRATUITO.map((b) => (
              <BenefitItem key={b.titulo} b={b} />
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border-2 border-marca-ink bg-white p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="eyebrow text-marca-ink-soft">Pro</p>
            <span className="rounded-full bg-marca-tag px-2 py-0.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-marca-ink-soft">
              Oferta de lançamento
            </span>
          </div>
          {/* O preço normal aparece riscado ao lado do de lançamento: é oferta, e uma oferta só se lê
              como tal contra o preço que substitui. Decisão do promotor, 25/10/2026. */}
          <p className="mt-1 text-[20px] font-semibold tracking-tight text-marca-ink">
            <span className="mr-2 text-[15px] font-normal text-marca-muted/60 line-through">{formatEuros(PRECO_ATUAL.tabelaMensalCents)}</span>
            {formatEuros(PRECO_ATUAL.mensalCents)}<span className="text-[17px] font-normal text-marca-muted">/mês</span>
            <span className="text-[17px] font-normal text-marca-muted"> ou {formatEuros(PRECO_ATUAL.anualCents)}/ano, + IVA</span>
          </p>
          {/* Uma linha só. O valor com IVA continua a ser dito no botão de adesão, antes de se sair
              para o pagamento, que é onde faz falta (25/10/2026). */}
          <p className="text-[15px] font-semibold text-marca-orange-deep">
            Desconto de lançamento −{formatEuros(descontoDeLancamento().mensalCents)}/mês ou −
            {formatEuros(descontoDeLancamento().anualCents)}/ano, por tempo limitado.
          </p>
          <p className="mt-4 text-[17px] font-semibold text-marca-ink">Tudo o que tem no Gratuito, mais:</p>
          {/* Separado em dois grupos para não prometer como feito o que ainda não entrega nada. As
              Obras Públicas e o mapa de convites têm o ecrã construído e a lista vazia — enquanto não
              houver dados lá dentro, ficam do lado de cá (25/10/2026). */}
          <p className="eyebrow mt-3 text-marca-ink-soft">● Já disponível</p>
          <ul className="mt-2 space-y-3 text-[17px]">
            {BENEFICIOS_PRO.filter((b) => !b.aChegar).map((b) => (
              <BenefitItem key={b.titulo} b={b} />
            ))}
          </ul>
          <p className="eyebrow mt-4 text-marca-muted">○ A chegar em breve</p>
          <ul className="mt-2 space-y-3 text-[17px]">
            {BENEFICIOS_PRO.filter((b) => b.aChegar).map((b) => (
              <BenefitItem key={b.titulo} b={b} />
            ))}
          </ul>
          <div className="mt-5">
            {/* Só quem tem a subscrição a correr pode cancelar. Já cancelada, o desconto continua até ao
                fim do período pago (`ativo`), mas o que falta oferecer é voltar a aderir, não cancelar
                de novo (25/10/2026). */}
            {situacao.tipo === 'activa' ? <CancelForm /> : <SubscribeForm />}
          </div>
        </section>
      </div>

      <p className="text-[15px] text-slate-500">
        O desconto de subscritor soma-se aos descontos de códigos de adesão e de fornecedores indicados. Com todos
        empilhados, há um limite mínimo abaixo do qual a comissão não desce. A anual é uma só cobrança por ano,
        renovável, e poupa {formatEuros(poupancaAnual())} face a doze meses.
      </p>
    </div>
  );
}
