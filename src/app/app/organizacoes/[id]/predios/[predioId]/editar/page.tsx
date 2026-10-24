import Link from 'next/link';
import { notFound } from 'next/navigation';
import { updateBuildingIdentity } from '@/app/app/actions';
import { canManage, myRole } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';
import { BuildingForm } from '../../novo/BuildingForm';
import { Characteristics } from './Characteristics';

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
      <h1 className="mt-3 text-2xl font-semibold">{building.nome_interno}</h1>
      <p className="mt-1 text-sm text-slate-600">Ficha do prédio. As características gravam-se à medida que escreve.</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <Characteristics orgId={org.id} buildingId={building.id} initial={building} />
      </div>

      {/* A morada fica no formulário com gravação explícita: é validada contra o código postal real, e
          não se pode gravar a meio de ser escrita (ver saveBuildingCharacteristic). */}
      <details className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <summary className="cursor-pointer font-semibold">Identificação e morada</summary>
        <p className="mt-1 text-sm text-slate-600">
          Estes dados são confirmados contra o código postal, por isso guardam-se de uma vez, com o botão.
        </p>
        <div className="mt-4">
          <BuildingForm
            action={updateBuildingIdentity.bind(null, org.id, building.id)}
            defaultKind={building.tipo}
            initial={building}
            semCaracteristicas
          />
        </div>
      </details>
    </div>
  );
}
