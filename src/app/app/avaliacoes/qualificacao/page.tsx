import { SemEmpresa } from '@/components/vendas/SemEmpresa';
import { pertencaDoFornecedor } from '@/lib/fornecedor';
import { quandoCurto } from '@/domain/contagem';
import { referenciaDoLevantamento } from '@/domain/referencias';
import { getUser } from '@/lib/supabase/server';

/**
 * Qualificação — como correram os levantamentos desta pessoa, nas palavras de quem os recebeu.
 *
 * É da pessoa, como as comissões: a avaliação de um levantamento é do avaliador que o fez, e o
 * responsável da empresa não a vê. Serve para a própria perceber onde está, não para ser classificada por
 * terceiros dentro da empresa.
 */
export default async function QualificacaoPage() {
  const { supabase, user } = await getUser();

  const pertenca = await pertencaDoFornecedor(supabase, user!);
  // «Ainda não pertenço a nenhuma empresa» e «fui convidado e não aceitei» não são erros: são
  // estados por resolver, cada um com a sua ação. Antes, isto era um 404 (01/11/2026).
  if (pertenca.tipo === 'sem_empresa') return <SemEmpresa convites={pertenca.convites} />;

  const { data: avaliacoes } = await supabase
    .from('survey_reviews')
    .select('id, nota, comentario, created_at, request_survey_id')
    .eq('vendedor_user_id', user!.id)
    .order('created_at', { ascending: false });

  const ids = (avaliacoes ?? []).map((a) => a.request_survey_id);
  const { data: levantamentos } = ids.length
    ? await supabase.from('request_surveys').select('id, numero').in('id', ids)
    : { data: [] };
  const numeroDe = new Map((levantamentos ?? []).map((s) => [s.id, s.numero]));

  const n = (avaliacoes ?? []).length;
  const media = n ? (avaliacoes ?? []).reduce((s, a) => s + a.nota, 0) / n : null;
  const agora = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold">Qualificação</h1>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Como correram os levantamentos que fez, nas palavras de quem os recebeu. Só a própria pessoa vê isto.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="text-[17px] text-slate-600">Média das avaliações</p>
        <p className="mt-1 text-[34px] font-semibold leading-tight tabular-nums text-slate-900">
          {media === null ? '—' : `${media.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} / 5`}
        </p>
        <p className="mt-1 text-[15px] text-slate-600">
          {n === 0 ? 'Ainda sem avaliações.' : `${n} ${n === 1 ? 'avaliação' : 'avaliações'}.`}
        </p>
      </section>

      <section aria-labelledby="comentarios">
        <h2 id="comentarios" className="text-[20px] font-semibold text-slate-900">
          O que disseram
        </h2>
        {n === 0 ? (
          <p className="mt-2 max-w-[54ch] text-[17px] text-slate-600">
            A avaliação chega depois de um levantamento entregue. Cumprir os prazos de contacto e de visita é a
            parte que mais pesa.
          </p>
        ) : (
          <ul className="mt-2">
            {(avaliacoes ?? []).map((a) => {
              const q = quandoCurto(agora, new Date(a.created_at));
              const ref = numeroDe.get(a.request_survey_id);
              return (
                <li key={a.id} className="border-t border-slate-200 px-2 py-3 first:border-t-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold text-slate-900">
                      {ref ? referenciaDoLevantamento(ref) : '—'} · {a.nota} / 5
                    </span>
                    <span className="shrink-0 text-[15px] text-slate-600">
                      {q.dia} · {q.hora}
                    </span>
                  </div>
                  {a.comentario && <p className="mt-1 max-w-[54ch] text-[17px] text-slate-700">{a.comentario}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
