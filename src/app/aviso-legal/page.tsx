import { LegalPage, Section } from '@/components/LegalPage';
import { BRAND } from '@/config/brand';
import { COMPANY } from '@/config/company';

export const metadata = { title: `Aviso legal · ${BRAND.name}` };

export default function LegalNoticePage() {
  return (
    <LegalPage title="Aviso legal">
      <Section title="Quem presta o serviço">
        <p>
          {BRAND.name} ({BRAND.domain}) é um serviço da <b>{COMPANY.name}</b>, {COMPANY.legalForm.toLowerCase()}, NIF/NIPC {COMPANY.nif}, com sede na {COMPANY.address},{' '}
          {COMPANY.postalCode} {COMPANY.city}, Portugal. Contacto: <a className="ligacao" href={`mailto:${BRAND.email}`}>{BRAND.email}</a>.
        </p>
        <p className="text-slate-600">Registo comercial e capital social: a completar antes do lançamento público.</p>
      </Section>
      <Section title="Contacto único e denúncia de conteúdos ilegais">
        <p>
          O ponto de contacto para autoridades e utilizadores (Regulamento dos Serviços Digitais) é o email acima. Quem encontrar um anúncio, proposta ou mensagem que
          considere ilegal ou que viole as regras da plataforma pode denunciá-lo para esse endereço, indicando a ligação e o motivo. A equipa analisa, decide e comunica a decisão.
        </p>
      </Section>
      <Section title="Inteligência artificial">
        <p>
          A plataforma <b>não usa sistemas de inteligência artificial</b> para interagir com os utilizadores, para os avaliar ou para decidir sobre as suas contas, propostas ou
          contratos. As funções automáticas existentes funcionam por regras fixas: o filtro que recusa contactos e moradas nos textos (as decisões graves têm revisão humana), a
          ordenação das propostas pelo critério que o cliente escolhe, as sugestões de produtos por regras e o volume tridimensional genérico do prédio, calculado a partir das medidas
          indicadas. Se vier a usar IA, esta página será atualizada e os utilizadores informados.
        </p>
      </Section>
      <Section title="Propriedade intelectual e responsabilidade">
        <p>
          A marca, o desenho do site e o código pertencem à {COMPANY.name}. As marcas e fichas técnicas de produtos que aparecem no catálogo pertencem aos respetivos titulares e são
          usadas para informação. A plataforma apresenta as partes e as suas propostas, mas <b>não é parte no contrato de empreitada</b> nem responde pela execução da obra, que é
          matéria exclusiva do dono da obra e do empreiteiro.
        </p>
      </Section>
    </LegalPage>
  );
}
