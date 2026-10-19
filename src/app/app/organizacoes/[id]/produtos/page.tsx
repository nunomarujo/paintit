import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setProductActive } from '@/app/app/catalogo/actions';
import { ProductCard } from '@/components/ProductCard';
import { canManage, myRole } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';
import { ProductForm } from './ProductForm';

export default async function SupplierProductsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const { data: org } = await supabase.from('organizations').select('id, nome, kind, gerida_por').eq('id', id).maybeSingle();
  if (!org || org.kind !== 'fornecedor') notFound();
  const manager = canManage(await myRole(supabase, user!.id, org));
  const { data: products } = await supabase.from('products').select('*').eq('org_id', id).order('marca').order('nome');

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/app/organizacoes/${id}`} className="text-sm text-slate-600 hover:underline">
          ← {org.nome}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Catálogo de produtos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Os pintores veem os produtos ativos ao orçamentar. Um produto não se apaga, porque pode estar numa proposta antiga:
          desative-o.
        </p>
      </div>
      {manager && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <ProductForm orgId={id} />
        </section>
      )}
      <ul className="grid gap-4 sm:grid-cols-2">
        {(products ?? []).map((p) => (
          <li key={p.id}>
            <ProductCard p={p}>
              {manager && (
                <form action={setProductActive.bind(null, id, p.id, !p.ativo)} className="mt-3">
                  <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                    {p.ativo ? 'Desativar' : 'Reativar'}
                  </button>
                </form>
              )}
            </ProductCard>
          </li>
        ))}
      </ul>
    </div>
  );
}
