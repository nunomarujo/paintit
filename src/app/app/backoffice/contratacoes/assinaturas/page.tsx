import Link from 'next/link';
import { getUser } from '@/lib/supabase/server';

const card = 'rounded-2xl border border-slate-200 bg-white p-6';

export default async function SignaturesPage() {
  const { supabase } = await getUser();
  const { data: unverified } = await supabase
    .from('engagement_events')
    .select('id, engagement_id, kind, payload, at')
    .eq('payload->>metodo', 'cmd_pdf')
    .eq('payload->>cadeiaConfiavel', 'false')
    .order('at', { ascending: false });
  return (
    <section className={card}>
      <h2 className="font-semibold">Assinaturas com certificado a conferir</h2>
      <p className="mt-1 text-sm text-slate-600">
        A assinatura é válida, mas o certificado não encadeou numa entidade «Cartão de Cidadão» conhecida. Abra o PDF e confirme o certificado na aplicação Autenticação.gov ou no validador da UE.
      </p>
      {(unverified ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">Nenhuma.</p>
      ) : (
        <ul className="mt-3 space-y-1 text-sm">
          {(unverified ?? []).map((v) => (
            <li key={v.id}>
              <Link href={`/app/contratacoes/${v.engagement_id}`} className="text-tinta-700 hover:underline">
                {v.engagement_id.slice(0, 8).toUpperCase()}
              </Link>{' '}
              · {(v.payload as { signatario?: string }).signatario ?? 'signatário'} · {v.at.slice(0, 10).split('-').reverse().join('/')}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
