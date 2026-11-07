'use client';

import { COMPANY } from '@/config/company';
import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { LegalLinks } from '@/components/LegalPage';
import { ComparadorDemo } from '@/components/landing/ComparadorDemo';
import { Faq } from '@/components/landing/Faq';
import { HeroFotografico } from '@/components/landing/HeroFotografico';
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
 * O que se mantém da v4: o prédio a pintar-se (agora em secção própria), o `ComparadorDemo` com
 * os seus seis estados gerados em build, a FAQ e os valores da caução lidos de `CURRENT_RULES`
 * (nunca escritos à mão; nunca a comissão do pintor — regra 15 do CLAUDE.md).
 *
 * **v6 (01/11/2026), estilo aprovado em maquete a partir de usenorte.com:** fotografias a toda a
 * largura que se sucedem no primeiro ecrã, título grande em peso médio, botões em pílula, títulos
 * de secção enormes e centrados, muito ar, maquetes do produto em caixas cinzentas. As fotografias
 * foram geradas pelo promotor; o prédio passou a segundo plano, com o scroll a pintá-lo.
 */

/** Fotografias do primeiro ecrã, geradas pelo promotor a 01/11/2026 (sem créditos a dar). */
const FOTOS_DO_HERO = [
  { src: '/img/obra-andaime.webp', alt: 'Pintor num andaime a passar o rolo numa fachada de prédio, ao fim da tarde' },
  { src: '/img/fachada-meia.webp', alt: 'Prédio com metade da fachada já repintada de cinzento claro e a outra metade por fazer, com andaime' },
  { src: '/img/gestor-e-pintor.webp', alt: 'Gestor de condomínio com um tablet e pintor a olharem para uma fachada' },
  // Substitui «trincha-janela» (02/11/2026): aquela mostrava tinta por cima de caixilharia podre; esta mostra a preparação, que é o que distingue um bom pintor.
  { src: '/img/lixadora-parede.webp', alt: 'Pintor com máscara e protetores auriculares a lixar uma parede interior com lixadora de braço', clara: true },
  // Pedida de volta pelo promotor (02/11/2026): rolo numa parede de tijolo, Michael Cory, CC BY 2.0 (crédito no rodapé).
  { src: '/img/rolo-na-parede.webp', alt: 'Rolo de pintura encostado a uma parede de tijolo acabada de pintar de laranja' },
  // Enviadas pelo promotor a 02/11/2026.
  { src: '/img/riscas-de-reboco.webp', alt: 'Parede de reboco pintada em riscas verticais de terracota, verde, azul-marinho, amarelo e branco' },
  { src: '/img/sala-tres-cores.webp', alt: 'Sala com uma parede pintada em três cores — terracota, verde-água e azul-marinho — com um banco de madeira e uma planta', clara: true },
];

/** Títulos de secção do site público: grandes, em peso médio, centrados (estilo de 01/11/2026). */
const H2 = 'text-[34px] font-medium leading-[1.02] tracking-[-0.035em] text-tinta-900 sm:text-[44px] lg:text-[56px] 2xl:text-[64px]';
const H2_LATERAL = 'text-[26px] font-medium leading-[1.02] tracking-[-0.035em] text-tinta-900 sm:text-[34px] lg:text-[44px] 2xl:text-[52px]';
const H2_CLARO = 'text-[34px] font-medium leading-[1.02] tracking-[-0.035em] text-white sm:text-[44px] lg:text-[56px] 2xl:text-[64px]';


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
      <SiteHeader sobreFoto />

      <HeroFotografico fotos={FOTOS_DO_HERO}>
        <h1 className="max-w-[22ch] text-[32px] font-medium leading-[1.02] tracking-[-0.035em] min-[480px]:text-[40px] sm:text-[56px] xl:text-[76px] 2xl:text-[92px]">
          Orçamentos de pintura, sem complicações.
        </h1>
        <p className="mt-5 max-w-[48ch] text-[17px] lg:text-[20px] leading-snug text-white/90 sm:text-[20px]">
          Compare as diferenças com clareza: propostas de empresas verificadas, lado a lado, sem custo até escolher — e
          um contrato que diz exatamente o que a proposta disse.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link href={START} className="btn-primary btn-lg bg-white text-tinta-900 hover:bg-tinta-50">
            Pedir orçamentos
          </Link>
          <a href="#condominios" className="btn-primary btn-lg">
            Gerir vários edifícios
          </a>
        </div>
        <p className="mt-4 text-[13px] text-white/80">Sem custo até escolher · empresas com alvará e seguros verificados</p>
      </HeroFotografico>

      {/* COMPARADOR — a maquete do produto logo a seguir ao primeiro ecrã, numa caixa cinzenta
          com a nota escura, como a referência faz com o painel de contas. Seis estados reais,
          gerados em build (scripts/gerar-demo-comparador.mjs). */}
      <section id="demo-comparador" className="mx-auto max-w-[120rem] px-5 sm:px-10 lg:px-14 pt-6">
        <div className="rounded-[28px] bg-paper p-4 sm:p-8 lg:p-12">
          <div className="mb-6 grid gap-4 lg:mb-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <h2 className="text-[26px] font-medium leading-[1.05] tracking-[-0.03em] text-tinta-900 sm:text-[34px] lg:text-[44px]">
              O essencial não é o preço. É o que esse preço cobre.
            </h2>
            <p className="max-w-[46ch] text-[17px] lg:text-[20px] leading-snug text-slate-600">
              Cada proposta é lida pelo que inclui, exclui ou deixa por esclarecer, antes de olhar ao total. Três indicações
              com a razão escrita: a mais barata, a mais completa e a Escolha Quem Pinta. A decisão fica do seu lado.{' '}
              <Link href="/metodologia" className="ligacao">
                Metodologia
              </Link>
            </p>
          </div>
          <div className="rounded-2xl bg-white p-2 text-slate-900 sm:p-4">
            <ComparadorDemo />
          </div>
        </div>
      </section>

      {/* O PRÉDIO QUE SE PINTA — segundo plano, secção própria; o scroll continua a pintá-lo. */}
      <PaintedHero>
        <h2 className={H2_LATERAL}>Cada fachada, descrita antes de ser pintada.</h2>
        <p className="mt-5 max-w-[46ch] text-[17px] lg:text-[20px] leading-relaxed text-slate-700 sm:text-[20px]">
          Zonas, medidas e estado do suporte ficam no pedido. As propostas chegam todas ao mesmo tempo, descrevem trabalhos,
          demãos e produtos, e o contrato transcreve a que escolher. A tinta só cai depois de tudo isto estar claro.
        </p>
        <Link href={START} className="btn-primary btn-lg mt-7">
          Pedir orçamentos
        </Link>
      </PaintedHero>

      {/* COMO FUNCIONA — três passos em três colunas, cada um com o ecrã real redesenhado. */}
      <section id="como-funciona" className="mx-auto max-w-[120rem] px-5 sm:px-10 lg:px-14 py-24 lg:py-32">
        <h2 className={H2 + ' text-center'}>Três passos. É só isto.</h2>
        <p className="mx-auto mt-5 max-w-[60ch] text-center text-[17px] lg:text-[20px] leading-relaxed text-slate-600">
          Descreva a obra, compare as propostas quando chegarem todas ao mesmo tempo, e assine um contrato que diz o que a
          proposta disse.
        </p>
        <Revelar className="mt-14 grid gap-10 lg:grid-cols-3 lg:gap-6">
          {passos.map((p) => (
            <div key={p.n} className="flex min-w-0 flex-col gap-5">
              <div className="flex items-start gap-4">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-paper text-[15px] font-semibold text-tinta-900 tabular-nums">{p.n}</span>
                <div>
                  <h3 className="text-[20px] font-semibold leading-tight tracking-[-0.02em] text-tinta-900">{p.t}</h3>
                  <p className="mt-2 text-[17px] lg:text-[20px] leading-relaxed text-slate-600">{p.d}</p>
                </div>
              </div>
              <div className="min-w-0 overflow-hidden">{p.ecra}</div>
            </div>
          ))}
        </Revelar>
      </section>

      {/* LEVANTAMENTO GRATUITO — responde ao pedido vago, que é o que torna as propostas incomparáveis. */}
      <section id="levantamento" className="mx-auto max-w-[120rem] px-5 sm:px-10 lg:px-14 pb-24 lg:pb-32">
        <h2 className={H2 + ' text-center'}>Não sabe medir? Um avaliador vai lá.</h2>
        <p className="mx-auto mt-5 max-w-[60ch] text-center text-[17px] lg:text-[20px] leading-relaxed text-slate-600">
          Sem custo. Um profissional mede as zonas e fotografa o estado da fachada. As medidas ficam no pedido; os pintores
          orçamentam sem terem de ir lá. Pode pedir, desistir e retomar quando quiser.
        </p>
        <div className="mt-14 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/levantamento.webp"
            width={1600}
            height={873}
            loading="lazy"
            alt="Avaliador a tomar notas em frente a um prédio, com o cliente a apontar para a fachada"
            className="block aspect-[4/3] w-full rounded-[28px] object-cover"
          />
          <div>
            <ol className="flex flex-col gap-5">
              {[
                ['Pedir a visita ao criar o pedido', 'A opção está ativa por omissão. Não é preciso preencher medidas enquanto se aguarda.'],
                ['Um avaliador reserva e combina dia e hora', 'Por ordem de chegada, quando há um avaliador qualificado disponível na zona.'],
                ['O levantamento entra no pedido', 'Medidas e fotografias do estado ficam anexadas; os orçamentos chegam sobre elas.'],
              ].map(([t, d], i) => (
                <li key={t} className="flex items-start gap-4">
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-paper text-[15px] font-semibold text-tinta-900 tabular-nums">{i + 1}</span>
                  <div>
                    <span className="block text-[20px] font-semibold leading-tight text-tinta-900">{t}</span>
                    <span className="mt-1 block text-[17px] lg:text-[20px] text-slate-600">{d}</span>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-[17px] lg:text-[20px] text-slate-600">
              A visita depende de haver um avaliador ativo na zona. Continua sempre a poder medir a obra sozinho, a qualquer
              momento.
            </p>
          </div>
        </div>
      </section>

      {/* TRÊS PROTEÇÕES — em positivo (pedido do promotor, 01/11/2026), em três cartões cinzentos. */}
      <section id="transparencia" className="mx-auto max-w-[120rem] px-5 sm:px-10 lg:px-14 pb-24 lg:pb-32">
        <h2 className={H2 + ' text-center'}>Três proteções quando orçamenta por aqui.</h2>
        <p className="mx-auto mt-5 max-w-[60ch] text-center text-[17px] lg:text-[20px] leading-relaxed text-slate-600">
          Em Portugal, a queixa mais comum contra empresas de pintura não é o preço: é a obra que fica a meio. E quase
          metade dos pedidos de orçamento nunca têm resposta. Foi para isto que a plataforma foi desenhada.
        </p>
        <Revelar className="mt-14 grid gap-4 lg:grid-cols-3">
          {protecoes.map((p) => (
            <div key={p.t} className="flex flex-col gap-3 rounded-[24px] bg-paper p-7">
              <h3 className="text-[20px] font-semibold leading-tight tracking-[-0.025em] text-tinta-900 lg:text-[26px]">{p.t}</h3>
              <p className="text-[17px] lg:text-[20px] leading-relaxed text-slate-600">{p.d}</p>
            </div>
          ))}
        </Revelar>
        <div className="mx-auto mt-12 max-w-3xl">
          <Faq items={faqs(r)} />
          <p className="mt-5 text-center text-[17px] lg:text-[20px] text-slate-600">
            <Link href="/transparencia" className="ligacao">
              Ver a página completa de Transparência
            </Link>{' '}
            — como a plataforma é paga, por quem, e como ordenamos as propostas.
          </p>
        </div>
      </section>

      {/* PARA QUEM — os dois cartões para as páginas próprias do pintor e do fornecedor. */}
      <section id="para-quem" className="mx-auto max-w-[120rem] px-5 sm:px-10 lg:px-14 pb-24 lg:pb-32">
        <h2 className={H2 + ' text-center'}>A plataforma também é sua.</h2>
        <Revelar className="mt-14 grid gap-4 md:grid-cols-2">
          {[
            {
              href: '/empresas',
              titulo: 'Empresa de pintura?',
              frase: 'Há mais obras do que empresas para as fazer.',
              texto: 'Orçamentos detalhados em minutos, sem custo: a aplicação aprende de orçamento para orçamento. Oportunidades na sua zona, gestão de obra incluída. Só paga quando ganha.',
              cta: 'Ver como funciona para empresas',
              img: '/img/carrinha-equipa.webp',
              alt: 'Equipa de pintura a carregar a carrinha com escadas e baldes ao amanhecer',
              escuro: true,
            },
            {
              href: '/fornecedores',
              titulo: 'Fornecedor de tintas?',
              frase: 'Venda mais. E venda acertado.',
              texto: 'Chegue ao pintor antes de a obra estar decidida, recomende o produto certo para aquela fachada, e seja reconhecido por isso. Sem custo para os vendedores.',
              cta: 'Ver como funciona para fornecedores',
              img: '/img/maquina-de-tinta.webp',
              alt: 'Máquina de afinação a deitar corante azul num balde de tinta branca, numa loja',
              escuro: false,
            },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={`group flex flex-col overflow-hidden rounded-[28px] ${c.escuro ? 'bg-tinta-900 text-white' : 'bg-paper text-tinta-900'}`}
            >
              <div className="flex flex-col gap-3 p-8 pb-6">
                <span className="text-[34px] font-medium leading-tight tracking-[-0.03em] lg:text-[44px]">{c.titulo}</span>
                <span className={`text-[20px] font-semibold leading-snug ${c.escuro ? 'text-lima' : 'text-tinta-600'}`}>{c.frase}</span>
                <span className={`text-[17px] leading-relaxed ${c.escuro ? 'text-tinta-200' : 'text-slate-600'}`}>{c.texto}</span>
                <span className={`mt-2 w-fit ${c.escuro ? 'btn-primary bg-white text-tinta-900 group-hover:bg-tinta-50' : 'btn-primary'}`}>{c.cta}</span>
              </div>
              <div className="mx-8 -mb-2 h-56 overflow-hidden rounded-t-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.img} alt={c.alt} loading="lazy" className="block h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              </div>
            </Link>
          ))}
        </Revelar>
      </section>

      {/* ADMINISTRAÇÃO DE CONDOMÍNIOS — faixa fotográfica; âncora de "Gerir vários edifícios". */}
      <section id="condominios" className="mx-auto max-w-[120rem] px-5 sm:px-10 lg:px-14 pb-24 lg:pb-32">
        <div className="relative flex min-h-[520px] items-end overflow-hidden rounded-[28px] text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/atrio-em-obra.webp"
            width={1376}
            height={768}
            loading="lazy"
            alt="Átrio de um prédio em obras: baldes, rolos e lona a proteger as caixas do correio"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_30%,rgba(0,0,0,.74))]" />
          <div className="relative z-[2] grid w-full gap-6 p-7 sm:p-10 lg:grid-cols-[1.2fr_auto] lg:items-end">
            <div>
              <h2 className={H2_CLARO}>Cada edifício, a sua obra.</h2>
              <p className="mt-4 max-w-[48ch] text-[17px] lg:text-[20px] leading-relaxed text-white/88">
                Pedidos, propostas e documentos organizados por condomínio. O relatório para a assembleia e a minuta pronta
                a assinar com Chave Móvel Digital, no mesmo sítio. Os condóminos de cada prédio podem acompanhar o pedido,
                ler as propostas e votar.
              </p>
            </div>
            <Link href={toOrg('condominio')} className="btn-primary btn-lg w-fit bg-white text-tinta-900 hover:bg-tinta-50">
              Gerir vários edifícios
            </Link>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-[120rem] px-5 sm:px-10 lg:px-14 pb-24 text-center">
        <h2 className={H2}>Peça orçamentos, sem compromisso.</h2>
        <p className="mt-4 text-[17px] lg:text-[20px] text-slate-600">Comparar propostas não tem custo.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={START} className="btn-primary btn-lg">
            Pedir orçamentos
          </Link>
          <Link href="/empresas" className="btn-secondary btn-lg">
            Sou empresa de pintura
          </Link>
          <Link href="/fornecedores" className="btn-secondary btn-lg">
            Sou fornecedor
          </Link>
        </div>
      </section>

      <footer className="bg-paper">
        <div className="mx-auto flex max-w-[120rem] flex-wrap items-center gap-x-5 gap-y-2 px-5 sm:px-10 lg:px-14 py-6 text-[15px] text-slate-500">
          <BrandMark />
          <span>
            © {new Date().getFullYear()} {BRAND.name}, marca de {COMPANY.name}
          </span>
          <a href={`mailto:${BRAND.email}`} className="inline-flex min-h-[44px] items-center hover:underline">{BRAND.email}</a>
          <LegalLinks />
          <span className="basis-full text-[13px] text-slate-600">
            Fotografia do rolo na parede: Michael Cory,{' '}
            <a href="https://creativecommons.org/licenses/by/2.0/" className="underline underline-offset-2 hover:text-tinta-900" rel="noreferrer">
              CC BY 2.0
            </a>
            , via Wikimedia Commons.
          </span>
        </div>
      </footer>
    </main>
  );
}
