'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { LegalLinks } from '@/components/LegalPage';
import { AudiencePopup } from '@/components/landing/AudiencePopup';
import { ComparadorDemo } from '@/components/landing/ComparadorDemo';
import { Faq } from '@/components/landing/Faq';
import { PaintedHero } from '@/components/landing/PaintedHero';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SurveyDemo } from '@/components/landing/SurveyDemo';
import { BRAND } from '@/config/brand';
import { formatEuros } from '@/domain/money';
import { CURRENT_RULES } from '@/domain/rules';

const START = '/entrar?seguinte=%2Fapp%2Fcomecar';
const toOrg = (tipo: string) => `/entrar?seguinte=${encodeURIComponent(`/app/organizacoes/nova?tipo=${tipo}`)}`;
const pct = (bp: number) => `${(bp / 100).toLocaleString('pt-PT')}%`;

const compare = [
  { t: 'Preparação da fachada', d: 'Reparações e tratamento das superfícies.' },
  { t: 'Tintas e materiais', d: 'Produtos, sistema de pintura e demãos.' },
  { t: 'Andaimes e acessos', d: 'Meios necessários e custos incluídos.' },
  { t: 'Prazo e preço total', d: 'Duração, condições e IVA identificado.' },
];

// O `apoio` do primeiro passo é a melhor coisa que a plataforma faz e estava só dentro da app, em
// dois ecrãs que ninguém vê antes de criar conta (28/10/2026). Quem chega aqui pensa que vai ter de
// medir e fotografar um prédio inteiro, e é aí que desiste.
//
// Diz "pode" e não "tem": a visita depende de haver um avaliador com catálogo activo na zona que
// reserve o pedido dentro do prazo. Se não houver, o levantamento feito pelo próprio cliente continua
// sempre disponível (`src/domain/survey.ts`). Prometer a visita como garantida seria vender silêncio.
const steps = [
  {
    t: 'Descrever a obra',
    d: 'Fotografias, áreas e o que é preciso fazer.',
    apoio: 'Não tem de medir nada sozinho: um avaliador da plataforma pode ir ao local fazer o levantamento consigo, sem acrescentar custo à obra.',
  },
  { t: 'Comparar propostas', d: 'O que está incluído em cada orçamento, lado a lado.' },
  { t: 'Escolher a empresa', d: 'Confirmar as condições e assinar o contrato.' },
];

/**
 * FAQ, reintroduzida a par de Transparência (pedido do promotor, 31/10/2026) — a par, nunca a
 * repetir. A versão anterior ("Antes de avançar", até ao commit d1a1593) tinha cinco perguntas:
 * "Como receber propostas?" e "Quando pagar?" (as duas que o promotor citou como exemplo a manter)
 * mais três sobre a caução e a garantia da obra — essas três ficaram de fora porque a secção
 * Transparência, construída depois a partir das mesmas respostas (ver o comentário antes de
 * `id="transparencia"`), já as cobre por completo e com mais detalhe (percentagem, mínimo, quando
 * se perde): repeti-las aqui seria a mesma frase duas vezes na página.
 *
 * As duas que ficam têm resposta nova, não a antiga copiada: a antiga de "Como receber propostas?"
 * ("as empresas enviam propostas... sem identificar a empresa até haver escolha") é quase a mesma
 * frase da Transparência actual — por isso a resposta aqui passa a contar o que a Transparência não
 * conta, a mecânica da entrega (simultânea, com janela de esclarecimentos), confirmada contra
 * `src/domain/entrega.ts` (`DIAS_DE_ESCLARECIMENTO`). A de "Quando pagar?" passa a explicar o que é
 * a plataforma a intervir (só a caução, sem prazo) e o que é só entre as partes (o calendário da
 * obra, no contrato), confirmado contra `docs/MODELO.md` (percurso v2) e o plano de pagamentos do
 * próprio orçamento (`PaymentPlan`, `src/app/app/oportunidades/[id]/ProposalForms.tsx`) — nunca a
 * plataforma a fixar quando a obra se paga.
 */
const faqs = [
  {
    q: 'Como receber propostas?',
    a: 'Basta publicar o pedido, com um prazo para receber propostas. Para que ninguém perca por responder primeiro, as propostas só chegam todas em simultâneo, no fim desse prazo — nunca uma a uma, à medida que são submetidas. Seguem-se 3 dias em que ainda se pode esclarecer dúvidas pelo canal anónimo da plataforma; a escolha pode ser feita durante essa janela ou depois, sem pressa.',
  },
  {
    q: 'Quando pagar?',
    a: 'A plataforma só intervém no depósito da caução, feito quando o cliente quiser, sem prazo — é esse depósito que torna a escolha efetiva. O calendário de pagamento da obra (adiantamento e fases seguintes, se houver) fica definido no contrato, combinado diretamente entre o cliente e a empresa escolhida; a plataforma nunca o recebe.',
  },
];

export default function Home() {
  const [popupAberto, setPopupAberto] = useState<'pintor' | 'fornecedor' | null>(null);
  const r = CURRENT_RULES;

  return (
    <main className="bg-white">
      <SiteHeader />

      {/*
        Copy do hero revista (ronda v4, ponto 4.1): o anterior "Orçamentos fáceis" descrevia só o
        primeiro passo — pedir — que qualquer plataforma de orçamentos oferece. A diferenciação
        real, e o que a própria página mais investe a mostrar logo a seguir (o comparador), é a
        comparação estruturada: ver o que cada proposta inclui, exclui e cobra, não só o total.

        A linha "Com a garantia de {BRAND.name}" saiu: nenhuma linguagem de garantia de execução ou
        acompanhamento de obra — esse tema fica só na secção de Transparência, explicitamente.
      */}
      <PaintedHero>
        <h1 className="text-[34px] font-bold leading-[1.05] text-tinta-900 sm:text-5xl lg:text-6xl">
          <span className="block">Peça orçamentos.</span>
          <span className="block">Veja o que cada um cobre.</span>
        </h1>
        <p className="mt-3 max-w-md text-[17px] leading-snug text-slate-600 sm:text-[20px]">
          <span className="block">Um pedido, várias propostas comparáveis.</span>
          <span className="block">Trabalhos, materiais e preço lado a lado — nunca só o total.</span>
          <span className="block">Simples de pedir. Claro de comparar.</span>
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <Link
            href={START}
            className="inline-flex items-center justify-center rounded-lg bg-terracota px-6 py-3.5 text-[17px] font-semibold text-white hover:opacity-90"
          >
            Pedir orçamentos
          </Link>
          <a href="#condominios" className="inline-flex min-h-[44px] items-center text-[17px] font-semibold text-tinta-700 underline underline-offset-4">
            Gerir vários edifícios
          </a>
        </div>
      </PaintedHero>

      {/* Frase de apoio, logo a seguir ao hero. */}
      <p className="mx-auto max-w-6xl px-4 pt-6 text-[17px] leading-relaxed text-slate-600 lg:max-w-3xl">
        Comparar propostas não tem custo. A obra e o contrato são sempre entre o cliente e a empresa escolhida — a
        plataforma guarda a prova do que foi acordado.
      </p>

      {/* O âmbito da obra: resposta a "fazem o que eu preciso?", não anúncio por cima do título. */}
      <section className="mx-auto max-w-6xl px-4 pt-10 lg:max-w-3xl">
        <h2 className="text-[26px] leading-tight font-bold text-tinta-900">Que obras se orçamentam aqui</h2>
        <p className="mt-3 text-[17px] leading-relaxed text-slate-600">
          Fachadas e empenas. Entradas, escadas e patamares. Garagens. Muros e vedações. Em condomínio ou em
          casa própria.
        </p>
      </section>

      {/*
        O COMPARADOR — demonstração principal, logo a seguir ao hero/apoio (ponto central da v4):
        o essencial não é o preço, é o que esse preço cobre. Seis estados reais, gerados em
        build-time pelos componentes e dados reais (ver scripts/gerar-demo-comparador.mjs).
      */}
      <section id="demo-comparador" className="mx-auto max-w-6xl px-4 py-16">
        <p className="eyebrow">O comparador de propostas</p>
        <h2 className="mt-3 text-[34px] leading-tight font-bold text-tinta-900">
          O essencial não é o preço — é o que esse preço cobre.
        </h2>
        <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-slate-600">
          Seis momentos reais do comparador, com dados fictícios, gerados pelas mesmas funções e componentes que a
          aplicação usa — não uma simulação visual.
        </p>
        <p className="mt-3 max-w-2xl rounded-lg bg-tinta-50 px-3.5 py-3 text-[15px] text-slate-700">
          O comparador não atribui pontuação nem elege uma proposta &ldquo;vencedora&rdquo;. Mostra o que cada proposta inclui,
          exclui ou deixa por esclarecer — e, quando possível, onde é que a diferença de preço tem causa identificada.
        </p>
        <ComparadorDemo />
      </section>

      {/* LEVANTAMENTO GRATUITO */}
      <section id="levantamento" className="border-t border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <p className="eyebrow">Levantamento gratuito</p>
          <h2 className="mt-3 text-[34px] leading-tight font-bold text-tinta-900">Não sabe medir a obra?</h2>
          <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-slate-600">
            Não tem de medir nada sozinho: quando há um avaliador disponível na zona, pode ir ao local fazer o
            levantamento consigo, sem acrescentar custo à obra.
          </p>
          <SurveyDemo />
        </div>
      </section>

      {/* COMO FUNCIONA */}
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
                {s.apoio && (
                  <p className="mt-2 border-l-2 border-tinta-300 pl-3 text-[15px] leading-snug text-tinta-700">
                    {s.apoio}
                  </p>
                )}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/*
        PARA QUEM — três percursos. "Clientes e condomínios" vai direto ao pedido; as outras duas
        abrem o popup correspondente (AudiencePopup), com a introdução, os destaques e a lista
        completa do que cada lado tem disponível.
      */}
      <section id="para-quem" className="border-t border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <p className="eyebrow">Para quem é a {BRAND.name}</p>
          <h2 className="mt-3 text-[34px] leading-tight font-bold text-tinta-900">Três percursos, um mercado.</h2>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-[20px] font-bold leading-tight text-tinta-900">Clientes e condomínios</h3>
              <p className="mt-2 text-[15px] text-slate-600">Quem descreve a obra e compara as propostas.</p>
              <ul className="mt-4 space-y-2 text-[15px] text-slate-700">
                {[
                  'Pedido guiado, sem precisar de saber de construção',
                  'Levantamento gratuito por um avaliador, quando há disponibilidade na zona',
                  'Comparador com metodologia pública',
                  'Anonimato até à confirmação da empresa escolhida',
                ].map((li) => (
                  <li key={li} className="flex items-start gap-2">
                    <span className="mt-1.5 h-[6px] w-[6px] flex-none rounded-full bg-tinta-700" />
                    {li}
                  </li>
                ))}
              </ul>
              <Link href={START} className="btn-secondary mt-5">
                Pedir orçamentos
              </Link>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-[20px] font-bold leading-tight text-tinta-900">Empresa de pintura?</h3>
              <p className="mt-2 text-[15px] text-slate-600">Quem orçamenta e executa a obra.</p>
              <ul className="mt-4 space-y-2 text-[15px] text-slate-700">
                {[
                  'Oportunidades de negócio filtradas por tipo de obra e zona',
                  'Orçamento guiado, com sugestões do catálogo',
                  'Documento A4 gerado automaticamente',
                  'Gestão de obra incluída (fotos, horas, despesas)',
                ].map((li) => (
                  <li key={li} className="flex items-start gap-2">
                    <span className="mt-1.5 h-[6px] w-[6px] flex-none rounded-full bg-tinta-700" />
                    {li}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setPopupAberto('pintor')} className="btn-secondary mt-5">
                Ver tudo o que inclui
              </button>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-[20px] font-bold leading-tight text-tinta-900">Fornecedor de tintas?</h3>
              <p className="mt-2 text-[15px] text-slate-600">Quem fornece os materiais usados nas obras.</p>
              <ul className="mt-4 space-y-2 text-[15px] text-slate-700">
                {[
                  'Catálogo com fichas técnicas e preço de referência',
                  'Produto sugerido diretamente na proposta do pintor',
                  'Descontos automáticos por artigo e por perfil de cliente',
                  'Programas de referência e oportunidades de levantamento no terreno',
                ].map((li) => (
                  <li key={li} className="flex items-start gap-2">
                    <span className="mt-1.5 h-[6px] w-[6px] flex-none rounded-full bg-tinta-700" />
                    {li}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setPopupAberto('fornecedor')} className="btn-secondary mt-5">
                Ver tudo o que inclui
              </button>
            </article>
          </div>
        </div>
      </section>

      {/* ADMINISTRAÇÃO DE CONDOMÍNIOS — âncora de "Gerir vários edifícios" (hero). Conteúdo igual ao
          que já existia; só a posição na página muda, para ficar junto de "Para quem". */}
      <section id="condominios" className="border-t border-slate-200 py-16">
        <div className="mx-auto max-w-6xl px-4">
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

      {/*
        TRANSPARÊNCIA / CONFIANÇA — o que já existia na página (as respostas de "Antes de avançar"
        sobre caução e garantia da obra) reorganizado em secção própria, com a âncora que o
        cabeçalho usa. Os valores da caução vêm de CURRENT_RULES (src/domain/rules.ts), nunca
        escritos à mão — e nunca a comissão do pintor (regra 15 do CLAUDE.md: o cliente não a vê).
      */}
      <section id="transparencia" className="border-t border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-3xl px-4">
          <p className="eyebrow">Transparência</p>
          <h2 className="mt-3 text-[34px] leading-tight font-bold text-tinta-900">O que a plataforma garante — e o que não garante.</h2>
          <p className="mt-3 text-[17px] leading-relaxed text-slate-600">
            A {BRAND.name} não garante a execução da obra: isso é entre o cliente e a empresa escolhida. O que a
            plataforma garante é a clareza do que foi combinado.
          </p>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2">
            <li>
              <h3 className="font-semibold text-tinta-900">Pedir e comparar não tem custo</h3>
              <p className="mt-1 text-[15px] text-slate-600">
                As empresas de pintura verificadas da zona enviam propostas com os trabalhos discriminados. Todas
                ficam lado a lado, sem identificar a empresa até haver escolha.
              </p>
            </li>
            <li>
              <h3 className="font-semibold text-tinta-900">Pagamento só depois de escolher</h3>
              <p className="mt-1 text-[15px] text-slate-600">
                O valor da obra é combinado e pago diretamente à empresa; a plataforma não o recebe.
              </p>
            </li>
            <li>
              <h3 className="font-semibold text-tinta-900">Caução reembolsável</h3>
              <p className="mt-1 text-[15px] text-slate-600">
                {pct(r.guaranteeBp)} do valor da proposta sem IVA, com mínimo de {formatEuros(r.guaranteeMinCents)},
                guardada numa instituição de pagamento autorizada. Com as duas assinaturas do contrato, volta ao
                cliente; só se perde ao desistir depois de conhecer a empresa escolhida.
              </p>
            </li>
            <li>
              <h3 className="font-semibold text-tinta-900">Metodologia pública</h3>
              <p className="mt-1 text-[15px] text-slate-600">
                O critério usado para ordenar e comparar as propostas está publicado, não é uma caixa fechada.
              </p>
            </li>
          </ul>
          <p className="mt-8 text-[15px] text-slate-600">
            <Link href="/transparencia" className="ligacao">
              Ver a página completa de Transparência
            </Link>{' '}
            — como a plataforma é paga, por quem, e como ordenamos as propostas.
          </p>
        </div>
      </section>

      {/* FAQ, a par de Transparência (ver nota junto a `const faqs`) — antes do CTA final, como pedido. */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-[34px] leading-tight font-bold text-tinta-900">Perguntas frequentes</h2>
        <div className="mt-6">
          <Faq items={faqs} />
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl bg-tinta-900 px-7 py-12 text-center text-white">
          <h2 className="text-[26px] font-extrabold sm:text-[34px]">Peça orçamentos de pintura, sem compromisso até escolher.</h2>
          <p className="mt-2.5 text-[17px] text-tinta-50">Comparar propostas não tem custo.</p>
          <div className="mt-7 flex flex-col items-center gap-4">
            <Link href={START} className="btn-primary btn-lg !bg-terracota">
              Pedir orçamentos
            </Link>
            <div className="flex gap-5 text-[13px]">
              <button type="button" onClick={() => setPopupAberto('pintor')} className="min-h-[44px] text-tinta-50 underline underline-offset-[3px] hover:text-white">
                Sou empresa de pintura
              </button>
              <button type="button" onClick={() => setPopupAberto('fornecedor')} className="min-h-[44px] text-tinta-50 underline underline-offset-[3px] hover:text-white">
                Sou fornecedor
              </button>
            </div>
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

      <AudiencePopup tipo="pintor" open={popupAberto === 'pintor'} onClose={() => setPopupAberto(null)} />
      <AudiencePopup tipo="fornecedor" open={popupAberto === 'fornecedor'} onClose={() => setPopupAberto(null)} />
    </main>
  );
}
