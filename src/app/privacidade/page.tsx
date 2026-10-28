import { LegalPage, Section } from '@/components/LegalPage';
import { BRAND } from '@/config/brand';
import { COMPANY } from '@/config/company';

export const metadata = { title: `Privacidade e cookies · ${BRAND.name}` };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacidade e cookies">
      <Section title="Quem trata os dados">
        <p>
          O responsável pelo tratamento é a <b>{COMPANY.name}</b>, NIF {COMPANY.nif}, {COMPANY.address}, {COMPANY.postalCode} {COMPANY.city}. Contacto para qualquer questão sobre dados
          pessoais: <a className="ligacao" href={`mailto:${BRAND.email}`}>{BRAND.email}</a>.
        </p>
      </Section>
      <Section title="Que dados tratamos e para quê">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>Conta e entidade</b> (email, nome, NIF, morada fiscal, contactos, equipa): para criar e gerir a conta e prestar o serviço (execução do contrato).
          </li>
          <li>
            <b>Pedidos e prédios</b> (morada, medidas, descrição, fotografias): para gerar o anúncio. A morada, os nomes e as fotografias originais <b>não chegam à outra parte antes da
            apresentação</b>; os pintores veem só o concelho, as medidas e um volume genérico.
          </li>
          <li>
            <b>Propostas, mensagens e contratos</b>: para comparar propostas, preparar e assinar o contrato e guardar a prova do que foi assinado (execução do contrato e
            cumprimento de obrigações legais).
          </li>
          <li>
            <b>Documentos de verificação</b> (alvarás, certificados IMPIC, seguros, atas): para validar quem propõe e quem contrata (interesse legítimo e obrigação legal).
          </li>
          <li>
            <b>Pagamentos e faturação</b>: o parceiro de pagamentos (Stripe) trata os dados de pagamento; nós guardamos o registo dos movimentos e os dados de faturação (obrigação legal e
            contabilística).
          </li>
          <li>
            <b>Segurança e regras da plataforma</b>: guardamos as tentativas de partilhar contactos antes da apresentação (texto, data) para aplicar avisos e bloqueios e rever pedidos (interesse
            legítimo). Há revisão humana no segundo aviso e o bloqueio pode ser desfeito pela equipa.
          </li>
          <li>
            <b>Avisos por email</b> (novos pedidos de orçamento para empresas de pintura, estado das contratações): necessários ao serviço; as empresas podem deixar de receber os de novos pedidos
            escrevendo para o contacto acima.
          </li>
        </ul>
      </Section>
      <Section title="Com quem partilhamos">
        <p>
          Apenas com prestadores que nos permitem funcionar, sob contrato: alojamento e base de dados (Vercel e Supabase, com a base de dados na União Europeia), pagamentos (Stripe), envio de email
          (Resend), encaminhamento do email da plataforma (ImprovMX), validação de NIF (nif.pt) e, quando estiver ativo, o software de faturação certificado. Quando há transferência para fora do
          Espaço Económico Europeu, é feita com as garantias legais aplicáveis (por exemplo, cláusulas contratuais-tipo). As partes de uma contratação veem os dados um do outro depois da
          apresentação, só para essa obra. Não vendemos dados.
        </p>
      </Section>
      <Section title="Quanto tempo guardamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Contratos e provas de assinatura: 10 anos depois da assinatura.</li>
          <li>Documentos de verificação: até 2 anos depois de a conta ficar inativa.</li>
          <li>Documentos fiscais e contabilísticos: pelo prazo legal.</li>
          <li>Pedidos e propostas sem contratação: enquanto a conta existir, ou até serem apagados pelo titular.</li>
          <li>Registos de tentativas de partilha de contactos: enquanto forem necessários para aplicar as regras e responder a pedidos de revisão.</li>
        </ul>
        <p className="text-slate-600">Prazos provisórios, a confirmar na revisão jurídica.</p>
      </Section>
      <Section title="Direitos">
        <p>
          Cada pessoa pode pedir o acesso, a retificação, o apagamento, a limitação, a portabilidade e opor-se ao tratamento, escrevendo para {BRAND.email}. Respondemos no prazo legal. Há direito
          de reclamar à Comissão Nacional de Proteção de Dados (cnpd.pt). Não tomamos decisões exclusivamente automatizadas com efeitos significativos: as recusas do filtro de contactos
          podem ser revistas por uma pessoa.
        </p>
      </Section>
      <Section title="Cookies">
        <p>
          Usamos <b>apenas cookies estritamente necessários</b>, para manter a sessão iniciada e a segurança. Não usamos cookies de publicidade nem de análise de audiência, por isso não há
          faixa de consentimento. Se isso mudar, pediremos o consentimento antes.
        </p>
      </Section>
    </LegalPage>
  );
}
