import { getUser } from '@/lib/supabase/server';
import { AppealForm } from '../AppealForm';
import { emailsOf } from './data';

const card = 'rounded-2xl border border-slate-200 bg-white p-6';

export default async function AppealsPage() {
  const { supabase } = await getUser();
  const { data: appeals } = await supabase.from('strike_appeals').select('id, user_id, violation_id, texto, created_at').eq('estado', 'pendente').order('created_at');
  const { data: violations } = (appeals ?? []).length
    ? await supabase.from('contact_violations').select('id, onde, motivos, texto').in('id', (appeals ?? []).map((a) => a.violation_id))
    : { data: [] };
  const emailOf = await emailsOf((appeals ?? []).map((a) => a.user_id));
  return (
    <section className={card}>
      <h2 className="font-semibold">Pedidos de revisão do segundo aviso</h2>
      <p className="mt-1 text-sm text-slate-600">
        Aceitar anula o 2.º aviso (a conta volta a 1 aviso). Recusar mantém o último aviso: uma nova tentativa bloqueia a conta. A pessoa recebe a decisão por email.
      </p>
      {(appeals ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">Sem pedidos por decidir.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {(appeals ?? []).map((a) => {
            const second = (violations ?? []).find((v) => v.id === a.violation_id);
            return (
              <li key={a.id} className="py-3">
                <b>{emailOf.get(a.user_id) ?? a.user_id}</b> · {new Date(a.created_at).toLocaleString('pt-PT')}
                <p className="mt-1 whitespace-pre-line rounded bg-slate-50 px-2 py-1">{a.texto}</p>
                {second && (
                  <p className="mt-1 text-xs text-slate-600">
                    Texto do 2.º aviso ({second.onde}, {second.motivos.join(', ')}): <span className="whitespace-pre-line">{second.texto}</span>
                  </p>
                )}
                <AppealForm appealId={a.id} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
