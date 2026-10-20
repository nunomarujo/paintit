import { loadReferences } from '@/lib/reference';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createRequest } from '@/app/app/pedidos/actions';
import { RequestForm } from '@/app/app/pedidos/RequestForm';
import { getUser } from '@/lib/supabase/server';

export default async function NewRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ predio?: string }>;
}) {
  const { id } = await params;
  const { predio } = await searchParams;
  const { supabase } = await getUser();
  const [{ data: org }, { data: buildings }] = await Promise.all([
    supabase.from('organizations').select('id, nome, kind').eq('id', id).maybeSingle(),
    supabase.from('buildings').select('id, nome_interno').eq('org_id', id).order('nome_interno'),
  ]);
  if (!org || (org.kind !== 'condominio' && org.kind !== 'particular')) notFound();

  const list = buildings ?? [];
  // O prédio vindo da ficha fica pré-selecionado (primeiro da lista).
  const ordered = [...list.filter((b) => b.id === predio), ...list.filter((b) => b.id !== predio)];

  return (
    <div className="max-w-2xl">
      <Link href={`/app/organizacoes/${org.id}`} className="text-sm text-slate-600 hover:underline">
        ← {org.nome}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Novo pedido de orçamento</h1>
      <p className="mt-2 text-sm text-slate-600">
        Fica em rascunho até o publicar. Depois de criar, acrescenta as superfícies e as áreas.
      </p>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        {ordered.length === 0 ? (
          <p className="text-sm">
            Registe primeiro o prédio.{' '}
            <Link href={`/app/organizacoes/${org.id}/predios/novo`} className="text-tinta-700 hover:underline">
              Adicionar prédio
            </Link>
          </p>
        ) : (
          <RequestForm action={createRequest.bind(null, org.id)} buildings={ordered} references={await loadReferences(supabase)} />
        )}
      </div>
    </div>
  );
}
