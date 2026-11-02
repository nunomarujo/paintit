import type { Metadata } from 'next';
import { CONTEUDO_DE_PERFIL, DEMO_DE_PERFIL, toOrg } from '@/components/landing/perfis';
import { PaginaDePerfil } from '@/components/landing/PaginaDePerfil';
import { Revelar } from '@/components/landing/Revelar';
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
      foto={{ src: '/img/balcao-loja.webp', width: 1230, height: 848, alt: 'Vendedor ao balcão de uma loja de tintas a mostrar uma ficha técnica a um pintor' }}
      destaquesTitulo="O que muda para o fornecedor de tintas"
      fotoInclui={{ src: '/img/maquina-de-tinta.webp', width: 1376, height: 768, alt: 'Máquina de afinação a deitar corante azul num balde de tinta branca' }}
    >
      {/* OS TRÊS MOMENTOS — antes, durante e depois da obra. Sequência real: a numeração fica. */}
      <Revelar as="section" className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-[28px] bg-tinta-900 px-6 py-14 text-white sm:px-12 sm:py-20">
          <h2 className="max-w-3xl text-[26px] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[34px] lg:text-[44px]">
            O vendedor chega antes da lista de compras.
          </h2>
          <ol className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-3">
            {momentos.map((m) => (
              <li key={m.n} className="flex flex-col gap-2 border-l-4 border-lima pl-5">
                <span className="text-[34px] font-medium leading-none text-lima tabular-nums">{m.n}</span>
                <span className="text-[20px] font-bold leading-tight">{m.t}</span>
                <span className="text-[17px] leading-relaxed text-tinta-200">{m.d}</span>
              </li>
            ))}
          </ol>
        </div>
      </Revelar>

      {/* A FICHA TÉCNICA, APLICADA */}
      <Revelar as="section" className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="text-[26px] font-medium leading-[1.05] tracking-[-0.03em] text-tinta-900 sm:text-[34px] lg:text-[44px]">
            A ficha técnica passa a fazer contas.
          </h2>
          <p className="mt-3 text-[17px] leading-relaxed text-slate-600">
            Os dados que interessam de cada produto ficam no catálogo uma vez — e aplicam-se sozinhos a cada obra,
            no orçamento do pintor. Vender acertado deixa de depender de quem está ao balcão.
          </p>
          <dl className="mt-8 flex flex-col gap-3">
            {ficha.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1 rounded-2xl bg-paper px-5 py-4 sm:flex-row sm:gap-6">
                <dt className="w-44 flex-none text-[17px] font-bold text-tinta-900">{k}</dt>
                <dd className="text-[17px] leading-relaxed text-slate-600">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        {/* Imagem: o volume 3D do prédio que o pintor vê no pedido — a fachada a que a ficha técnica se aplica. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/predio-cor.webp"
          width={928}
          height={1152}
          alt="Volume tridimensional de um prédio, com as fachadas a cores, tal como aparece no pedido de orçamento"
          loading="lazy"
          decoding="async"
          className="aspect-[4/5] h-auto w-full rounded-2xl object-cover"
        />
      </Revelar>

      {/* AS FERRAMENTAS DO FORNECEDOR */}
      <Revelar as="section" className="bg-paper py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="max-w-3xl text-[26px] font-medium leading-[1.05] tracking-[-0.03em] text-tinta-900 sm:text-[34px] lg:text-[44px]">
            Condições automáticas, receita nova.
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ferramentas.map((f) => (
              <li key={f.t} className="flex flex-col gap-1.5 rounded-[24px] bg-white p-6">
                <span className="text-[17px] font-bold text-tinta-900">{f.t}</span>
                <span className="text-[17px] leading-relaxed text-slate-600">{f.d}</span>
              </li>
            ))}
          </ul>
        </div>
      </Revelar>
    </PaginaDePerfil>
  );
}
