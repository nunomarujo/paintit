import Link from 'next/link';
import { BRAND } from '@/config/brand';
import { CURRENT_RULES } from '@/domain/rules';
import { formatEuros } from '@/domain/money';
import { SORT_LABELS } from '@/domain/proposal';
import { FREQUENT_MIN_ORDERS } from '@/domain/catalog';
import { PLAN_INFO, SUPPLIER_PLANS } from '@/domain/subscription';

export const metadata = { title: `Transparência · ${BRAND.name}` };

const pct = (bp: number) => `${(bp / 100).toLocaleString('pt-PT')}%`;

// Como a plataforma ganha dinheiro e como ordena o que mostra (parecer jurídico F2 e G2).
// Os valores vêm das regras em vigor, para esta página nunca divergir da app.
export default function TransparencyPage() {
  const r = CURRENT_RULES;
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 text-sm leading-relaxed">
      <Link href="/" className="text-slate-600 hover:underline">
        ← {BRAND.name}
      </Link>
      <h1 className="text-2xl font-semibold">Transparência</h1>

      <section>
        <h2 className="text-lg font-semibold">Como a plataforma é paga</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            A plataforma cobra apenas uma pequena comissão pelo sucesso, paga pelo prestador de serviço (a empresa de pintura),
            e só quando a sua proposta é escolhida. Pedir orçamentos e comparar propostas não tem custo para o cliente.
          </li>
          <li>
            O cliente deposita uma caução de {pct(r.guaranteeBp)} (mínimo {formatEuros(r.guaranteeMinCents)}) num parceiro de
            pagamentos autorizado. É-lhe devolvida quando as duas partes assinam; só a perde se desistir depois de conhecer o
            pintor.
          </li>
          <li>
            Os fornecedores pagam uma mensalidade para estarem presentes:{' '}
            {SUPPLIER_PLANS.map((p) => `${PLAN_INFO[p].label} ${formatEuros(PLAN_INFO[p].monthlyCents)}`).join('; ')} (mais IVA). A
            plataforma não recebe nada dos fornecedores pelas vendas.
          </li>
          <li>A plataforma não guarda dinheiro: cada movimento é feito pelo parceiro de pagamentos.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Como ordenamos as propostas</h2>
        <p className="mt-2">
          O cliente escolhe a ordem: {Object.values(SORT_LABELS).join(', ').toLowerCase()}. Por omissão, pelo preço sem IVA. Nenhum
          pintor paga para aparecer primeiro.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Como sugerimos materiais</h2>
        <p className="mt-2">
          Ao orçamentar, os produtos aparecem pelo maior desconto que o fornecedor dá para aquela obra, segundo regras que o
          próprio fornecedor define: produto ou tipo, dimensão da obra, forma de pagamento, quantidade, primeira compra ou cliente
          frequente ({FREQUENT_MIN_ORDERS} ou mais encomendas entregues). O preço não diz qual é o melhor sistema para o suporte;
          a escolha é do pintor.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">O que verificamos</h2>
        <p className="mt-2">
          Validamos os documentos que as empresas enviam, à data em que os enviam. Quando falta a habilitação IMPIC para o
          valor de uma obra, ou uma assinatura não se liga ao Cartão de Cidadão ou à Chave Móvel Digital, assinalamos a
          vermelho; as partes podem continuar, assumindo a responsabilidade.
        </p>
      </section>
      <p className="text-slate-600">
        Dúvidas: <a href={`mailto:${BRAND.email}`} className="text-tinta-700 hover:underline">{BRAND.email}</a>
      </p>
    </main>
  );
}
