import { getUser } from '@/lib/supabase/server';
import { unblockAccount } from '../../actions';
import { emailsOf } from '../data';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';

export default async function WarningsPage() {
  const { supabase } = await getUser();
  const [{ data: violations }, { data: blockedRows }] = await Promise.all([
    supabase.from('contact_violations').select('id, user_id, onde, motivos, texto, created_at').is('anulada_em', null).order('created_at', { ascending: false }).limit(200),
    supabase.from('blocked_users').select('user_id, blocked_at, motivo'),
  ]);
  const users = [...new Set([...(violations ?? []).map((v) => v.user_id), ...(blockedRows ?? []).map((b) => b.user_id)])];
  const emailOf = await emailsOf(users);
  const blocked = new Set((blockedRows ?? []).map((b) => b.user_id));
  return (
    <section className={card}>
      <h2 className="font-semibold">Contas com avisos ({users.length})</h2>
      <p className="mt-1 text-[17px] text-slate-600">Bloquear impede o email e o NIF das entidades da conta de se registarem de novo. Desbloquear anula os avisos.</p>
      {users.length === 0 ? (
        <p className="mt-3 text-[17px] text-slate-600">Sem tentativas registadas.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 text-[17px]">
          {users.map((uid) => {
            const mine = (violations ?? []).filter((v) => v.user_id === uid);
            return (
              <li key={uid} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <b>{emailOf.get(uid) ?? uid}</b> · {mine.length} {mine.length === 1 ? 'aviso' : 'avisos'}
                    {blocked.has(uid) && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[15px] font-semibold text-red-800">Bloqueada</span>}
                  </span>
                  {blocked.has(uid) && (
                    <form action={unblockAccount.bind(null, uid)}>
                      <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1 text-[17px] font-semibold hover:bg-slate-50">
                        Desbloquear
                      </button>
                    </form>
                  )}
                </div>
                <ul className="mt-1 space-y-1 text-slate-600">
                  {mine.map((v) => (
                    <li key={v.id}>
                      {new Date(v.created_at).toLocaleString('pt-PT')} · {v.onde} · {v.motivos.join(', ')}
                      <span className="block whitespace-pre-line rounded bg-slate-50 px-2 py-1 text-[15px] text-slate-700">{v.texto}</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
