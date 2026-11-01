import { notFound } from 'next/navigation';
import { createBuilding } from '@/app/app/actions';
import { getUser } from '@/lib/supabase/server';
import { BuildingForm } from './BuildingForm';
import { Voltar } from '@/components/Voltar';

export default async function NewBuildingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getUser();
  const { data: org } = await supabase.from('organizations').select('id, nome, kind').eq('id', id).maybeSingle();
  if (!org || (org.kind !== 'condominio' && org.kind !== 'particular')) notFound();

  return (
    <div>
      <Voltar href={`/app/organizacoes/${org.id}`}>{org.nome}</Voltar>
      <h1 className="mt-3 text-[26px] leading-tight font-semibold">{org.kind === 'particular' ? 'Novo imóvel' : 'Novo prédio'}</h1>
      <p className="mt-1 text-[17px] text-slate-600">Regista-se uma vez e serve para todos os pedidos de orçamento.</p>
      <div className="mt-5">
        <BuildingForm action={createBuilding.bind(null, org.id)} defaultKind={org.kind === 'particular' ? 'moradia' : 'edificio_habitacao'} />
      </div>
    </div>
  );
}
