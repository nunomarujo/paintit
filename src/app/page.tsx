import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { LegalLinks } from '@/components/LegalPage';
import { PaintedHero } from '@/components/landing/PaintedHero';
import { BRAND } from '@/config/brand';

const START = '/entrar?seguinte=%2Fapp%2Fcomecar';
const toOrg = (tipo: string) => `/entrar?seguinte=${encodeURIComponent(`/app/organizacoes/nova?tipo=${tipo}`)}`;

const compare = [
  { t: 'Preparação da fachada', d: 'Reparações e tratamento das superfícies.' },
  { t: 'Tintas e materiais', d: 'Produtos, sistema de pintura e demãos.' },
  { t: 'Andaimes e acessos', d: 'Meios necessários e custos incluídos.' },
  { t: 'Prazo e preço total', d: 'Duração, condições e IVA identificado.' },
];

const steps = [
  { t: 'Descrever a obra', d: 'Fotografias, áreas e o que é preciso fazer.' },
  { t: 'Comparar propostas', d: 'O que está incluído em cada orçamento, lado a lado.' },
  { t: 'Escolher a empresa', d: 'Confirmar as condições e assinar o contrato.' },
];

const faqs = [
  {
    q: 'Como receber propostas?',
    a: 'Basta publicar o pedido: as empresas de pintura verificadas da zona enviam propostas com os trabalhos discriminados. Todas ficam lado a lado, sem identificar a empresa até haver escolha.',
  },
  {
    q: 'Quando pagar?',
    a: 'Só depois de escolher uma proposta, com o depósito da caução. O valor da obra é combinado e pago diretamente à empresa; a plataforma não o recebe.',
  },
  {
    q: 'Como funciona a caução?',
    a: 'É de 3% do valor da proposta sem IVA, com mínimo de 150 €, e fica guardada numa instituição de pagamento autorizada. Com as duas assinaturas do contrato, volta ao cliente.',
  },
  {
    q: 'O que acontece se não avançar?',
    a: 'Desistir ou não assinar no prazo, depois de conhecer a empresa, implica perder a caução. Antes de escolher, comparar propostas não tem custo.',
  },
  {
    q: 'A plataforma garante a obra?',
    a: 'Não. A obra e o seu cumprimento são das partes que assinam o contrato. A plataforma guarda a prova do que foi acordado.',
  },
];

export default function Home() {
  return (
    <main className="bg-white">
      {/*
        O cabeçalho (27/10/2026). Era a marca a 26px ao lado de um "Entrar" em caixa, com o mesmo peso
        visual: duas coisas a disputar a atenção logo à entrada, e nenhuma delas é o que se quer que a
        pessoa faça. A marca desce para 20px e o "Entrar" passa a ligação — quem tem conta procura-o e
        encontra-o; quem não tem fica com um caminho só à vista, o botão do primeiro ecrã.
      */}
      <header className="sticky top-0 z-20 h-14 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
          <BrandMark size="sm" />
          <nav className="flex items-center gap-6 text-[17px] text-slate-700">
            <a href="#como-funciona" className="hidden sm:inline">Como funciona</a>
            <a href="#condominios" className="hidden sm:inline">Condomínios</a>
            <a href="#profissionais" className="hidden sm:inline">Para profissionais</a>
            <Link href="/entrar" className="font-semibold text-tinta-700 underline-offset-4 hover:underline">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      {/*
        O primeiro ecrã leva o mínimo que decide: o que isto é, como funciona, e o que fazer a seguir.

        O âmbito da obra saiu daqui ao fim de três tentativas (27/10/2026). Primeiro era a linha
        "Fachadas · Condomínios · Zonas comuns", maiúsculas espaçadas que partiam ao meio no
        telemóvel; depois foi enfiado na frase de apoio. O promotor rejeitou as duas, e a razão não
        era de forma: o título já diz "do seu prédio", e fachadas e zonas comuns são o que um prédio
        tem — repeti-lo em letra menor logo abaixo lê-se como enchimento. O espaço passou a dizer o
        que só esta plataforma faz (todas as propostas ao mesmo tempo, no mesmo formato), e o âmbito
        desceu para a secção "Que obras se orçamentam aqui", onde é resposta e não anúncio.
      */}
      <PaintedHero>
        <h1 className="text-[34px] font-bold leading-[1.05] text-tinta-900 sm:text-5xl lg:text-6xl">
          Orçamente a pintura do seu prédio.
        </h1>
        <p className="mt-3 max-w-md text-[17px] leading-snug text-slate-600 sm:text-[20px]">
          Um pedido, várias propostas. Chegam todas no fim do prazo e no mesmo formato, prontas a comparar.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <Link
            href={START}
            className="inline-flex items-center justify-center rounded-lg bg-terracota px-6 py-3.5 text-[17px] font-semibold text-white hover:opacity-90"
          >
            Pedir orçamentos
          </Link>
          <a href="#condominios" className="text-[17px] font-semibold text-tinta-700 underline underline-offset-4 sm:text-center">
            Gerir vários edifícios
          </a>
        </div>
      </PaintedHero>

      {/* Resposta mais decisiva do "Antes de avançar" (abaixo), fora do acordeão (auditoria de UX,
          23/10/2026: é a pergunta de maior risco percebido para quem vai propor despesa a uma
          assembleia de condomínio — escondê-la só adia a desistência). Estava dentro do primeiro ecrã
          e era o que o fazia transbordar no telemóvel; fica aqui, a primeira coisa que se lê a seguir. */}
      <p className="mx-auto max-w-6xl px-4 pt-10 text-[17px] leading-relaxed text-slate-600 lg:max-w-3xl">
        Comparar propostas não tem custo. A obra e o contrato são sempre entre o cliente e a empresa escolhida — a
        plataforma guarda a prova do que foi acordado.
      </p>

      {/* O âmbito da obra, que saiu do primeiro ecrã (ver nota acima). Aqui é a resposta a "fazem o
          que eu preciso?" e não um anúncio por cima do título: prosa, frases curtas, e um h2 que
          leva as palavras da pesquisa ("fachadas", "muros") a um lugar onde contam. */}
      <section className="mx-auto max-w-6xl px-4 pt-10 lg:max-w-3xl">
        <h2 className="text-[26px] leading-tight font-bold text-tinta-900">Que obras se orçamentam aqui</h2>
        <p className="mt-3 text-[17px] leading-relaxed text-slate-600">
          Fachadas e empenas. Entradas, escadas e patamares. Garagens. Muros e vedações. Em condomínio ou em
          casa própria.
        </p>
      </section>

      <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-[34px] leading-tight font-bold text-tinta-900">Orçamentos comparáveis.</h2>
        <p className="mt-1 text-slate-600">O mesmo trabalho, os detalhes à vista.</p>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {compare.map((c) => (
            <li key={c.t} className="border-t border-slate-200 pt-4">
              <h3 className="font-semibold text-tinta-900">{c.t}</h3>
              <p className="mt-1 text-[17px] text-slate-600">{c.d}</p>
            </li>
          ))}
        </ul>
        <ol className="mt-14 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.t} className="flex gap-3">
              <span className="text-[20px] leading-snug font-bold text-terracota">{i + 1}</span>
              <span>
                <h3 className="font-semibold text-tinta-900">{s.t}</h3>
                <p className="mt-1 text-[17px] text-slate-600">{s.d}</p>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section id="condominios" className="border-y border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          {/* Tinha por cima do título a mesma linha de maiúsculas espaçadas que foi rejeitada no
              primeiro ecrã. O rótulo informativo sobe a título (e casa com a ligação do cabeçalho),
              a frase que era título passa a abrir o parágrafo. */}
          <h2 className="text-[34px] leading-tight font-bold text-tinta-900">Administração de condomínios</h2>
          <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-slate-600">
            Cada edifício, a sua obra: pedidos, propostas e documentos organizados por condomínio, com a minuta do
            contrato pronta a assinar com Chave Móvel Digital.
          </p>
          <Link href={toOrg('condominio')} className="btn-primary mt-6 !px-6 !py-3 !text-[17px]">
            Gerir vários edifícios
          </Link>
        </div>
      </section>

      <section id="perguntas" className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-[34px] leading-tight font-bold text-tinta-900">Antes de avançar</h2>
        <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
          {faqs.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {f.q}
                <span aria-hidden className="text-[20px] leading-snug group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-slate-700">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="profissionais" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-8">
            <h2 className="text-[26px] leading-tight font-bold text-tinta-900">Empresa de pintura?</h2>
            <p className="mt-2 text-slate-600">
              Receber pedidos na zona de trabalho. Só há pagamento depois de o cliente escolher a proposta e depositar a caução.
            </p>
            <Link href={toOrg('pintor')} className="btn-secondary mt-5">Área profissional</Link>
          </div>
          <div className="rounded-2xl border border-slate-200 p-8">
            <h2 className="text-[26px] leading-tight font-bold text-tinta-900">Fornecedor de tintas?</h2>
            <p className="mt-2 text-slate-600">
              Presença na lista de fornecedores e, no plano de catálogo, descontos para as empresas da plataforma.
            </p>
            <Link href={toOrg('fornecedor')} className="btn-secondary mt-5">Entrada para fornecedores</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-6 text-[17px] text-slate-500">
          <BrandMark />
          <span>© {new Date().getFullYear()} {BRAND.name}</span>
          <a href={`mailto:${BRAND.email}`} className="hover:underline">{BRAND.email}</a>
          <LegalLinks />
        </div>
      </footer>
    </main>
  );
}
