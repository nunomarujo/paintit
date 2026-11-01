import { notFound } from 'next/navigation';
import { updateOrganization } from '@/app/app/actions';
import { canManage, myRole } from '@/lib/access';
import { managedAdministradoras } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';
import { OrgForm } from '../../nova/OrgForm';
import { Voltar } from '@/components/Voltar';

export default async function EditOrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const { data: org } = await supabase.from('organizations').select('*').eq('id', id).maybeSingle();
  if (!org || !canManage(await myRole(supabase, user!.id, org))) notFound();
  const administradoras = org.kind === 'condominio' ? await managedAdministradoras(supabase, user!.id) : [];

  return (
    <div>
      <Voltar href={`/app/organizacoes/${org.id}`}>{org.nome}</Voltar>
      <h1 className="mt-3 text-[26px] leading-tight font-semibold">Editar dados</h1>
      <div className="mt-5">
        <OrgForm action={updateOrganization.bind(null, org.id)} administradoras={administradoras} initial={org} />
      </div>
    </div>
  );
}
