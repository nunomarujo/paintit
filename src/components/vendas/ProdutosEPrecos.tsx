import Link from 'next/link';
import { ProductThumb } from '@/components/ProductThumb';
import { PRODUCT_TYPE_LABELS, type ProductType } from '@/domain/catalog';
import { formatEuros } from '@/domain/money';

/**
 * Produtos e preços — Vendas (01/11/2026).
 *
 * O que isto substitui: uma página única onde vinham empilhados a subscrição, um formulário de produto
 * sempre aberto, a lista de produtos, os descontos e a entrega em obra. Era preciso rolar por um formulário
 * para chegar ao catálogo, e a subscrição — que é assunto da empresa, não do catálogo — abria a página.
 *
 * Agora: a subscrição saiu para «Empresa»; o que resta é um percurso comercial em três passos — o que se
 * vende, a que preço, e como chega à obra — em separadores. O formulário de produto abre quando se precisa
 * dele, pelo botão «Adicionar produto», e não ocupa a página.
 *
 * Nada aqui é dito ao cliente final: isto é o que a empresa vende, não o que a plataforma cobra (regra 15).
 */

export type ProdutoNaLista = {
  id: string;
  marca: string;
  nome: string;
  referencia: string | null;
  tipo: ProductType;
  embalagem: string;
  precoCents: number;
  descontoMaximoBps: number | null;
  ativo: boolean;
  fotoPath: string | null;
};

export type AbaDeProdutos = 'produtos' | 'precos' | 'entrega';

const ABAS: { chave: AbaDeProdutos; texto: string }[] = [
  { chave: 'produtos', texto: 'Produtos' },
  { chave: 'precos', texto: 'Preços e descontos' },
  { chave: 'entrega', texto: 'Entrega em obra' },
];

function Cabecalho({ aba, base }: { aba: AbaDeProdutos; base: string }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
      {ABAS.map((a) => (
        <Link
          key={a.chave}
          href={a.chave === 'produtos' ? base : `${base}?ver=${a.chave}`}
          aria-current={aba === a.chave ? 'page' : undefined}
          className={`inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap border-b-2 px-3 text-[17px] ${
            aba === a.chave
              ? 'border-tinta-600 font-semibold text-slate-900'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          {a.texto}
        </Link>
      ))}
    </div>
  );
}

function LinhaDeProduto({ p, base }: { p: ProdutoNaLista; base: string }) {
  return (
    <li className="border-t border-slate-200 first:border-t-0">
      <Link
        href={`${base}/${p.id}`}
        className="group flex min-h-[44px] items-center gap-3 rounded-lg px-2 py-3 hover:bg-tinta-50/70"
      >
        <ProductThumb fotoPath={p.fotoPath} alt="" className="h-11 w-9 shrink-0 rounded-lg object-contain" />

        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-slate-900">
            {p.marca} {p.nome}
          </span>
          <span className="block text-[15px] text-slate-600">
            {p.embalagem} · {PRODUCT_TYPE_LABELS[p.tipo]}
            {p.referencia ? ` · ${p.referencia}` : ''}
          </span>
        </span>

        <span className="hidden w-[7rem] shrink-0 text-right sm:block">
          <span className="block text-[17px] font-medium text-slate-900">{formatEuros(p.precoCents)}</span>
          <span className="block text-[15px] text-slate-600">
            {p.descontoMaximoBps === null ? 'sem desconto' : `até ${(p.descontoMaximoBps / 100).toLocaleString('pt-PT')}%`}
          </span>
        </span>

        {/* Estado em texto, com um ponto: dentro de uma lista o alarme nunca é fundo de cor (regra 13). */}
        <span className="w-[6.5rem] shrink-0 text-right sm:text-left">
          <span className="inline-flex items-center gap-2 text-[15px]">
            <span aria-hidden="true" className={`h-[9px] w-[9px] rounded-full ${p.ativo ? 'bg-tinta-600' : 'bg-slate-400'}`} />
            <span className={p.ativo ? 'text-slate-700' : 'text-slate-600'}>{p.ativo ? 'Ativo' : 'Inativo'}</span>
          </span>
          <span className="block text-[15px] text-slate-600 sm:hidden">{formatEuros(p.precoCents)}</span>
        </span>

        <span
          aria-hidden="true"
          className="hidden h-[38px] w-[5.5rem] shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-[15px] font-medium text-tinta-700 group-hover:border-tinta-600 sm:inline-flex"
        >
          Editar
        </span>
      </Link>
    </li>
  );
}

export function ProdutosEPrecos({
  base,
  aba = 'produtos',
  produtos,
  termo,
  podeGerir,
  semCatalogo,
  precos,
  entrega,
}: {
  /** Raiz da secção, para os separadores e os destinos («/app/vendas/produtos»). */
  base: string;
  aba?: AbaDeProdutos;
  produtos: ProdutoNaLista[];
  termo?: string;
  podeGerir: boolean;
  /** O plano da empresa não inclui catálogo: diz-se uma vez, no topo, e não em cada botão. */
  semCatalogo?: boolean;
  precos?: React.ReactNode;
  entrega?: React.ReactNode;
}) {
  const ativos = produtos.filter((p) => p.ativo).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[34px] font-bold leading-[1.15] tracking-[-0.025em] text-slate-900">Produtos e preços</h1>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          O catálogo e as condições comerciais da empresa. Os pintores veem os produtos ativos ao orçamentar.
        </p>
      </div>

      {semCatalogo && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5">
          <p className="text-[17px] font-semibold text-amber-900">O plano atual não inclui catálogo</p>
          <p className="mt-1 max-w-[54ch] text-[17px] text-amber-900">
            Sem catálogo, os produtos não chegam aos pintores. O plano muda-se em Empresa.
          </p>
          <Link href="/app/vendas/empresa?ver=subscricao" className="btn-secondary mt-4 inline-flex">
            Ver a subscrição
          </Link>
        </section>
      )}

      <Cabecalho aba={aba} base={base} />

      {aba === 'precos' ? (
        precos
      ) : aba === 'entrega' ? (
        entrega
      ) : (
        <section aria-labelledby="catalogo">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <form method="get" action={base} className="min-w-0 flex-1 sm:max-w-sm">
              <label htmlFor="q" className="block text-[15px] font-medium text-slate-700">
                Pesquisar
              </label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={termo ?? ''}
                placeholder="Produto, marca ou referência"
                className="campo mt-1"
              />
            </form>
            {podeGerir && (
              <Link href={`${base}/novo`} className="btn-primary shrink-0">
                Adicionar produto
              </Link>
            )}
          </div>

          <h2 id="catalogo" className="mt-6 text-[20px] font-semibold text-slate-900">
            {produtos.length === 0
              ? 'Sem produtos'
              : `${produtos.length} ${produtos.length === 1 ? 'produto' : 'produtos'}, ${ativos} ${ativos === 1 ? 'ativo' : 'ativos'}`}
          </h2>

          {produtos.length === 0 ? (
            <p className="mt-2 max-w-[54ch] text-[17px] text-slate-600">
              {termo
                ? 'Nenhum produto corresponde à pesquisa.'
                : 'Ainda sem produtos no catálogo. O primeiro produto fica visível aos pintores assim que for criado.'}
            </p>
          ) : (
            <ul className="mt-2">
              {produtos.map((p) => (
                <LinhaDeProduto key={p.id} p={p} base={base} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
