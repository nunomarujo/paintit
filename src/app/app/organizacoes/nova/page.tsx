import Link from 'next/link';
import { createOrganization } from '@/app/app/actions';
import { ORG_KINDS, type OrgKind } from '@/domain/organization';
import { managedAdministradoras } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';
import { OrgForm } from './OrgForm';

export default async function NewOrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; gerida_por?: string }>;
}) {
  const { tipo, gerida_por } = await searchParams;
  const { supabase, user } = await getUser();

  const administradoras = await managedAdministradoras(supabase, user!.id);

  const initialKind = (ORG_KINDS as readonly string[]).includes(tipo ?? '') ? (tipo as OrgKind) : undefined;

  return (
    <div className="max-w-2xl">
      <Link href="/app" className="text-sm text-slate-600 hover:underline">
        ← As suas entidades
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Nova entidade</h1>
      <p className="mt-2 text-sm text-slate-600">
        Estes dados servem para o contrato e para a verificação da conta. Só são revelados à outra parte depois da
        apresentação.
      </p>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <OrgForm
          action={createOrganization}
          administradoras={administradoras}
          initialKind={initialKind}
          initialGeridaPor={gerida_por}
        />
      </div>
    </div>
  );
}
