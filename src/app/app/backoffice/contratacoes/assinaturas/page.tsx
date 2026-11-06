import Link from 'next/link';
import { RESULTADO_ROTULO, pedeAviso, poderesDoPayload } from '@/domain/poderes';
import { getUser } from '@/lib/supabase/server';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
const pt = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

export default async function SignaturesPage() {
  const { supabase } = await getUser();
  const [{ data: unverified }, { data: assinadas }] = await Promise.all([
    supabase
      .from('engagement_events')
      .select('id, engagement_id, kind, payload, at')
      .eq('payload->>metodo', 'cmd_pdf')
      .eq('payload->>cadeiaConfiavel', 'false')
      .order('at', { ascending: false }),
    // Poderes de representação (05/11/2026): o resultado de cada assinatura em PDF, as mais recentes primeiro.
    supabase
      .from('engagement_events')
      .select('id, engagement_id, kind, payload, at')
      .in('kind', ['cliente_assinou', 'pintor_assinou'])
      .eq('payload->>metodo', 'cmd_pdf')
      .order('at', { ascending: false })
      .limit(50),
  ]);
  return (
    <div className="space-y-6">
      <section className={card}>
        <h2 className="font-semibold">Assinaturas com certificado a conferir</h2>
        <p className="mt-1 text-[17px] text-slate-600">
          A assinatura é válida, mas o certificado não encadeou numa entidade «Cartão de Cidadão» conhecida. Abra o PDF e confirme o certificado na aplicação Autenticação.gov ou no validador da UE.
        </p>
        {(unverified ?? []).length === 0 ? (
          <p className="mt-3 text-[17px] text-slate-600">Nenhuma.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-[17px]">
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

      <section className={card}>
        <h2 className="font-semibold">Poderes de quem assinou</h2>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          O nome de cada certificado comparado com a certidão permanente, a ata de nomeação ou o titular da conta. É uma comparação só pelo
          nome: um «confere» é um indício, não uma prova. As leituras registam-se em Entidades › Poderes de representação.
        </p>
        {(assinadas ?? []).length === 0 ? (
          <p className="mt-3 text-[17px] text-slate-600">Ainda nenhuma assinatura em PDF.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-[17px]">
            {(assinadas ?? []).map((v) => {
              const p = poderesDoPayload(v.payload);
              return (
                <li key={v.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span>
                      <Link href={`/app/contratacoes/${v.engagement_id}`} className="text-tinta-700 hover:underline">
                        {v.engagement_id.slice(0, 8).toUpperCase()}
                      </Link>{' '}
                      · {v.kind === 'cliente_assinou' ? 'cliente' : 'pintor'} · {(v.payload as { signatario?: string }).signatario ?? 'signatário'}
                    </span>
                    <span className="text-slate-500">{pt(v.at)}</span>
                  </div>
                  {p ? (
                    <p className={pedeAviso(p.resultado) ? 'mt-1 text-amber-800' : 'mt-1 text-slate-600'}>
                      <span className="font-semibold">{RESULTADO_ROTULO[p.resultado]}.</span> {pedeAviso(p.resultado) ? p.texto : ''}
                    </p>
                  ) : (
                    <p className="mt-1 text-slate-500">Sem resultado: assinada antes de 05/11/2026, ou sem leitura possível nesse momento.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
