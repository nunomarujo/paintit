import { SemEmpresa } from '@/components/vendas/SemEmpresa';
import { pertencaDoFornecedor } from '@/lib/fornecedor';
import { quandoCurto } from '@/domain/contagem';
import { formatEuros } from '@/domain/money';
import { referenciaDoLevantamento } from '@/domain/referencias';
import { getUser } from '@/lib/supabase/server';
import { redemptionAmounts } from '@/domain/referral';
import { DadosDePagamento, EnviarRecibo, PedirResgate, type DadosIniciais } from './Forms';

/**
 * Comissões pessoais — o que os levantamentos desta pessoa renderam.
 *
 * Privacidade entre pessoa e empresa (decisão do promotor, 01/11/2026): o responsável não vê as comissões
 * pessoais dos vendedores. Desde 05/11/2026 a comissão é mesmo da pessoa: o pagamento tem dono
 * (`survey_payouts.vendedor_user_id`), só ela o vê, e resgata-o com o seu recibo — a empresa não vê nem
 * resgata nada daqui.
 *
 * A comissão de adesão, que é da empresa, vive do outro lado, em Vendas.
 */
export default async function ComissoesPessoaisPage() {
  const { supabase, user } = await getUser();

  const pertenca = await pertencaDoFornecedor(supabase, user!);
  // «Ainda não pertenço a nenhuma empresa» e «fui convidado e não aceitei» não são erros: são
  // estados por resolver, cada um com a sua ação. Antes, isto era um 404 (01/11/2026).
  if (pertenca.tipo === 'sem_empresa') return <SemEmpresa convites={pertenca.convites} />;

  // As comissões desta pessoa — e só essas (a base também só lhe mostra as suas).
  const [{ data: pagamentos }, { data: dados }, { data: resgates }] = await Promise.all([
    supabase
      .from('survey_payouts')
      .select('id, amount_cents, estado, created_at, request_survey_id, redemption_id')
      .eq('vendedor_user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase.from('avaliador_payout_details').select('*').eq('user_id', user!.id).maybeSingle(),
    supabase.from('survey_redemptions').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10),
  ]);
  const meusIds = (pagamentos ?? []).map((p) => p.request_survey_id);
  const emCurso = (resgates ?? []).find((r) => r.estado === 'pedido' || r.estado === 'fatura_recebida') ?? null;
  const fechados = (resgates ?? []).filter((r) => r.estado === 'paga' || r.estado === 'anulado');

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

      <section aria-labelledby="resgate" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 id="resgate" className="text-[20px] font-semibold text-slate-900">
          Resgatar
        </h2>
        {emCurso ? (
          <div className="mt-2 space-y-3">
            <p className="max-w-[60ch] text-[17px] text-slate-700">
              Comissão {formatEuros(emCurso.comissao_cents)}
              {emCurso.iva_cents > 0 ? ` + IVA ${formatEuros(emCurso.iva_cents)}` : ' (sem IVA)'}
              {emCurso.retencao_cents > 0 ? ` − retenção ${formatEuros(emCurso.retencao_cents)} (${emCurso.retencao_bps / 100}%)` : ''} →{' '}
              <strong className="tabular-nums">a receber {formatEuros(emCurso.liquido_cents)}</strong> em {emCurso.iban}.
            </p>
            {emCurso.estado === 'pedido' ? (
              <>
                <p className="max-w-[60ch] text-[15px] text-slate-600">
                  Emitir no Portal das Finanças {emCurso.documento === 'recibo_verde' ? 'uma fatura-recibo' : 'um ato isolado'} em nome de Relevante
                  Planeta, Lda, no valor de {formatEuros(emCurso.comissao_cents)}
                  {emCurso.iva_cents > 0 ? ` mais ${formatEuros(emCurso.iva_cents)} de IVA` : ''}
                  {emCurso.retencao_cents > 0 ? `, com retenção de ${emCurso.retencao_bps / 100}%` : ''}, e enviá-lo aqui.
                </p>
                <EnviarRecibo resgateId={emCurso.id} />
              </>
            ) : (
              <p className="text-[17px] text-slate-700">Recibo {emCurso.invoice_numero} recebido. A plataforma paga por transferência.</p>
            )}
          </div>
        ) : disponivel <= 0 ? (
          <p className="mt-2 max-w-[54ch] text-[17px] text-slate-600">Sem saldo por resgatar.</p>
        ) : !dados ? (
          <p className="mt-2 max-w-[54ch] text-[17px] text-amber-800">Para resgatar, preencha primeiro os dados para receber, abaixo.</p>
        ) : !dados.regime_validado ? (
          <p className="mt-2 max-w-[54ch] text-[17px] text-amber-800">Os dados para receber estão a ser validados pela plataforma. O resgate abre logo a seguir.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {(() => {
              const v = redemptionAmounts(disponivel, dados.cobra_iva, dados.retencao_bps);
              return (
                <p className="max-w-[60ch] text-[17px] text-slate-700">
                  Saldo {formatEuros(disponivel)}
                  {v.iva > 0 ? ` + IVA ${formatEuros(v.iva)}` : ''}
                  {v.retencao > 0 ? ` − retenção ${formatEuros(v.retencao)}` : ''} → a receber {formatEuros(v.liquido)}.
                </p>
              );
            })()}
            <PedirResgate valor={formatEuros(disponivel)} />
          </div>
        )}
        {fechados.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-200 text-[15px]">
            {fechados.map((r) => (
              <li key={r.id} className="flex justify-between gap-3 py-2">
                <span className="text-slate-700">{r.estado === 'paga' ? `Pago${r.referencia_pagamento ? ` · ${r.referencia_pagamento}` : ''}` : 'Anulado'}</span>
                <span className="tabular-nums text-slate-900">{formatEuros(r.liquido_cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="dados" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 id="dados" className="text-[20px] font-semibold text-slate-900">
          Dados para receber
        </h2>
        <p className="mt-1 max-w-[54ch] text-[15px] text-slate-600">
          {dados
            ? dados.regime_validado
              ? `Validados pela plataforma${dados.retencao_bps ? ` · retenção ${dados.retencao_bps / 100}%` : ''}. Alterar o NIF, o documento ou o regime volta a pedir validação.`
              : 'Por validar pela plataforma.'
            : 'Em nome próprio: a empresa onde trabalha não vê estes dados nem as comissões.'}
        </p>
        <div className="mt-4">
          <DadosDePagamento
            inicial={
              dados
                ? ({
                    nif: dados.nif,
                    titular: dados.titular,
                    iban: dados.iban,
                    documento: dados.documento,
                    cobraIva: dados.cobra_iva,
                    isencao: dados.isencao_iva ?? '',
                    retencao: dados.declaracao_retencao,
                  } satisfies DadosIniciais)
                : null
            }
          />
        </div>
      </section>

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
