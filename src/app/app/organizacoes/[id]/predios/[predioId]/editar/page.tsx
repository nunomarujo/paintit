import Link from 'next/link';
import { notFound } from 'next/navigation';
import { updateBuilding } from '@/app/app/actions';
import { canManage, myRole } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';
import { BuildingForm } from '../../novo/BuildingForm';

export default async function EditBuildingPage({ params }: { params: Promise<{ id: string; predioId: string }> }) {
  const { id, predioId } = await params;
  const { supabase, user } = await getUser();
  const [{ data: org }, { data: building }] = await Promise.all([
    supabase.from('organizations').select('id, nome, gerida_por').eq('id', id).maybeSingle(),
    supabase.from('buildings').select('*').eq('id', predioId).eq('org_id', id).maybeSingle(),
  ]);
  if (!org || !building || !canManage(await myRole(supabase, user!.id, org))) notFound();

  return (
    <div className="max-w-2xl">
      <Link href={`/app/organizacoes/${org.id}`} className="text-sm text-slate-600 hover:underline">
        ← {org.nome}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Editar {building.nome_interno}</h1>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <BuildingForm action={updateBuilding.bind(null, org.id, building.id)} defaultKind={building.tipo} initial={building} />
      </div>
    </div>
  );
}
