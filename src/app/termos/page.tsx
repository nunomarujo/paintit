import { LegalPage, Section } from '@/components/LegalPage';
import { BRAND } from '@/config/brand';
import { COMPANY } from '@/config/company';

export const metadata = { title: `Termos e condições · ${BRAND.name}` };

export default function TermsPage() {
  return (
    <LegalPage title="Termos e condições de utilização">
      <Section title="1. O serviço">
        <p>
          A {COMPANY.name} presta, através de {BRAND.domain}, um serviço de <b>apresentação e orçamentação</b>: o cliente descreve a obra de pintura, empresas de pintura verificadas apresentam
          propostas, o cliente compara e escolhe, e as duas partes assinam o contrato na plataforma. A plataforma <b>não é parte no contrato de empreitada</b>, não executa nem fiscaliza a obra
          e não garante o seu resultado; o seu papel termina com a assinatura das duas partes, depois da qual só guarda prova.
        </p>
      </Section>
      <Section title="2. Conta e dados">
        <p>
          Cada pessoa tem uma conta com um só perfil (cliente, empresa de pintura ou fornecedor) e cada empresa de pintura ou fornecedor tem uma só entidade. Os dados indicados têm de ser verdadeiros
          e atualizados. A plataforma pode validar documentos e recusar ou suspender contas que não cumpram.
        </p>
      </Section>
      <Section title="3. Anonimato e proibição de partilhar contactos">
        <p>
          Até ao momento da apresentação, é <b>proibido identificar as partes</b> (nomes, moradas) ou partilhar contactos, em pedidos, propostas, mensagens, legendas e condições. Um filtro
          automático recusa esses textos. A primeira tentativa dá um aviso; a segunda, o último aviso, com possibilidade de pedir revisão uma única vez; a terceira bloqueia a conta. A equipa pode
          desbloquear contas para corrigir erros.
        </p>
      </Section>
      <Section title="4. Clientes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Pedir orçamentos e comparar propostas não tem custo.</li>
          <li>
            Ao escolher uma proposta, o cliente deposita uma caução, num parceiro de pagamentos autorizado, não na plataforma. É devolvida quando as duas partes assinam e só se perde nos casos
            previstos no contrato com a plataforma, nomeadamente desistir depois de conhecer o pintor sem justa causa.
          </li>
          <li>A escolha só é efetiva com o depósito da caução. O direito de livre resolução do consumidor, quando se aplique, não é afetado.</li>
          <li>O pagamento da obra é feito diretamente ao empreiteiro, nos termos do contrato.</li>
        </ul>
      </Section>
      <Section title="5. Empresas de pintura">
        <ul className="list-disc space-y-1 pl-5">
          <li>Só submetem propostas com a habilitação exigida para o valor da obra, que a plataforma valida à data do envio.</li>
          <li>
            Cada orçamento declara que inclui mão-de-obra qualificada, indica os seguros (de responsabilidade civil e de acidentes de trabalho) e o plano de pagamentos, e mantém a garantia legal,
            a que a garantia adicional eventualmente oferecida acresce. Quem declara não ter seguro pode propor, mas o cliente vê um aviso.
          </li>
          <li>
            A plataforma cobra ao prestador uma comissão pelo sucesso, só se a proposta for escolhida e a contratação avançar, nos termos e com os valores indicados no ecrã da proposta. A
            comissão é paga em 8 dias depois da notificação, e só então as partes se conhecem e o pintor assina.
          </li>
          <li>Produtos «ou equivalente» seguem a regra descrita na proposta e no contrato.</li>
        </ul>
      </Section>
      <Section title="6. Fornecedores de tintas">
        <ul className="list-disc space-y-1 pl-5">
          <li>Pagam uma subscrição mensal para estarem presentes e manterem o catálogo. A plataforma não recebe dos fornecedores pelas vendas.</li>
          <li>
            Podem dar códigos de adesão a pintores. O código aplica-se a uma obra ganha; se o pintor ganhar, a comissão do pintor à plataforma é reduzida e o fornecedor tem direito a uma comissão,
            que acumula em saldo e pode resgatar contra fatura, nas condições indicadas no seu espaço.
          </li>
          <li>As sugestões e o «material comprometido» dizem respeito a compra e entrega, não à aplicação do produto.</li>
        </ul>
      </Section>
      <Section title="7. Pagamentos">
        <p>
          A plataforma não guarda dinheiro: cada movimento (caução, comissão, subscrições) é feito por um parceiro de pagamentos autorizado. Os preços indicados incluem ou excluem IVA conforme
          assinalado.
        </p>
      </Section>
      <Section title="8. Responsabilidade">
        <p>
          A plataforma responde pelo seu serviço, nos termos da lei. Não responde pela execução da obra, por declarações falsas das partes, nem por interrupções de serviço alheias ao seu controlo.
          Nada nestes termos limita direitos que a lei reconhece aos consumidores.
        </p>
      </Section>
      <Section title="9. Alterações, lei e litígios">
        <p>
          Estes termos podem ser alterados; as alterações relevantes são comunicadas com antecedência e não afetam contratações já iniciadas. Aplica-se a lei portuguesa. Os consumidores podem usar o
          Livro de Reclamações e as entidades de resolução alternativa de litígios (ver página própria). Foro: o legalmente competente.
        </p>
      </Section>
    </LegalPage>
  );
}
