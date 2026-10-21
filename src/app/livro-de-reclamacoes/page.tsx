import { LegalPage, Section } from '@/components/LegalPage';
import { BRAND } from '@/config/brand';
import { COMPANY } from '@/config/company';

export const metadata = { title: `Livro de Reclamações · ${BRAND.name}` };

export default function ComplaintsPage() {
  return (
    <LegalPage title="Livro de Reclamações">
      <Section title="Reclamar">
        <p>
          Quem quiser apresentar uma reclamação sobre o serviço da {COMPANY.name} ({BRAND.name}) pode fazê-lo no <b>Livro de Reclamações Eletrónico</b>, em{' '}
          <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer" className="font-semibold text-tinta-700 underline">
            livroreclamacoes.pt
          </a>
          , escolhendo esta entidade pelo nome ou pelo NIF {COMPANY.nif}.
        </p>
        <p>
          Também pode escrever para <a className="text-tinta-700 hover:underline" href={`mailto:${BRAND.email}`}>{BRAND.email}</a>; respondemos o mais depressa possível.
        </p>
      </Section>
      <Section title="Resolução alternativa de litígios">
        <p>
          Os consumidores podem recorrer a uma entidade de resolução alternativa de litígios de consumo. A lista das entidades está no{' '}
          <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer" className="text-tinta-700 underline">
            Portal do Consumidor
          </a>
          . A {COMPANY.name} informa aqui a entidade a que está vinculada assim que a escolher.
        </p>
      </Section>
    </LegalPage>
  );
}
