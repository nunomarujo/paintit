import { FeeSimulator } from '@/components/FeeSimulator';
import { BRAND } from '@/config/brand';

const steps = [
  {
    title: 'O condomínio descreve a obra',
    text: 'Fachadas, áreas e estado da pintura. As fotografias servem só para criar um volume 3D que não identifica o prédio.',
  },
  {
    title: 'Os pintores orçamentam',
    text: 'Pintores verificados veem a oportunidade sem morada nem nomes, e enviam propostas com os trabalhos discriminados.',
  },
  {
    title: 'O cliente compara e escolhe',
    text: 'Com a aprovação da assembleia, deposita uma garantia de 3% e assina a minuta do contrato, gerada pela plataforma.',
  },
  {
    title: 'O pintor confirma',
    text: 'É avisado de que ganhou a obra e tem 8 dias para pagar a comissão. Só então vê o contrato e o assina.',
  },
  {
    title: 'Contrato assinado',
    text: 'A garantia volta ao cliente e o adiantamento fica disponível para o pintor. Daqui em diante, a obra é entre as partes.',
  },
];

const faqs = [
  {
    q: 'Quem paga a plataforma?',
    a: 'O pintor, com uma comissão de 3% do valor sem IVA, mínimo de 150 €. O cliente só paga se desistir depois de escolher: nesse caso perde a garantia de 3%.',
  },
  {
    q: 'Porque é que a morada e os contactos estão escondidos?',
    a: 'Para que as propostas sejam comparadas pelo conteúdo e para proteger o condomínio. As partes ficam identificadas no contrato, depois de as duas cumprirem os seus passos.',
  },
  {
    q: 'A plataforma garante a obra?',
    a: 'Não. A obra e o seu cumprimento são da responsabilidade das partes que assinam o contrato. A plataforma guarda a prova do que foi acordado.',
  },
  {
    q: 'Onde fica o dinheiro até à assinatura?',
    a: 'Numa instituição de pagamento autorizada, que o guarda e o liberta segundo as regras do contrato. A plataforma não fica com dinheiro de ninguém, além da sua comissão.',
  },
];

export default function Home() {
  return (
    <main>
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold text-tinta-700">{BRAND.name}</span>
          <nav className="flex gap-4 text-sm text-slate-600">
            <a href="#como-funciona">Como funciona</a>
            <a href="#simulador">Simulador</a>
            <a href="#perguntas">Perguntas</a>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        <p className="text-sm font-semibold uppercase tracking-wide text-tinta-600">Piloto em preparação</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
          Pintar o prédio sem andar atrás de orçamentos.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          {BRAND.tagline} Descreva a obra uma vez, receba propostas que se comparam ponto a ponto e assine o contrato
          sem sair da plataforma.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-tinta-50 p-6">
            <h2 className="font-semibold">Para condomínios e particulares</h2>
            <p className="mt-2 text-sm text-slate-700">
              Vários prédios numa só conta, propostas comparáveis e uma minuta de contrato pronta a assinar com Chave
              Móvel Digital.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-6">
            <h2 className="font-semibold">Para pintores</h2>
            <p className="mt-2 text-sm text-slate-700">
              Oportunidades na sua zona e convites para orçamentar. Só paga quando o cliente já escolheu a sua proposta
              e depositou a garantia.
            </p>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bg-slate-50 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-semibold">Como funciona</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-5">
            {steps.map((step, i) => (
              <li key={step.title}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tinta-600 text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="simulador" className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-2xl font-semibold">Quanto custa</h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Simule uma obra. Os valores são calculados com as regras em vigor; o IVA da obra é tratado entre cliente e
          pintor.
        </p>
        <div className="mt-6">
          <FeeSimulator />
        </div>
      </section>

      <section id="perguntas" className="bg-slate-50 py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-2xl font-semibold">Perguntas frequentes</h2>
          <dl className="mt-6 space-y-6">
            {faqs.map((f) => (
              <div key={f.q}>
                <dt className="font-semibold">{f.q}</dt>
                <dd className="mt-1 text-slate-600">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-4 px-4 py-6 text-sm text-slate-500">
          <span>
            © {new Date().getFullYear()} {BRAND.name}
          </span>
          {/* Páginas legais por redigir e validar com o advogado (docs/ROADMAP.md). */}
          <span>Termos, privacidade e Livro de Reclamações: em preparação</span>
        </div>
      </footer>
    </main>
  );
}
