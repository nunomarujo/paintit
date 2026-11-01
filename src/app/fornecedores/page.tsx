import type { Metadata } from 'next';
import { CONTEUDO_DE_PERFIL, DEMO_DE_PERFIL, toOrg } from '@/components/landing/perfis';
import { PaginaDePerfil } from '@/components/landing/PaginaDePerfil';
import { BRAND } from '@/config/brand';

const intro =
  'Chegue ao pintor antes de a obra estar decidida, recomende o produto certo para aquela fachada, e seja reconhecido por isso. Sem custo para o vendedor; a empresa subscreve só a presença no catálogo.';

export const metadata: Metadata = {
  title: `Fornecedores de tintas — ${BRAND.name}`,
  description: intro,
};

/**
 * A página do fornecedor, repensada a 01/11/2026 a partir dos três problemas do vendedor de
 * tintas (chega tarde à obra; vende por hábito, não por obra; não é reconhecido) e do que a
 * plataforma já faz para cada um. Tudo o que aqui se afirma existe: levantamentos
 * (`src/domain/survey.ts`), catálogo com ficha técnica, rendimento, demãos e aplicação
 * (`src/domain/catalog.ts`), sugestão por trabalho (`works.ts:productSuggestions`), descontos por
 * regra, carteira de clientes, avaliações (`survey_reviews`, `survey_info_reviews`). Subscrição
 * da empresa sem valores (regra 15 do CLAUDE.md aplica-se por analogia: preços só na área própria).
 */
const momentos = [
  {
    n: '1',
    t: 'Antes da obra: a visita',
    d: 'O pedido de levantamento chega ao vendedor-avaliador antes de haver qualquer orçamento. Vai ao prédio, mede, fotografa o estado da fachada — e é o primeiro a saber o que aquela obra precisa.',
  },
  {
    n: '2',
    t: 'No orçamento: o produto certo',
    d: 'Os produtos do catálogo aparecem ao pintor dentro do orçamento, trabalho a trabalho: para impermeabilizar, o impermeabilizante; para a fachada de 240 m², a embalagem e o rendimento certos. Não o genérico — o adequado.',
  },
  {
    n: '3',
    t: 'Depois: o reconhecimento',
    d: 'O cliente avalia a visita; os pintores avaliam a qualidade do levantamento. A carteira guarda quem comprou e a que condições. A relação deixa de depender da memória de cada um.',
  },
];

const ficha = [
  ['Rendimento', 'm² por litro e por demão — a quantidade sai calculada para a área da obra'],
  ['Demãos e secagem', 'quantas, com que intervalo — o pintor planeia o prazo com isso'],
  ['Aplicação', 'rolo, trincha, pistola; suporte e primário recomendados'],
  ['Ficha técnica em PDF', 'anexada ao produto, a um toque, no sítio onde a decisão é tomada'],
];

const ferramentas = [
  { t: 'Descontos por regra', d: 'Por artigo, por tipo ou por catálogo inteiro, cruzados com o perfil do cliente: 1.ª compra, frequente, premium. Sem negociar uma a uma.' },
  { t: 'Carteira de clientes', d: 'Os pintores que já compraram, classificados, com o histórico de condições.' },
  { t: 'Convites a pintores', d: 'Convidar por email um pintor que ainda não está na plataforma — e ficar como o fornecedor que o trouxe.' },
  { t: 'Código de adesão', d: 'Cada pintor que ganhe uma obra com o seu código dá-lhe uma comissão, e desconta a comissão dele.' },
  { t: 'Zonas de cobertura', d: 'Os concelhos onde a equipa faz levantamentos; as vagas chegam só de lá.' },
  { t: 'Comissões de levantamento', d: 'Uma percentagem do valor adjudicado por cada obra que a sua visita ajudou a fechar, com resgate na plataforma.' },
];

export default function Page() {
  const c = CONTEUDO_DE_PERFIL.fornecedor;
  return (
    <PaginaDePerfil
      eyebrow="Fornecedores de tintas"
      titulo="Venda mais. E venda acertado."
      intro={intro}
      demo={DEMO_DE_PERFIL.fornecedor}
      destaques={[
        'Chegar ao pintor antes de a obra estar decidida',
        'O produto certo para aquela fachada, dentro do orçamento',
        'Reconhecimento: avaliações, carteira, comissões',
      ]}
      beneficios={c.beneficios}
      nota="Para o vendedor, tudo é sem custo — e cada levantamento que ajude a fechar uma obra paga comissão. A empresa subscreve apenas a presença no catálogo, que põe os seus produtos à frente de quem orçamenta pintura todos os dias; as condições confirmam-se na área de fornecedor."
      ctaHref={toOrg('fornecedor')}
      ctaTexto={c.ctaTexto}
      ctaNota={c.ctaNota}
    >
      {/* OS TRÊS MOMENTOS — antes, durante e depois da obra. */}
      <section className="bg-tinta-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-[13px] font-semibold text-lima">Onde o vendedor hoje não chega</p>
          <h2 className="mt-3 max-w-3xl text-[34px] leading-tight font-extrabold">
            O pintor entra na loja com a lista feita. Aqui, o vendedor chega antes.
          </h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {momentos.map((m) => (
              <li key={m.n} className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-white/5 p-7">
                <span className="text-[34px] font-extrabold leading-none text-lima">{m.n}</span>
                <span className="text-[20px] font-bold leading-tight">{m.t}</span>
                <span className="text-[15px] leading-relaxed text-tinta-200">{m.d}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* A FICHA TÉCNICA, APLICADA */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="eyebrow">A ficha técnica, aplicada</p>
          <h2 className="mt-3 text-[34px] leading-tight font-extrabold text-tinta-900">
            Ninguém lê a ficha técnica no balcão. Aqui ela faz contas.
          </h2>
          <p className="mt-3 text-[17px] leading-relaxed text-slate-600">
            Os dados que interessam de cada produto ficam no catálogo uma vez — e aplicam-se sozinhos a cada obra,
            no orçamento do pintor. Vender acertado deixa de depender de quem está ao balcão.
          </p>
        </div>
        <dl className="flex flex-col gap-3">
          {ficha.map(([k, v]) => (
            <div key={k} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
              <dt className="w-40 flex-none text-[17px] font-bold text-tinta-900">{k}</dt>
              <dd className="text-[15px] leading-relaxed text-slate-600">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* AS FERRAMENTAS DO FORNECEDOR */}
      <section className="border-t border-slate-200 bg-paper py-20">
        <div className="mx-auto max-w-6xl px-4">
          <p className="eyebrow">Para a empresa e para a equipa comercial</p>
          <h2 className="mt-3 max-w-3xl text-[34px] leading-tight font-extrabold text-tinta-900">
            Condições que se aplicam sozinhas, e um canal de receita que não existia.
          </h2>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ferramentas.map((f) => (
              <li key={f.t} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-6">
                <span className="text-[17px] font-bold text-tinta-900">{f.t}</span>
                <span className="text-[15px] leading-relaxed text-slate-600">{f.d}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PaginaDePerfil>
  );
}
