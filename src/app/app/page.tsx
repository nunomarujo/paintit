import Link from 'next/link';
import { acceptInvitation } from '@/app/app/actions';
import { MEMBER_ROLE_LABELS, ORG_KIND_LABELS } from '@/domain/organization';
import { STATUS_LABELS, availableActions } from '@/domain/contracting';
import { loadReplay } from '@/lib/engagements';
import { painterOrgs } from '@/lib/queries';
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

  // Painel: o que espera por esta conta (CLI-01, PIN-01).
  // Só as entidades de que é membro (ou geridas por elas): a equipa da plataforma vê todas, mas não são suas.
  const { data: memberships } = await supabase.from('org_members').select('org_id').eq('user_id', user!.id);
  const direct = new Set((memberships ?? []).map((m) => m.org_id));
  const myOrgIds = new Set((orgs ?? []).filter((o) => direct.has(o.id) || (o.gerida_por && direct.has(o.gerida_por))).map((o) => o.id));
  const [{ data: requests }, { data: engagementRows }, painters] = await Promise.all([
    supabase.from('work_requests').select('id, titulo, status').in('org_id', [...myOrgIds]).in('status', ['rascunho', 'publicado']).order('updated_at', { ascending: false }).limit(10),
    supabase.from('engagements').select('*').order('created_at', { ascending: false }).limit(20),
    painterOrgs(supabase, user!.id),
  ]);
  const ownRequests = requests ?? [];
  const { data: proposalRows } = ownRequests.length
    ? await supabase.from('proposals').select('request_id').in('request_id', ownRequests.map((r) => r.id)).neq('status', 'rascunho')
    : { data: [] };
  const todo = (
    await Promise.all(
      (engagementRows ?? []).map(async (r) => {
        const side = myOrgIds.has(r.client_org_id) ? 'cliente' : myOrgIds.has(r.painter_org_id) ? 'pintor' : null;
        if (!side) return null;
        const e = (await loadReplay(supabase, r)).replay.engagement;
        return availableActions(e, side).length > 0 || ['aguarda_deposito', 'aguarda_fee'].includes(e.status)
          ? { id: r.id, label: STATUS_LABELS[e.status] }
          : null;
      }),
    )
  ).filter((x): x is { id: string; label: string } => x !== null);
  const { count: openListings } = painters.length
    ? await supabase.from('request_listings').select('request_id', { count: 'exact', head: true }).eq('aberto', true)
    : { count: 0 };

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

      {(todo.length > 0 || ownRequests.length > 0 || painters.length > 0) && (
        <section className="grid gap-4 sm:grid-cols-2">
          {todo.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm">
              <h2 className="font-semibold">Contratações a precisar de si</h2>
              <ul className="mt-2 space-y-1">
                {todo.map((t) => (
                  <li key={t.id}>
                    <Link href={`/app/contratacoes/${t.id}`} className="text-tinta-700 hover:underline">
                      {t.id.slice(0, 8).toUpperCase()}
                    </Link>{' '}
                    · {t.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ownRequests.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
              <h2 className="font-semibold">Pedidos em curso</h2>
              <ul className="mt-2 space-y-1">
                {ownRequests.map((r) => {
                  const n = (proposalRows ?? []).filter((p) => p.request_id === r.id).length;
                  return (
                    <li key={r.id} className="flex justify-between gap-2">
                      <Link href={`/app/pedidos/${r.id}`} className="truncate text-tinta-700 hover:underline">
                        {r.titulo}
                      </Link>
                      <span className="shrink-0 text-slate-500">
                        {r.status === 'rascunho' ? 'rascunho' : `${n} proposta${n === 1 ? '' : 's'}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {painters.length > 0 && (
            <Link href="/app/oportunidades" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm hover:bg-slate-50">
              <span className="text-3xl font-semibold text-tinta-700">{openListings ?? 0}</span>
              <span className="mt-1 block text-slate-600">pedidos abertos a propostas</span>
            </Link>
          )}
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
