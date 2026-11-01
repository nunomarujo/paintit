import type { Metadata } from 'next';
import { CONTEUDO_DE_PERFIL, DEMO_DE_PERFIL, toOrg } from '@/components/landing/perfis';
import { PaginaDePerfil } from '@/components/landing/PaginaDePerfil';
import { Revelar } from '@/components/landing/Revelar';
import { BRAND } from '@/config/brand';

const intro =
  'Oportunidades reais na sua zona, contrato assinado na plataforma e as ferramentas da obra incluídas. Orçamentar nunca se paga: só paga quando ganha.';

export const metadata: Metadata = {
  title: `Empresas de pintura — ${BRAND.name}`,
  description: intro,
};

/**
 * Tempos do orçamento guiado: estimativa do promotor (01/11/2026) a partir do que vê com
 * pintores reais — «da 1.ª vez gasta 45 min, da segunda 20, e a partir daí faz orçamentos
 * detalhados e com rigor em 5 min». Apresentam-se como o que é habitual, não como garantia, e
 * revêem-se quando houver medição na plataforma.
 */
const tempos = [
  { n: 'No primeiro orçamento', t: '≈ 45 min', d: 'Os trabalhos que faz, os produtos que usa, as condições que põe sempre. Fica tudo guardado como modelo.' },
  { n: 'No segundo', t: '≈ 20 min', d: 'Os modelos já lá estão. Ajusta-se o que muda nesta obra: zonas, quantidades, preços.' },
  { n: 'Do terceiro em diante', t: '≈ 5 min', d: 'Escolhe-se a obra, aplicam-se os modelos, confirma-se. Sai um documento A4 detalhado, com rigor.' },
];

const ferramentas = [
  { t: 'Modelos próprios', d: 'Condições, trabalhos e produtos habituais guardados uma vez e reutilizados em cada orçamento.' },
  { t: 'Produtos do catálogo', d: 'Sugestões de produto reais, com ficha técnica e preço de referência do fornecedor, no campo certo.' },
  { t: 'Documento A4 automático', d: 'O orçamento sai pronto a enviar, com o aspeto de sempre — sem Word nem Excel.' },
  { t: 'Orçamentos fora do mercado', d: 'Para os clientes próprios, com seguimento automático por email. A ferramenta é sua, não só da plataforma.' },
  { t: 'Diário de obra com fotografias', d: 'Dois toques por dia. O registo do que foi feito, para si e para mostrar ao cliente.' },
  { t: 'Equipa e horas', d: 'Quem esteve em obra e quantas horas, por pessoa e por dia.' },
  { t: 'Contas e consumíveis', d: 'Despesas, materiais gastos e o que sobrou, obra a obra.' },
  { t: 'Trabalhos a mais', d: 'O que apareceu depois de assinar, registado e orçamentado à parte, com prova.' },
  { t: 'Descontos de fornecedores', d: 'Condições comerciais automáticas por fornecedor, e desconto na comissão por referências.' },
];

/** Página própria do pintor, fora da página inicial desde 01/11/2026 (ver `PaginaDePerfil`). */
export default function Page() {
  const c = CONTEUDO_DE_PERFIL.pintor;
  return (
    <PaginaDePerfil
      titulo="Orçamentos em minutos. Sem custo."
      intro={intro}
      demo={DEMO_DE_PERFIL.pintor}
      destaques={c.destaques}
      beneficios={c.beneficios}
      nota={c.nota}
      ctaHref={toOrg('pintor')}
      ctaTexto={c.ctaTexto}
      ctaNota={c.ctaNota}
      foto={{ src: '/img/rolo-na-parede.webp', width: 1400, height: 939, alt: 'Rolo de pintura encostado a uma parede de tijolo acabada de pintar' }}
      destaquesTitulo="O que muda para a empresa de pintura"
      fotoInclui={{ src: '/img/levantamento.webp', width: 1600, height: 873, alt: 'Avaliador a tomar notas em frente a um prédio, com o cliente a apontar para a fachada' }}
      credito={
        <>
          Fotografias: rolo na parede, Michael Cory,{' '}
          <a href="https://commons.wikimedia.org/wiki/File:Paint_roller_4.jpg" className="underline underline-offset-2 hover:text-tinta-900" rel="noreferrer">
            CC BY 2.0
          </a>
          ; fachadas do Porto, Dale Cruse,{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/" className="underline underline-offset-2 hover:text-tinta-900" rel="noreferrer">
            CC BY 4.0
          </a>
          ; via Wikimedia Commons.
        </>
      }
    >
      {/* O MOTOR DE ORÇAMENTOS — a razão número um para o pintor entrar (promotor, 01/11/2026). */}
      <Revelar as="section" className="bg-tinta-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="max-w-3xl text-[26px] leading-tight font-extrabold sm:text-[34px]">
            Horas por orçamento passam a minutos.
          </h2>
          <p className="mt-3 max-w-[54ch] text-[17px] leading-relaxed text-tinta-200">
            A aplicação aprende de orçamento para orçamento: os métodos de trabalho, os materiais típicos, as
            condições que se repetem. Cada orçamento novo começa onde o anterior acabou.
          </p>
          <ol className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-3">
            {tempos.map((x) => (
              <li key={x.n} className="flex flex-col gap-2 border-l-4 border-lima pl-5">
                <span className="text-[34px] font-extrabold leading-none text-lima tabular-nums">{x.t}</span>
                <span className="text-[17px] font-semibold">{x.n}</span>
                <span className="text-[15px] leading-relaxed text-tinta-200">{x.d}</span>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-[15px] text-tinta-200">
            Tempos habituais numa obra de fachada com cerca de dez trabalhos. Sem custo: orçamentar nunca se paga.
          </p>
        </div>
      </Revelar>

      {/* AS FERRAMENTAS DA OBRA */}
      <Revelar as="section" className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-20 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
        <div className="lg:sticky lg:top-24">
          <h2 className="text-[26px] leading-tight font-extrabold text-tinta-900 sm:text-[34px]">
            As ferramentas da obra, incluídas.
          </h2>
          <p className="mt-3 text-[17px] leading-relaxed text-slate-600">
            Substituem o caderno e o grupo de mensagens — e funcionam mesmo em obras que não vieram da plataforma.
          </p>
          {/* Fotografia: fachadas da Ribeira, Porto (crédito no rodapé). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/fachadas-porto.webp"
            width={1600}
            height={699}
            alt="Fachadas coloridas de prédios antigos no Porto"
            loading="lazy"
            decoding="async"
            className="mt-8 hidden h-auto w-full rounded-2xl object-cover lg:block"
          />
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {ferramentas.map((f) => (
            <li key={f.t} className="flex flex-col gap-1.5 rounded-2xl bg-paper p-5">
              <span className="text-[17px] font-bold text-tinta-900">{f.t}</span>
              <span className="text-[17px] leading-relaxed text-slate-600">{f.d}</span>
            </li>
          ))}
        </ul>
      </Revelar>
    </PaginaDePerfil>
  );
}
