import Link from 'next/link';
import { notFound } from 'next/navigation';
import { updateOrganization } from '@/app/app/actions';
import { canManage, myRole } from '@/lib/access';
import { managedAdministradoras } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';
import { OrgForm } from '../../nova/OrgForm';

export default async function EditOrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const { data: org } = await supabase.from('organizations').select('*').eq('id', id).maybeSingle();
  if (!org || !canManage(await myRole(supabase, user!.id, org))) notFound();
  const administradoras = org.kind === 'condominio' ? await managedAdministradoras(supabase, user!.id) : [];

  return (
    <div className="max-w-2xl">
      <Link href={`/app/organizacoes/${org.id}`} className="text-sm text-slate-600 hover:underline">
        ← {org.nome}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Editar dados</h1>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <OrgForm action={updateOrganization.bind(null, org.id)} administradoras={administradoras} initial={org} />
      </div>
    </div>
  );
}
