import Link from 'next/link';
import { appealView } from '@/lib/strikes';
import { getUser } from '@/lib/supabase/server';
import { ReviewForm } from './ReviewForm';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';

// Pedido de revisão do segundo aviso por tentativas de partilhar contactos (src/domain/strikes.ts).
export default async function ReviewPage() {
  const { supabase, user } = await getUser();
  const v = await appealView(supabase, user!.id);
  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/app" className="text-sm text-slate-600 hover:underline">
        ← Início
      </Link>
      <h1 className="text-2xl font-semibold">Revisão do segundo aviso</h1>

      {v.strikes < 2 && <p className={`${card} text-sm`}>Não há nenhum segundo aviso. O pedido de revisão só existe nesse caso.</p>}

      {v.second && (
        <section className={card}>
          <h2 className="font-semibold">O que foi recusado</h2>
          <p className="mt-1 text-xs text-slate-500">{new Date(v.second.created_at).toLocaleString('pt-PT')}</p>
          <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm">{v.second.texto}</p>
          <p className="mt-3 text-sm text-slate-600">
            Este foi o segundo aviso por tentar partilhar contactos ou contornar a plataforma. Se foi um engano, pode pedir uma revisão,
            uma única vez. Se aceite, a conta volta a um aviso; se recusado, mantém-se o último aviso e uma nova tentativa bloqueia a
            conta de forma permanente.
          </p>
        </section>
      )}

      {v.appeal?.estado === 'pendente' && <p className={`${card} text-sm`}>Pedido enviado. A equipa da plataforma responde por email.</p>}
      {v.appeal && v.appeal.estado !== 'pendente' && (
        <section className={card}>
          <h2 className="font-semibold">Pedido {v.appeal.estado === 'aceite' ? 'aceite' : 'recusado'}</h2>
          {v.appeal.decisao && <p className="mt-2 text-sm">{v.appeal.decisao}</p>}
          <p className="mt-2 text-sm text-slate-600">
            {v.appeal.estado === 'aceite' ? 'A conta voltou a um aviso.' : 'Mantém-se o último aviso: uma nova tentativa bloqueia a conta.'}
          </p>
        </section>
      )}
      {v.eligible && (
        <section className={card}>
          <ReviewForm />
        </section>
      )}
    </div>
  );
}
