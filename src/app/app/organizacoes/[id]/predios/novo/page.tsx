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
    <div className="max-w-2xl">
      <Voltar href={`/app/organizacoes/${org.id}`}>{org.nome}</Voltar>
      <h1 className="mt-3 text-[26px] leading-tight font-semibold">{org.kind === 'particular' ? 'Novo imóvel' : 'Novo prédio'}</h1>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <BuildingForm
          action={createBuilding.bind(null, org.id)}
          defaultKind={org.kind === 'particular' ? 'moradia' : 'edificio_habitacao'}
        />
      </div>
    </div>
  );
}
