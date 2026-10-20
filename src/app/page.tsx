import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { BRAND } from '@/config/brand';
import { FacadeIllustration, HouseIllustration, RoomIllustration, StairsIllustration } from '@/components/landing/Illustrations';

const workTypes = [
  { tipo: 'interior', label: 'Interiores', Art: RoomIllustration },
  { tipo: 'fachadas', label: 'Fachadas', Art: FacadeIllustration },
  { tipo: 'zonas_comuns', label: 'Zonas comuns', Art: StairsIllustration },
  { tipo: 'moradia', label: 'Moradias', Art: HouseIllustration },
];

const steps = [
  { title: 'Descrever o trabalho', text: 'O espaço, as superfícies e o resultado pretendido.' },
  { title: 'Comparar as propostas', text: 'Preparação, materiais, prazo e preço, lado a lado.' },
  { title: 'Escolher quem pinta', text: 'Confirmar as condições e combinar os próximos passos.' },
];

const compare = [
  'Preparação das superfícies',
  'Tintas e número de demãos',
  'Proteção do espaço e limpeza',
  'Prazo de execução',
  'Preço com o IVA identificado',
];

const helps = [
  { t: 'Como saber quantos metros quadrados são?', d: 'Descrever as divisões ou as fachadas e juntar fotografias: o pintor ajuda a confirmar.' },
  { t: 'O que fotografar para pedir um orçamento?', d: 'Paredes, tetos, fissuras, humidade e acessos. As fotografias originais não são mostradas aos pintores.' },
  { t: 'O que confirmar antes de aceitar uma proposta?', d: 'Que inclui o mesmo trabalho que as outras: preparação, demãos, materiais, prazo e IVA.' },
];

const faqs = [
  {
    q: 'Como receber propostas?',
    a: 'Basta publicar o pedido: os pintores verificados da zona enviam propostas com os trabalhos discriminados. Todas ficam lado a lado, sem identificar o pintor até haver escolha.',
  },
  {
    q: 'Quando pagar?',
    a: 'Só depois de escolher uma proposta, com o depósito da caução. O valor da obra é combinado e pago diretamente ao pintor; a plataforma não o recebe.',
  },
  {
    q: 'Como funciona a caução?',
    a: 'É de 3% do valor da proposta sem IVA, com mínimo de 150 €, e fica guardada numa instituição de pagamento autorizada. Com as duas assinaturas do contrato, volta ao cliente.',
  },
  {
    q: 'O que acontece se não avançar?',
    a: 'Desistir ou não assinar no prazo, depois de conhecer o pintor, implica perder a caução. Antes de escolher, comparar propostas não tem custo.',
  },
  {
    q: 'Quem paga a plataforma?',
    a: 'O pintor, com uma comissão de 3% do valor sem IVA (mínimo 150 €), paga em 8 dias depois de ser escolhido. O cliente só paga se desistir.',
  },
  {
    q: 'A plataforma garante a obra?',
    a: 'Não. A obra e o seu cumprimento são das partes que assinam o contrato. A plataforma guarda a prova do que foi acordado.',
  },
];

const serif = 'font-serif tracking-tight';

export default function Home() {
  return (
    <main className="bg-paper">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <BrandMark />
          <nav className="flex items-center gap-5 text-sm text-slate-700">
            <a href="#como-funciona" className="hidden sm:inline">Como funciona</a>
            <a href="#condominios" className="hidden sm:inline">Condomínios</a>
            <a href="#pintores" className="hidden sm:inline">Sou pintor</a>
            <Link href="/entrar" className="border-slate-300 font-semibold text-tinta-700 sm:border-l sm:pl-5">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-2 lg:items-center lg:py-16">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-terracota">Casas · Condomínios</p>
          <h1 className={`${serif} mt-3 text-5xl font-semibold leading-[1.02] text-tinta-900 sm:text-6xl`}>
            Quem pinta?
            <br />
            Escolher é simples.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-slate-600">
            Encontrar pintores para casa ou condomínio. Comparar propostas com o trabalho bem definido.
          </p>

          <form action="/entrar" method="get" className="mt-7 max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <input type="hidden" name="seguinte" value="/app/comecar" />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                O que pintar?
                <select name="tipo" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base">
                  {workTypes.map((w) => (
                    <option key={w.tipo} value={w.tipo}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Onde é o trabalho?
                <input
                  name="local"
                  placeholder="Código postal ou localidade"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
                />
              </label>
            </div>
            <button type="submit" className="btn-primary mt-4 w-full !py-3 !text-base">
              Pedir orçamentos →
            </button>
            <p className="mt-2 text-xs text-slate-500">Começar pelo espaço e pela localização. O registo só é pedido para guardar o pedido.</p>
          </form>
        </div>
        <RoomIllustration className="w-full rounded-2xl" />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className={`${serif} text-3xl font-semibold text-tinta-900`}>O que precisa de uma nova cor?</h2>
        <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {workTypes.map(({ tipo, label, Art }) => (
            <li key={tipo}>
              <Link href="/entrar?seguinte=%2Fapp%2Fcomecar" className="block overflow-hidden rounded-2xl border border-slate-200 bg-white hover:border-tinta-600">
                <Art className="aspect-[4/3] w-full" />
                <span className="block px-3 py-3 text-center font-semibold">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="como-funciona" className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className={`${serif} text-center text-3xl font-semibold text-tinta-900 sm:text-4xl`}>Da ideia ao pintor, passo a passo.</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className={`${serif} text-2xl text-terracota`}>{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <h3 className={`${serif} text-xl font-semibold text-tinta-900`}>{s.title}</h3>
                  <p className="mt-1 text-slate-600">{s.text}</p>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-sage py-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2">
          <div>
            <h2 className={`${serif} text-3xl font-semibold text-tinta-900`}>Antes de escolher, comparar.</h2>
            <p className="mt-3 text-slate-700">
              Dois orçamentos podem ter preços diferentes porque incluem trabalhos diferentes. A {BRAND.name} mostra as
              diferenças, para decidir com a mesma base.
            </p>
          </div>
          <ul className="space-y-2">
            {compare.map((c) => (
              <li key={c} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3">
                <span className="text-tinta-500" aria-hidden>✓</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
        <ul className="mx-auto mt-10 grid max-w-6xl gap-4 px-4 md:grid-cols-3">
          {helps.map((h) => (
            <li key={h.t} className="rounded-2xl border border-slate-200 bg-paper p-5">
              <h3 className="font-semibold text-tinta-900">{h.t}</h3>
              <p className="mt-1 text-sm text-slate-600">{h.d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="condominios" className="bg-tinta-900 py-14 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tinta-200">Para condomínios</p>
            <h2 className={`${serif} mt-2 text-4xl font-semibold leading-tight`}>
              Vários prédios.
              <br />
              Tudo organizado.
            </h2>
            <p className="mt-4 max-w-md text-tinta-100">
              Pedidos, propostas e documentos separados por edifício. Cada obra fica associada ao prédio certo, e a
              minuta do contrato fica pronta a assinar com Chave Móvel Digital.
            </p>
            <Link href={`/entrar?seguinte=${encodeURIComponent('/app/organizacoes/nova?tipo=condominio')}`} className="mt-6 inline-flex rounded-lg bg-white px-5 py-3 font-semibold text-tinta-900 hover:bg-tinta-50">
              Gerir pinturas do condomínio
            </Link>
          </div>
          <FacadeIllustration className="w-full rounded-2xl" />
        </div>
      </section>

      <section id="perguntas" className="bg-sage py-14">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className={`${serif} text-3xl font-semibold text-tinta-900`}>Dúvidas antes de começar?</h2>
          <div className="mt-6 divide-y divide-slate-300 border-y border-slate-300">
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
        </div>
      </section>

      <section id="pintores" className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-sage p-8">
            <h2 className={`${serif} text-3xl font-semibold text-tinta-900`}>Pintor?</h2>
            <p className="mt-2 text-slate-700">
              Receber pedidos na zona de trabalho. Só há pagamento depois de o cliente escolher a proposta e depositar a caução.
            </p>
            <Link href={`/entrar?seguinte=${encodeURIComponent('/app/organizacoes/nova?tipo=pintor')}`} className="btn-secondary mt-5">
              Conhecer as condições
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <h2 className={`${serif} text-3xl font-semibold text-tinta-900`}>Fornecedor de tintas?</h2>
            <p className="mt-2 text-slate-700">
              Aparece na lista de fornecedores e, no plano de catálogo, com descontos para os pintores da plataforma.
            </p>
            <Link href={`/entrar?seguinte=${encodeURIComponent('/app/organizacoes/nova?tipo=fornecedor')}`} className="btn-secondary mt-5">
              Entrada para fornecedores
            </Link>
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
