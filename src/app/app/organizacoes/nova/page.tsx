import Link from 'next/link';
import { ORG_KINDS, type OrgKind } from '@/domain/organization';
import { getUser } from '@/lib/supabase/server';
import { OrgForm } from './OrgForm';

export default async function NewOrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; gerida_por?: string }>;
}) {
  const { tipo, gerida_por } = await searchParams;
  const { supabase, user } = await getUser();

  // Administradoras que o utilizador pode usar para gerir um condomínio.
  const { data: memberships } = await supabase
    .from('org_members')
    .select('role, organizations!inner(id, nome, kind)')
    .eq('user_id', user!.id)
    .in('role', ['proprietario', 'gestor'])
    .eq('organizations.kind', 'administradora');
  const administradoras = (memberships ?? []).map((m) => ({ id: m.organizations.id, nome: m.organizations.nome }));

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
        <OrgForm administradoras={administradoras} initialKind={initialKind} initialGeridaPor={gerida_por} />
      </div>
    </div>
  );
}
