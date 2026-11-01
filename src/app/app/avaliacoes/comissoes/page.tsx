import { SemEmpresa } from '@/components/vendas/SemEmpresa';
import { pertencaDoFornecedor } from '@/lib/fornecedor';
import { quandoCurto } from '@/domain/contagem';
import { formatEuros } from '@/domain/money';
import { referenciaDoLevantamento } from '@/domain/referencias';
import { getUser } from '@/lib/supabase/server';

/**
 * Comissões pessoais — o que os levantamentos desta pessoa renderam.
 *
 * Privacidade entre pessoa e empresa (decisão do promotor, 01/11/2026): o responsável não vê as comissões
 * pessoais dos vendedores. Por isso o que se mostra aqui sai dos levantamentos **feitos por quem está a
 * ver** — a comissão liga-se à pessoa pela tentativa que a gerou, não pela empresa.
 *
 * A comissão de adesão, que é da empresa, vive do outro lado, em Vendas.
 */
export default async function ComissoesPessoaisPage() {
  const { supabase, user } = await getUser();

  const pertenca = await pertencaDoFornecedor(supabase, user!);
  // «Ainda não pertenço a nenhuma empresa» e «fui convidado e não aceitei» não são erros: são
  // estados por resolver, cada um com a sua ação. Antes, isto era um 404 (01/11/2026).
  if (pertenca.tipo === 'sem_empresa') return <SemEmpresa convites={pertenca.convites} />;

  // Os levantamentos desta pessoa — e só esses.
  const { data: tentativas } = await supabase
    .from('survey_attempts')
    .select('survey_id')
    .eq('vendedor_user_id', user!.id)
    .eq('estado', 'concluida');
  const meusIds = (tentativas ?? []).map((t) => t.survey_id);

  const { data: pagamentos } = meusIds.length
    ? await supabase
        .from('survey_payouts')
        .select('id, amount_cents, estado, created_at, request_survey_id, redemption_id')
        .in('request_survey_id', meusIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  const { data: levantamentos } = meusIds.length
    ? await supabase.from('request_surveys').select('id, numero').in('id', meusIds)
    : { data: [] };
  const numeroDe = new Map((levantamentos ?? []).map((s) => [s.id, s.numero]));

  const disponivel = (pagamentos ?? [])
    .filter((p) => p.estado === 'adjudicada' && !p.redemption_id)
    .reduce((n, p) => n + p.amount_cents, 0);
  const pago = (pagamentos ?? []).filter((p) => p.estado === 'paga').reduce((n, p) => n + p.amount_cents, 0);
  const agora = new Date();

  const ESTADO: Record<string, string> = {
    adjudicada: 'Por receber',
    paga: 'Paga',
    sem_efeito: 'Sem efeito',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold">Comissões pessoais</h1>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          O que renderam os levantamentos que fez. São suas: mais ninguém na empresa as vê.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-[17px] text-slate-600">Por receber</p>
          <p className="mt-1 text-[34px] font-semibold leading-tight tabular-nums text-slate-900">{formatEuros(disponivel)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-[17px] text-slate-600">Já pago</p>
          <p className="mt-1 text-[34px] font-semibold leading-tight tabular-nums text-slate-900">{formatEuros(pago)}</p>
        </div>
      </div>

      <section aria-labelledby="movimentos">
        <h2 id="movimentos" className="text-[20px] font-semibold text-slate-900">
          Movimentos
        </h2>
        {(pagamentos ?? []).length === 0 ? (
          <p className="mt-2 max-w-[54ch] text-[17px] text-slate-600">
            Ainda sem comissões. Uma comissão nasce quando a obra de um levantamento seu é adjudicada — seja
            qual for o pintor escolhido.
          </p>
        ) : (
          <ul className="mt-2">
            {(pagamentos ?? []).map((p) => {
              const q = quandoCurto(agora, new Date(p.created_at));
              const n = numeroDe.get(p.request_survey_id);
              return (
                <li
                  key={p.id}
                  className="flex min-h-[44px] items-center justify-between gap-3 border-t border-slate-200 px-2 py-3 first:border-t-0"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-slate-900">{n ? referenciaDoLevantamento(n) : '—'}</span>
                    <span className="block text-[15px] text-slate-600">
                      {ESTADO[p.estado] ?? p.estado} · {q.dia.toLowerCase()}, {q.hora}
                    </span>
                  </span>
                  <span className="shrink-0 text-[17px] font-medium text-slate-900">{formatEuros(p.amount_cents)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
