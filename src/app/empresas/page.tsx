import type { Metadata } from 'next';
import { CONTEUDO_DE_PERFIL, DEMO_DE_PERFIL, toOrg } from '@/components/landing/perfis';
import { PaginaDePerfil } from '@/components/landing/PaginaDePerfil';
import { BRAND } from '@/config/brand';

const intro =
  'Orçamentos detalhados em minutos, sem custo. Oportunidades reais na sua zona, contrato assinado na plataforma, e as ferramentas da obra incluídas. Só paga quando ganha.';

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
  { n: '1.º orçamento', t: '≈ 45 min', d: 'Os trabalhos que faz, os produtos que usa, as condições que põe sempre. Fica tudo guardado como modelo.' },
  { n: '2.º orçamento', t: '≈ 20 min', d: 'Os modelos já lá estão. Ajusta-se o que muda nesta obra: zonas, quantidades, preços.' },
  { n: 'A partir do 3.º', t: '≈ 5 min', d: 'Escolhe-se a obra, aplicam-se os modelos, confirma-se. Sai um documento A4 detalhado, com rigor.' },
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
      eyebrow="Empresas de pintura"
      titulo="Orçamentos detalhados em minutos. Sem custo."
      intro={intro}
      demo={DEMO_DE_PERFIL.pintor}
      destaques={c.destaques}
      beneficios={c.beneficios}
      nota={c.nota}
      ctaHref={toOrg('pintor')}
      ctaTexto={c.ctaTexto}
      ctaNota={c.ctaNota}
    >
      {/* O MOTOR DE ORÇAMENTOS — a razão número um para o pintor entrar (promotor, 01/11/2026). */}
      <section className="bg-tinta-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-[13px] font-semibold text-lima">O motor de orçamentos</p>
          <h2 className="mt-3 max-w-3xl text-[34px] leading-tight font-extrabold">
            Quem perde horas a fazer um orçamento, e ainda assim sai mal, passa a fazê-lo em minutos.
          </h2>
          <p className="mt-3 max-w-3xl text-[17px] leading-relaxed text-tinta-200">
            A aplicação aprende de orçamento para orçamento: os métodos de trabalho, os materiais típicos, as
            condições que se repetem. Cada orçamento novo começa onde o anterior acabou.
          </p>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {tempos.map((x) => (
              <li key={x.n} className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-white/5 p-7">
                <span className="text-[13px] font-semibold text-tinta-200">{x.n}</span>
                <span className="text-[34px] font-extrabold leading-none text-lima">{x.t}</span>
                <span className="mt-2 text-[15px] leading-relaxed text-tinta-200">{x.d}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-[15px] text-tinta-200">
            Tempos habituais numa obra de fachada com cerca de dez trabalhos. Sem custo: orçamentar nunca se paga.
          </p>
        </div>
      </section>

      {/* AS FERRAMENTAS DA OBRA */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <p className="eyebrow">Muito mais do que orçamentos</p>
        <h2 className="mt-3 max-w-3xl text-[34px] leading-tight font-extrabold text-tinta-900">
          As ferramentas da obra, incluídas e sem custo.
        </h2>
        <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-slate-600">
          Substituem o caderno e o grupo de mensagens — e funcionam mesmo em obras que não vieram da plataforma.
        </p>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ferramentas.map((f) => (
            <li key={f.t} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-6">
              <span className="text-[17px] font-bold text-tinta-900">{f.t}</span>
              <span className="text-[15px] leading-relaxed text-slate-600">{f.d}</span>
            </li>
          ))}
        </ul>
      </section>
    </PaginaDePerfil>
  );
}
