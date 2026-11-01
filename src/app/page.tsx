'use client';

import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { LegalLinks } from '@/components/LegalPage';
import { ComparadorDemo } from '@/components/landing/ComparadorDemo';
import { Faq } from '@/components/landing/Faq';
import { PaintedHero } from '@/components/landing/PaintedHero';
import { PassoAssinar, PassoComparar, PassoDescrever } from '@/components/landing/PassosDemo';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { Revelar } from '@/components/landing/Revelar';
import { BRAND } from '@/config/brand';
import { formatEuros } from '@/domain/money';
import { CURRENT_RULES } from '@/domain/rules';

const START = '/entrar?seguinte=%2Fapp%2Fcomecar';
const toOrg = (tipo: string) => `/entrar?seguinte=${encodeURIComponent(`/app/organizacoes/nova?tipo=${tipo}`)}`;
const pct = (bp: number) => `${(bp / 100).toLocaleString('pt-PT')}%`;

/**
 * Página inicial v5 (01/11/2026), desenhada no canvas "Quem Pinta — landing v5" e aprovada pelo
 * promotor secção a secção. Três mudanças de fundo face à v4:
 *
 * 1. **A página é do cliente.** O pintor e o fornecedor saem daqui para páginas próprias
 *    (`/empresas`, `/fornecedores`); ficam dois cartões a apontar para lá. Uma página que vendia a
 *    três públicos ao mesmo tempo não vendia bem a nenhum.
 * 2. **O conteúdo responde ao mercado.** O levantamento de 01/11/2026 (Portal da Queixa, APEGAC,
 *    Fixando) deu três problemas por ordem de peso: medo de ser enganado (obra que fica a meio),
 *    pedidos sem resposta, e propostas que não se comparam porque o pedido é vago. O hero responde
 *    ao primeiro, "Três proteções" aos dois primeiros, o levantamento ao terceiro.
 * 3. **A aplicação por dentro, já na paleta nova.** Os três passos mostram ecrãs reais redesenhados
 *    (`PassosDemo`), não caixas de texto — é o que a referência (usenorte.com) faz bem.
 *
 * O que se mantém da v4: o hero com o prédio a pintar-se, o `ComparadorDemo` com os seus seis
 * estados gerados em build, a FAQ e os valores da caução lidos de `CURRENT_RULES`
 * (nunca escritos à mão; nunca a comissão do pintor — regra 15 do CLAUDE.md).
 */

const protecoes = [
  {
    t: 'Orçamentos que descrevem os materiais',
    d: 'Cada proposta discrimina trabalhos, demãos e produtos — com ficha técnica e preço de referência do fornecedor. Dois orçamentos com o mesmo nome deixam de ser obras diferentes.',
  },
  {
    t: 'Contratos que transcrevem essa exata proposta',
    d: 'A minuta é gerada a partir da proposta escolhida, sem reescrita. Cliente e empresa assinam com Chave Móvel Digital; a prova fica guardada na plataforma.',
  },
  {
    // "Validação do fornecedor que vendeu o produto ao pintor" foi o pedido (01/11/2026); a
    // plataforma ainda não confirma a venda, por isso o texto diz só o que é verdade hoje: o
    // produto vem do catálogo de um fornecedor registado. A versão forte entra quando existir.
    t: 'Materiais de fornecedores da plataforma',
    d: 'Os produtos propostos vêm do catálogo de fornecedores registados, com ficha técnica e preço datado — e pode confirmar o que foi orçamentado contra o que foi aplicado.',
  },
];

const passos = [
  {
    n: '1',
    t: 'Descreva a obra',
    d: 'Escolher as fachadas e indicar as medidas conhecidas. Sem medidas? Um avaliador vai ao local, sem custo.',
    ecra: <PassoDescrever />,
  },
  {
    n: '2',
    t: 'Compare',
    d: 'As propostas chegam todas ao mesmo tempo. Ver o que cada uma cobre e enviar as perguntas que faltam.',
    ecra: <PassoComparar />,
  },
  {
    n: '3',
    t: 'Assine',
    d: 'Com Chave Móvel Digital, na plataforma. A caução é devolvida com as duas assinaturas.',
    ecra: <PassoAssinar />,
  },
];

function faqs(r: typeof CURRENT_RULES) {
  return [
    {
      q: 'Como recebo as propostas?',
      a: 'Basta publicar o pedido, com um prazo para receber propostas. Para que ninguém perca por responder primeiro, as propostas só chegam todas em simultâneo, no fim desse prazo — nunca uma a uma. Seguem-se 3 dias em que ainda se pode esclarecer dúvidas pelo canal anónimo da plataforma; a escolha pode ser feita durante essa janela ou depois.',
    },
    {
      q: 'Quando é que pago?',
      a: `A plataforma só intervém no depósito da caução — ${pct(r.guaranteeBp)} do valor da proposta sem IVA, com mínimo de ${formatEuros(r.guaranteeMinCents)}, numa instituição de pagamento autorizada — feito quando o cliente quiser, sem prazo. Com as duas assinaturas do contrato volta ao cliente; só se perde ao desistir depois de conhecer a empresa escolhida. O calendário de pagamento da obra fica no contrato, combinado diretamente com a empresa; a plataforma nunca o recebe.`,
    },
    {
      q: 'A plataforma garante a obra?',
      a: `Não. A obra e o seu cumprimento são das partes que assinam o contrato. O que a ${BRAND.name} garante é a clareza do que foi combinado: empresas com documentos verificados, propostas discriminadas, um contrato que transcreve a proposta, e a prova guardada.`,
    },
  ];
}

export default function Home() {
  const r = CURRENT_RULES;

  return (
    <main className="bg-white">
      <SiteHeader />

      <PaintedHero>
        {/* O título cabe em duas linhas em qualquer largura (guia de desenho, 01/11/2026); a segunda
            frase do promotor abre o parágrafo de apoio. Sem pílula por cima do título. */}
        <h1 className="text-[26px] font-extrabold leading-[1.02] tracking-[-0.03em] text-tinta-900 min-[480px]:text-[34px] sm:text-[40px] xl:text-[44px]">
          Orçamentos de pintura, sem complicações.
        </h1>
        <p className="mt-5 max-w-[26rem] text-[17px] leading-snug text-slate-700 sm:text-[20px]">
          Compare as diferenças com clareza: propostas de empresas verificadas, lado a lado, sem custo até escolher — e
          um contrato que diz exatamente o que a proposta disse.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <Link href={START} className="btn-primary btn-lg">
            Pedir orçamentos
          </Link>
          <a href="#condominios" className="btn-secondary btn-lg">
            Gerir vários edifícios
          </a>
        </div>
      </PaintedHero>

      {/* COMO FUNCIONA — três passos, cada um com o ecrã real redesenhado ao lado. */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-24">
        <h2 className="text-[26px] leading-tight font-extrabold sm:text-[34px] text-tinta-900">Três passos. É só isto.</h2>
        <ol className="mt-14 flex flex-col gap-20">
          {passos.map((p, i) => (
            <li key={p.n} className="grid min-w-0 items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <Revelar className={`min-w-0 ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
                <span className="block text-[64px] font-extrabold leading-none tracking-tight text-tinta-600">{p.n}</span>
                <h3 className="mt-3 text-[26px] font-extrabold leading-tight text-tinta-900">{p.t}</h3>
                <p className="mt-3 max-w-md text-[17px] leading-relaxed text-slate-700">{p.d}</p>
              </Revelar>
              <div className={`min-w-0 overflow-hidden ${i % 2 === 1 ? 'lg:order-1' : ''}`}>{p.ecra}</div>
            </li>
          ))}
        </ol>
      </section>

      {/* LEVANTAMENTO GRATUITO — responde ao pedido vago, que é o que torna as propostas incomparáveis.
          A foto é o único sítio da página com uma imagem real (decisão do promotor, 01/11/2026): o
          contexto bate a 100% — um avaliador a tomar notas em frente ao prédio, com o cliente a apontar. */}
      <section id="levantamento" className="bg-paper py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2 lg:gap-16">
          <div className="lg:order-1">
            <h2 className="text-[26px] leading-tight font-extrabold sm:text-[34px] text-tinta-900">
              Não sabe medir? Um avaliador vai lá, sem custo.
            </h2>
            <p className="mt-3 text-[17px] leading-relaxed text-slate-700">
              Um profissional mede as zonas e fotografa o estado da fachada. As medidas ficam no pedido; os pintores
              orçamentam sem terem de ir lá. Pode pedir, desistir e retomar quando quiser.
            </p>
            <ol className="mt-7 flex flex-col gap-4">
              {[
                ['Pedir a visita ao criar o pedido', 'A opção está ativa por omissão. Não é preciso preencher medidas enquanto se aguarda.'],
                ['Um avaliador reserva e combina dia e hora', 'Por ordem de chegada, quando há um avaliador qualificado disponível na zona.'],
                ['O levantamento entra no pedido', 'Medidas e fotografias do estado ficam anexadas; os orçamentos chegam sobre elas.'],
              ].map(([t, d]) => (
                <li key={t} className="border-l-4 border-tinta-600 pl-4">
                  <span className="block text-[17px] font-bold text-tinta-900">{t}</span>
                  <span className="block text-[17px] text-slate-700">{d}</span>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-[17px] text-slate-700">
              A visita depende de haver um avaliador ativo na zona. Continua sempre a poder medir a obra sozinho, a
              qualquer momento.
            </p>
          </div>
          <figure className="m-0 lg:order-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/levantamento.webp"
              width={1600}
              height={873}
              alt="Avaliador a tomar notas em frente a um prédio, com o cliente a apontar para a fachada"
              className="block aspect-[4/3] w-full rounded-2xl object-cover"
            />
            <figcaption className="mt-3 text-[15px] text-slate-700">
              A visita é feita por um profissional qualificado de um fornecedor da plataforma.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* TRÊS PROTEÇÕES — em positivo (pedido do promotor, 01/11/2026). */}
      <section id="transparencia" className="py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="max-w-3xl text-[26px] leading-tight font-extrabold sm:text-[34px] text-tinta-900">
            Três proteções quando orçamenta por aqui.
          </h2>
          <p className="mt-3 max-w-3xl text-[17px] leading-relaxed text-slate-700">
            Em Portugal, a queixa mais comum contra empresas de pintura não é o preço — é a obra que fica a meio. E
            quase metade dos pedidos de orçamento nunca têm resposta. Foi para isto que a plataforma foi desenhada.
          </p>
          {/* Três colunas sobre um degrau de tom, sem caixa nem ícone em cima: o título grande faz o
              trabalho (guia de desenho, 01/11/2026). */}
          <Revelar className="mt-10 grid gap-8 rounded-2xl bg-paper p-8 md:grid-cols-3 md:gap-10">
            {protecoes.map((p) => (
              <div key={p.t}>
                <h3 className="text-[20px] font-extrabold leading-tight tracking-tight text-tinta-900 lg:text-[26px]">{p.t}</h3>
                <p className="mt-3 text-[17px] leading-relaxed text-slate-700">{p.d}</p>
              </div>
            ))}
          </Revelar>
          <div className="mt-8 max-w-3xl">
            <Faq items={faqs(r)} />
            <p className="mt-5 text-[17px] text-slate-700">
              <Link href="/transparencia" className="ligacao">
                Ver a página completa de Transparência
              </Link>{' '}
              — como a plataforma é paga, por quem, e como ordenamos as propostas.
            </p>
          </div>
        </div>
      </section>

      {/* COMPARADOR — seis estados reais, gerados em build (scripts/gerar-demo-comparador.mjs). */}
      <section id="demo-comparador" className="bg-tinta-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="max-w-3xl text-[26px] leading-tight font-extrabold sm:text-[34px]">
            O essencial não é o preço. É o que esse preço cobre.
          </h2>
          <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-tinta-200">
            Cada proposta é lida pelo que inclui, exclui ou deixa por esclarecer — antes de olhar ao total. O comparador
            não elege vencedora: mostra onde está a diferença. Exemplo com um pedido de 240 m² e três propostas.
          </p>
          <div className="mt-8 rounded-2xl bg-white p-2 text-slate-900 sm:p-4">
            <ComparadorDemo />
          </div>
          <p className="mt-6 text-[17px]">
            <Link href="/metodologia" className="font-semibold text-lima underline underline-offset-4">
              Ver a metodologia pública
            </Link>
          </p>
        </div>
      </section>

      {/* PARA QUEM — dois cartões com identidade própria, cada um com o ecrã real do seu perfil
          (as capturas geradas dos componentes reais em `src/app/demo-*`). O nome do perfil é o
          título: era um rótulo de 13px e passava invisível (promotor, 01/11/2026). */}
      <section id="para-quem" className="py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-[26px] leading-tight font-extrabold sm:text-[34px] text-tinta-900">A plataforma também é sua.</h2>
          <Revelar className="mt-9 grid gap-6 md:grid-cols-2">
            {[
              {
                href: '/empresas',
                titulo: 'Empresa de pintura?',
                frase: 'Há mais obras do que empresas para as fazer.',
                texto: 'Orçamentos detalhados em minutos, sem custo: a aplicação aprende de orçamento para orçamento. Oportunidades na sua zona, gestão de obra incluída. Só paga quando ganha.',
                cta: 'Ver como funciona para empresas',
                img: '/img/popup-demo-pintor.webp',
                alt: 'Orçamento guiado: trabalho selecionado com sugestões de produto do catálogo',
                escuro: true,
              },
              {
                href: '/fornecedores',
                titulo: 'Fornecedor de tintas?',
                frase: 'Venda mais. E venda acertado.',
                texto: 'Chegue ao pintor antes de a obra estar decidida, recomende o produto certo para aquela fachada, e seja reconhecido por isso. Sem custo para o vendedor.',
                cta: 'Ver como funciona para fornecedores',
                img: '/img/popup-demo-fornecedor.webp',
                alt: 'Catálogo de produtos de um fornecedor, com fichas técnicas e descontos',
                escuro: false,
              },
            ].map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className={`group flex flex-col overflow-hidden rounded-2xl ${c.escuro ? 'bg-tinta-900 text-white' : 'bg-tinta-100 text-tinta-900'}`}
              >
                <div className="flex flex-col gap-3 p-8 pb-6">
                  <span className="text-[26px] font-extrabold leading-tight">{c.titulo}</span>
                  <span className={`text-[20px] font-bold leading-snug ${c.escuro ? 'text-lima' : 'text-tinta-600'}`}>{c.frase}</span>
                  <span className={`text-[17px] leading-relaxed ${c.escuro ? 'text-tinta-200' : 'text-slate-700'}`}>{c.texto}</span>
                  <span className={`mt-2 inline-flex min-h-[44px] w-fit items-center rounded-lg px-4 text-[15px] font-bold ${c.escuro ? 'bg-white text-tinta-900' : 'bg-tinta-600 text-white'}`}>
                    {c.cta}
                  </span>
                </div>
                <div className="mx-8 -mb-2 h-56 overflow-hidden rounded-t-2xl bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.img} alt={c.alt} className="block w-full object-cover object-top transition-transform duration-500 group-hover:-translate-y-3" />
                </div>
              </Link>
            ))}
          </Revelar>
        </div>
      </section>

      {/* ADMINISTRAÇÃO DE CONDOMÍNIOS — âncora de "Gerir vários edifícios". */}
      <section id="condominios" className="bg-paper py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-[26px] leading-tight font-extrabold sm:text-[34px] text-tinta-900">Cada edifício, a sua obra.</h2>
            <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-slate-700">
              Pedidos, propostas e documentos organizados por condomínio. O relatório para a assembleia e a minuta
              pronta a assinar com Chave Móvel Digital, no mesmo sítio. Os condóminos de cada prédio podem acompanhar o
              pedido, ler as propostas e votar.
            </p>
            <Link href={toOrg('condominio')} className="btn-secondary btn-lg mt-6">
              Gerir vários edifícios
            </Link>
          </div>
          {/* Fachadas da Ribeira, Porto — fotografia de Dale Cruse, CC BY 4.0 (crédito no rodapé). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/fachadas-porto.webp"
            width={1600}
            height={699}
            loading="lazy"
            alt="Fachadas de edifícios de habitação na Ribeira, no Porto, pintadas de vermelho, amarelo e verde"
            className="block aspect-[16/9] w-full rounded-2xl object-cover "
          />
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="rounded-2xl bg-tinta-900 px-7 py-14 text-center text-white">
          <h2 className="mx-auto max-w-2xl text-[26px] font-extrabold leading-tight sm:text-[34px]">
            Peça orçamentos, sem compromisso.
          </h2>
          <p className="mt-3 text-[17px] text-tinta-200">Comparar propostas não tem custo.</p>
          <div className="mt-7 flex flex-col items-center gap-5">
            <Link href={START} className="btn-primary btn-lg">
              Pedir orçamentos
            </Link>
            <div className="flex gap-6 text-[15px]">
              <Link href="/empresas" className="inline-flex min-h-[44px] items-center font-semibold text-lima underline-offset-4 hover:underline">
                Sou empresa de pintura
              </Link>
              <Link href="/fornecedores" className="inline-flex min-h-[44px] items-center font-semibold text-lima underline-offset-4 hover:underline">
                Sou fornecedor
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-6 text-[15px] text-slate-500">
          <BrandMark />
          <span>© {new Date().getFullYear()} {BRAND.name}</span>
          <a href={`mailto:${BRAND.email}`} className="inline-flex min-h-[44px] items-center hover:underline">{BRAND.email}</a>
          <LegalLinks />
          <span className="basis-full text-[13px] text-slate-600">
            Fotografia das fachadas do Porto: Dale Cruse,{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/" className="underline underline-offset-2 hover:text-tinta-900" rel="noreferrer">
              CC BY 4.0
            </a>
            , via Wikimedia Commons.
          </span>
        </div>
      </footer>
    </main>
  );
}
