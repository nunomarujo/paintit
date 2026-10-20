import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
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
      <header className="sticky top-0 z-20 h-14 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
          <BrandMark />
          <nav className="flex items-center gap-5 text-sm text-slate-700">
            <a href="#como-funciona" className="hidden sm:inline">Como funciona</a>
            <a href="#condominios" className="hidden sm:inline">Condomínios</a>
            <a href="#profissionais" className="hidden sm:inline">Para profissionais</a>
            <Link href="/entrar" className="rounded-lg border border-slate-300 px-4 py-1.5 font-semibold text-tinta-700">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <PaintedHero>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Fachadas · Condomínios · Zonas comuns</p>
        <h1 className="mt-3 text-4xl font-bold leading-[1.05] text-tinta-900 sm:text-6xl">
          Orçamente a pintura do seu prédio.
        </h1>
        <p className="mt-4 max-w-md text-lg text-slate-600">
          Encontrar empresas de pintura e comparar propostas para a mesma obra.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link href={START} className="inline-flex items-center rounded-lg bg-terracota px-6 py-3.5 text-base font-semibold text-white hover:opacity-90">
            Pedir orçamentos →
          </Link>
          <a href="#condominios" className="text-sm font-semibold text-tinta-700 underline underline-offset-4">
            Gerir vários edifícios
          </a>
        </div>
        <p className="mt-6 text-xs text-slate-500">Descer para ver o prédio ganhar cor.</p>
      </PaintedHero>

      <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-bold text-tinta-900">Orçamentos comparáveis.</h2>
        <p className="mt-1 text-slate-600">O mesmo trabalho, os detalhes à vista.</p>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {compare.map((c) => (
            <li key={c.t} className="border-t border-slate-200 pt-4">
              <h3 className="font-semibold text-tinta-900">{c.t}</h3>
              <p className="mt-1 text-sm text-slate-600">{c.d}</p>
            </li>
          ))}
        </ul>
        <ol className="mt-14 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.t} className="flex gap-3">
              <span className="text-xl font-bold text-terracota">{i + 1}</span>
              <span>
                <h3 className="font-semibold text-tinta-900">{s.t}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.d}</p>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section id="condominios" className="border-y border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Administração de condomínios</p>
          <h2 className="mt-2 text-3xl font-bold text-tinta-900">Cada edifício, a sua obra.</h2>
          <p className="mt-3 max-w-xl text-slate-600">
            Pedidos, propostas e documentos organizados por condomínio, com a minuta do contrato pronta a assinar com
            Chave Móvel Digital.
          </p>
          <Link href={toOrg('condominio')} className="btn-primary mt-6 !px-6 !py-3 !text-base">
            Gerir vários edifícios →
          </Link>
        </div>
      </section>

      <section id="perguntas" className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-3xl font-bold text-tinta-900">Antes de avançar</h2>
        <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
          {faqs.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {f.q}
                <span aria-hidden className="text-xl group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-slate-700">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="profissionais" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-tinta-900">Empresa de pintura?</h2>
            <p className="mt-2 text-slate-600">
              Receber pedidos na zona de trabalho. Só há pagamento depois de o cliente escolher a proposta e depositar a caução.
            </p>
            <Link href={toOrg('pintor')} className="btn-secondary mt-5">Área profissional</Link>
          </div>
          <div className="rounded-2xl border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-tinta-900">Fornecedor de tintas?</h2>
            <p className="mt-2 text-slate-600">
              Presença na lista de fornecedores e, no plano de catálogo, descontos para as empresas da plataforma.
            </p>
            <Link href={toOrg('fornecedor')} className="btn-secondary mt-5">Entrada para fornecedores</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-6 text-sm text-slate-500">
          <BrandMark />
          <span>© {new Date().getFullYear()} {BRAND.name}</span>
          <a href={`mailto:${BRAND.email}`} className="hover:underline">{BRAND.email}</a>
          <Link href="/transparencia" className="hover:underline">Transparência</Link>
          {/* Páginas legais por redigir e validar com o advogado (docs/ROADMAP.md). */}
          <span>Termos, privacidade e Livro de Reclamações: em preparação</span>
        </div>
      </footer>
    </main>
  );
}
