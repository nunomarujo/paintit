import 'server-only';
import { surveyPayoutAmount, surveyorCommissionBp } from '@/domain/survey';
import type { Cents } from '@/domain/money';
import { adminClient } from './supabase/admin';

/**
 * Os quatro números da fórmula dinâmica (src/domain/survey.ts, surveyorCommissionBp), lidos com
 * privilégios próprios no preciso momento em que a comissão do pintor é confirmada — nunca antes, para
 * contar o histórico mais recente possível (incluindo um pedido de esclarecimento que só se resolveu
 * depois do levantamento).
 */
async function surveyorPerformance(db: NonNullable<ReturnType<typeof adminClient>>, surveyId: string, vendedorOrgId: string, vendedorUserId: string | null) {
  const [{ data: geral }, { data: informacao }, { data: cliente }, { data: esclarecimentos }] = await Promise.all([
    vendedorUserId ? db.from('survey_reviews').select('nota').eq('vendedor_user_id', vendedorUserId) : Promise.resolve({ data: [] as { nota: number }[] }),
    db.from('survey_info_reviews').select('nota').eq('request_survey_id', surveyId),
    db.from('survey_reviews').select('nota').eq('request_survey_id', surveyId).maybeSingle(),
    db.from('survey_clarifications').select('status').eq('request_survey_id', surveyId).eq('vendedor_org_id', vendedorOrgId),
  ]);
  const avg = (rows: { nota: number }[] | null) => (rows && rows.length > 0 ? rows.reduce((n, r) => n + r.nota, 0) / rows.length : null);
  const clarifications = esclarecimentos ?? [];
  return {
    qualificacaoGeral: avg(geral as { nota: number }[] | null),
    notaInformacao: avg(informacao as { nota: number }[] | null),
    respostaAtempada: clarifications.length === 0 ? null : clarifications.some((c) => c.status === 'respondido'),
    notaCliente: (cliente as { nota: number } | null)?.nota ?? null,
  };
}

/**
 * Paga ao fornecedor do vendedor a sua fração da comissão, no momento em que a plataforma recebe a
 * comissão do pintor — só se este pedido teve um levantamento concluído por um vendedor
 * (src/domain/survey.ts). A fração em si é dinâmica (surveyorCommissionBp): calculada aqui, com o estado
 * mais recente do vendedor atualmente entitulado — que pode já não ser quem fez a visita original, se
 * houve escalada de um pedido de esclarecimento (`claim_clarification`, 20261023190000). Calculado aqui,
 * não em SQL, porque usa a comissão já corrigida pelas regras e descontos desta contratação (fee.net),
 * que só o replay conhece. Nunca duplica: uma segunda chamada para a mesma obra (ex.: reenvio do webhook)
 * não grava uma segunda linha.
 */
export async function settleSurveyPayout(engagementId: string, requestId: string, feeNet: Cents, at: Date): Promise<void> {
  const db = adminClient();
  if (!db) return;
  const { data: survey } = await db
    .from('request_surveys')
    .select('id, status, vendedor_org_id, vendedor_user_id')
    .eq('request_id', requestId)
    .maybeSingle();
  if (!survey || survey.status !== 'concluido' || !survey.vendedor_org_id) return;
  const { data: existing } = await db.from('survey_payouts').select('id').eq('request_survey_id', survey.id).maybeSingle();
  if (existing) return;
  const performance = await surveyorPerformance(db, survey.id, survey.vendedor_org_id, survey.vendedor_user_id);
  await db.from('survey_payouts').insert({
    request_survey_id: survey.id,
    supplier_org_id: survey.vendedor_org_id,
    engagement_id: engagementId,
    amount_cents: surveyPayoutAmount(feeNet, surveyorCommissionBp(performance)),
    fee_recebido_em: at.toISOString(),
  });
}
