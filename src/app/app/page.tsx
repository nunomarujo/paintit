import Link from 'next/link';
import { acceptInvitation } from '@/app/app/actions';
import { MEMBER_ROLE_LABELS, ORG_KIND_LABELS } from '@/domain/organization';
import { getUser } from '@/lib/supabase/server';

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ convite?: string }> }) {
  const { convite } = await searchParams;
  const { supabase, user } = await getUser();
  const email = (user!.email ?? '').toLowerCase();

  const [{ data: orgs }, { data: invites }] = await Promise.all([
    supabase.from('organizations').select('id, kind, nome, localidade, gerida_por').order('nome'),
    // A política só devolve convites dirigidos ao email desta conta (ou da entidade, ao proprietário).
    supabase
      .from('org_invitations')
      .select('id, role, expires_at, org_id')
      .eq('email', email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString()),
  ]);

  // O convidado ainda não vê a organização: mostra-se só o papel e a data.
  return (
    <div className="space-y-6">
      {convite === 'invalido' && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">
          Esse convite já não é válido. Peça um novo a quem o enviou.
        </p>
      )}

      {invites && invites.length > 0 && (
        <section className="rounded-2xl border border-tinta-100 bg-tinta-50 p-6">
          <h2 className="font-semibold">Tem {invites.length === 1 ? 'um convite' : `${invites.length} convites`} para se juntar a uma equipa</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Papel: <strong>{MEMBER_ROLE_LABELS[i.role].label}</strong> · válido até{' '}
                  {i.expires_at.slice(0, 10).split('-').reverse().join('/')}
                </span>
                <form action={acceptInvitation.bind(null, i.id)}>
                  <button type="submit" className="rounded-lg bg-tinta-600 px-4 py-1.5 font-semibold text-white hover:bg-tinta-700">
                    Aceitar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">As suas entidades</h1>
        <Link
          href="/app/organizacoes/nova"
          className="rounded-lg bg-tinta-600 px-4 py-2 text-sm font-semibold text-white hover:bg-tinta-700"
        >
          Adicionar entidade
        </Link>
      </div>

      {!orgs || orgs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold">Comece por registar a sua entidade</h2>
          <p className="mt-2 text-sm text-slate-600">
            Um condomínio, uma empresa de administração, um particular, um pintor ou um fornecedor. Os dados fiscais
            servem para o contrato e nunca são mostrados à outra parte antes da apresentação.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {orgs.map((o) => (
            <li key={o.id}>
              <Link href={`/app/organizacoes/${o.id}`} className="flex flex-wrap justify-between gap-2 p-4 hover:bg-slate-50">
                <span>
                  <span className="font-semibold">{o.nome}</span>
                  <span className="block text-sm text-slate-600">
                    {ORG_KIND_LABELS[o.kind]}
                    {o.gerida_por ? ' · gerido por uma administradora' : ''}
                  </span>
                </span>
                <span className="text-sm text-slate-500">{o.localidade ?? ''}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
