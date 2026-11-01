import { notFound } from 'next/navigation';
import { setProductActive } from '@/app/app/catalogo/actions';
import { ProductCard } from '@/components/ProductCard';
import { Voltar } from '@/components/Voltar';
import { contextoDoCatalogo } from '../dados';

/** A ficha de um produto do catálogo da empresa, e o interruptor que o mostra ou esconde aos pintores. */
export default async function ProdutoPage({ params }: { params: Promise<{ id: string; productId: string }> }) {
  const { id, productId } = await params;
  const { supabase, manager } = await contextoDoCatalogo(id);

  const { data: p } = await supabase.from('products').select('*').eq('id', productId).eq('org_id', id).maybeSingle();
  if (!p) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Voltar href={`/app/organizacoes/${id}/produtos`}>Produtos e preços</Voltar>
        <h1 className="mt-3 text-[26px] leading-tight font-semibold">
          {p.marca} {p.nome}
        </h1>
        {/* Estado em texto, nunca fundo de cor fora de uma banda (regra 13). */}
        <p className="mt-1 text-[17px] text-slate-600">
          {p.ativo ? 'Visível aos pintores ao orçamentar.' : 'Desativado: não aparece a nenhum pintor.'}
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <ProductCard p={p} />
      </section>

      {manager && (
        <form action={setProductActive.bind(null, id, p.id, !p.ativo)}>
          <button type="submit" className="btn-secondary">
            {p.ativo ? 'Desativar' : 'Reativar'}
          </button>
        </form>
      )}
    </div>
  );
}
