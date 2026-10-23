import 'server-only';
import { surveyPayoutAmount } from '@/domain/survey';
import type { Cents } from '@/domain/money';
import { adminClient } from './supabase/admin';

/**
 * Paga ao fornecedor do vendedor a sua fração da comissão, no momento em que a plataforma recebe a
 * comissão do pintor — só se este pedido teve um levantamento concluído por um vendedor
 * (src/domain/survey.ts). Calculado aqui, não em SQL, porque usa a comissão já corrigida pelas regras e
 * descontos desta contratação (fee.net), que só o replay conhece. Nunca duplica: uma segunda chamada
 * para a mesma obra (ex.: reenvio do webhook) não grava uma segunda linha.
 */
export async function settleSurveyPayout(engagementId: string, requestId: string, feeNet: Cents, at: Date): Promise<void> {
  const db = adminClient();
  if (!db) return;
  const { data: survey } = await db.from('request_surveys').select('id, status, vendedor_org_id').eq('request_id', requestId).maybeSingle();
  if (!survey || survey.status !== 'concluido' || !survey.vendedor_org_id) return;
  const { data: existing } = await db.from('survey_payouts').select('id').eq('request_survey_id', survey.id).maybeSingle();
  if (existing) return;
  await db.from('survey_payouts').insert({
    request_survey_id: survey.id,
    supplier_org_id: survey.vendedor_org_id,
    engagement_id: engagementId,
    amount_cents: surveyPayoutAmount(feeNet),
    fee_recebido_em: at.toISOString(),
  });
}
