import Link from 'next/link';
import { createOrganization } from '@/app/app/actions';
import { ACCOUNT_PROFILE_LABELS, ORG_KINDS, accountProfile, allowedOrgKinds, type OrgKind } from '@/domain/organization';
import { managedAdministradoras } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';
import { OrgForm } from './OrgForm';

export default async function NewOrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; gerida_por?: string; perfil?: string }>;
}) {
  const { tipo, gerida_por, perfil } = await searchParams;
  const { supabase, user } = await getUser();

  const administradoras = await managedAdministradoras(supabase, user!.id);
  const { data: mine } = await supabase.from('org_members').select('organizations(kind)').eq('user_id', user!.id);
  const existing = (mine ?? []).map((m) => (m.organizations as { kind: OrgKind } | null)?.kind).filter((k): k is OrgKind => Boolean(k));
  const allowed = allowedOrgKinds(existing);
  const kinds = perfil === 'cliente' && existing.length === 0 ? allowed.filter((k) => accountProfile(k) === 'cliente') : allowed;

  const initialKind = (ORG_KINDS as readonly string[]).includes(tipo ?? '') && kinds.includes(tipo as OrgKind) ? (tipo as OrgKind) : undefined;

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
      {existing[0] && (
        <p className="mt-3 rounded-xl bg-tinta-50 p-3 text-sm">
          Esta conta é de <strong>{ACCOUNT_PROFILE_LABELS[accountProfile(existing[0]!)].toLowerCase()}</strong>. Cada conta tem um
          só perfil: para atuar também como {accountProfile(existing[0]!) === 'cliente' ? 'pintor ou fornecedor' : 'outro perfil'}, crie
          outra conta com outro email.
        </p>
      )}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <OrgForm
          kinds={kinds}
          action={createOrganization}
          administradoras={administradoras}
          initialKind={initialKind}
          initialGeridaPor={gerida_por}
        />
      </div>
    </div>
  );
}
