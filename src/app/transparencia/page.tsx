import { PublicHeader } from '@/components/LegalPage';
import { BRAND } from '@/config/brand';
import { CURRENT_RULES } from '@/domain/rules';
import { formatEuros } from '@/domain/money';
import Link from 'next/link';
import { ORDEM_LABELS } from '@/domain/comparador';
import { prioridadeEmPalavras } from '@/domain/metodologia';
import { FREQUENT_MIN_ORDERS } from '@/domain/catalog';
import { PLAN_INFO, SUPPLIER_PLANS } from '@/domain/subscription';

export const metadata = { title: `Transparência · ${BRAND.name}` };

const pct = (bp: number) => `${(bp / 100).toLocaleString('pt-PT')}%`;

// Como a plataforma ganha dinheiro e como ordena o que mostra (parecer jurídico F2 e G2).
// Os valores vêm das regras em vigor, para esta página nunca divergir da app.
export default function TransparencyPage() {
  const r = CURRENT_RULES;
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 text-[17px] leading-relaxed">
      <h1 className="text-[26px] leading-tight font-semibold">Transparência</h1>

      <section>
        <h2 className="text-[20px] font-semibold">Como a plataforma é paga</h2>
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
            plataforma não recebe nada dos fornecedores pelas vendas. Um fornecedor pode dar a um pintor um código de adesão: se o pintor ganhar a obra, o fornecedor recebe uma comissão paga
            pela plataforma. Isto não altera a ordem em que os produtos aparecem.
          </li>
          <li>A plataforma não guarda dinheiro: cada movimento é feito pelo parceiro de pagamentos.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-[20px] font-semibold">Como ordenamos as propostas</h2>
        <p className="mt-2">
          Por omissão, as propostas que incluem todos os trabalhos pedidos e têm o preço firme aparecem primeiro, e dentro
          de cada grupo ordenam-se pelo total a pagar. O cliente pode trocar o critério a qualquer momento:{' '}
          {Object.values(ORDEM_LABELS).join(', ').toLocaleLowerCase('pt-PT')}. Nenhum pintor paga para aparecer primeiro.
        </p>
        <p className="mt-2">
          {prioridadeEmPalavras()}{' '}
          <Link className="underline" href="/metodologia">
            Como comparamos as propostas
          </Link>{' '}
          explica por extenso o que pesa, o que cada indicação significa e quando não indicamos nada.
        </p>
      </section>

      <section>
        <h2 className="text-[20px] font-semibold">Como sugerimos materiais</h2>
        <p className="mt-2">
          Ao orçamentar, os produtos aparecem pelo maior desconto que o fornecedor dá para aquela obra, segundo regras que o
          próprio fornecedor define: produto ou tipo, dimensão da obra, forma de pagamento, quantidade, primeira compra ou cliente
          frequente ({FREQUENT_MIN_ORDERS} ou mais encomendas entregues). O preço não diz qual é o melhor sistema para o suporte;
          a escolha é do pintor.
        </p>
      </section>

      <section>
        <h2 className="text-[20px] font-semibold">O que verificamos</h2>
        <p className="mt-2">
          Validamos os documentos que as empresas enviam, à data em que os enviam. Quando falta a habilitação IMPIC para o
          valor de uma obra, ou uma assinatura não se liga ao Cartão de Cidadão ou à Chave Móvel Digital, assinalamos esse
          aviso na própria proposta, em âmbar; as partes podem continuar, assumindo a responsabilidade. O vermelho fica
          para o que já caducou, fechou ou foi recusado.
        </p>
      </section>
      <p className="text-slate-600">
        Dúvidas: <a href={`mailto:${BRAND.email}`} className="ligacao">{BRAND.email}</a>
      </p>
    </main>
    </>
  );
}
