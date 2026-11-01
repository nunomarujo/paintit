import { notFound } from 'next/navigation';
import { Voltar } from '@/components/Voltar';
import { loadReferences } from '@/lib/reference';
import { contextoDoCatalogo } from '../dados';
import { ProductForm } from '../ProductForm';

/**
 * Acrescentar produto — um ecrã, e não um formulário permanentemente aberto no topo do catálogo.
 *
 * Era a terceira coisa da página de produtos, sempre expandida: quem ia ver um preço rolava por ela
 * todas as vezes. Um formulário de criação abre quando se quer criar (01/11/2026).
 */
export default async function NovoProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, manager, catalogo } = await contextoDoCatalogo(id);
  if (!manager || !catalogo) notFound();

  const referencias = (await loadReferences(supabase)).map((r) => ({ id: r.id, label: `${r.marca} ${r.nome}` }));

  return (
    <div className="space-y-6">
      <div>
        <Voltar href={`/app/organizacoes/${id}/produtos`}>Produtos e preços</Voltar>
        <h1 className="mt-3 text-[34px] font-bold leading-[1.15] tracking-[-0.025em] text-slate-900">
          Acrescentar produto
        </h1>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Fica visível aos pintores assim que for criado. Um produto não se apaga — pode estar numa proposta
          antiga; desativa-se.
        </p>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <ProductForm orgId={id} references={referencias} />
      </section>
    </div>
  );
}
