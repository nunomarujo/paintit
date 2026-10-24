import 'server-only';
import { applyAvaliadorBonus, surveyorPayoutAmount, surveyorShareBp } from '@/domain/survey';
import type { Cents } from '@/domain/money';
import { adminClient } from './supabase/admin';

/**
 * Crédito de bónus de adesão disponível (src/domain/survey.ts, applyAvaliadorBonus) para este
 * fornecedor, se tiver telefone e autorização de alertas registados (condição do promotor). O mais
 * antigo primeiro (`order('created_at')`), para não deixar créditos esquecidos indefinidamente.
 */
async function availableBonusCredit(db: NonNullable<ReturnType<typeof adminClient>>, orgId: string) {
  const { data: org } = await db.from('organizations').select('telefone, email_contacto, alertas_autorizados').eq('id', orgId).maybeSingle();
  if (!org?.telefone || !org?.email_contacto || !org?.alertas_autorizados) return null;
  const { data: credit } = await db
    .from('avaliador_bonus_credits')
    .select('id')
    .eq('org_id', orgId)
    .eq('estado', 'disponivel')
    .order('created_at')
    .limit(1)
    .maybeSingle();
  return credit ?? null;
}

/**
 * Os quatro números da fórmula dinâmica (src/domain/survey.ts, surveyorShareBp), lidos com
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

export interface SurveyorEarningView {
  /** Posição atual na banda 1%-2,7%, em pontos-base, já com o bónus de adesão se houver crédito. */
  shareBp: number;
  /** A mesma posição sem o bónus, para se perceber o que o bónus acrescentou. */
  shareBpSemBonus: number;
  temBonus: boolean;
  componentes: {
    qualificacaoGeral: number | null;
    notaInformacao: number | null;
    respostaAtempada: boolean | null;
    notaCliente: number | null;
  };
}

/**
 * O mesmo cálculo de `settleSurveyPayout`, mas para **mostrar ao próprio avaliador** antes de haver
 * obra adjudicada (pedido do promotor, 24/10/2026: "onde refere o ganho previsto se a obra for
 * adjudicada"). Lê-se com privilégios próprios porque o vendedor, de propósito, não tem acesso às notas
 * individuais dos pintores (só à média) — e é só a média que sai daqui. Quem chama tem de confirmar
 * primeiro que quem está a ver pertence mesmo à entidade do vendedor deste levantamento.
 */
export async function surveyorEarningView(surveyId: string, vendedorOrgId: string, vendedorUserId: string | null): Promise<SurveyorEarningView | null> {
  const db = adminClient();
  if (!db) return null;
  const performance = await surveyorPerformance(db, surveyId, vendedorOrgId, vendedorUserId);
  const credit = await availableBonusCredit(db, vendedorOrgId);
  const semBonus = surveyorShareBp(performance);
  return {
    shareBp: applyAvaliadorBonus(semBonus, credit !== null),
    shareBpSemBonus: semBonus,
    temBonus: credit !== null,
    componentes: performance,
  };
}

/**
 * Paga ao fornecedor do vendedor a sua fração do valor adjudicado, no momento em que a plataforma recebe
 * a comissão do pintor — só se este pedido teve um levantamento concluído por um vendedor
 * (src/domain/survey.ts). A fração em si é dinâmica (surveyorShareBp): calculada aqui, com o estado mais
 * recente do vendedor atualmente entitulado — que pode já não ser quem fez a visita original, se houve
 * escalada de um pedido de esclarecimento (`claim_clarification`, 20261023190000). O pagamento é 1%-2,7%
 * do valor adjudicado (`valorAdjudicado`, sem IVA), mas nunca excede a comissão líquida (`feeNet`) que a
 * plataforma de facto recebeu nesta obra (`surveyorPayoutAmount`). Calculado aqui, não em SQL, porque usa
 * valores já corrigidos pelas regras e descontos desta contratação, que só o replay conhece. Nunca
 * duplica: uma segunda chamada para a mesma obra (ex.: reenvio do webhook) não grava uma segunda linha.
 */
export async function settleSurveyPayout(engagementId: string, requestId: string, valorAdjudicado: Cents, feeNet: Cents, at: Date): Promise<void> {
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
  const credit = await availableBonusCredit(db, survey.vendedor_org_id);
  const shareBp = applyAvaliadorBonus(surveyorShareBp(performance), credit !== null);
  const { data: payout } = await db
    .from('survey_payouts')
    .insert({
      request_survey_id: survey.id,
      supplier_org_id: survey.vendedor_org_id,
      engagement_id: engagementId,
      amount_cents: surveyorPayoutAmount(valorAdjudicado, shareBp, feeNet),
      fee_recebido_em: at.toISOString(),
    })
    .select('id')
    .single();
  // Gasta-se o crédito só depois de o pagamento ficar gravado (nunca antes: se o insert falhar, o
  // crédito continua disponível para a próxima obra).
  if (credit && payout) {
    await db.from('avaliador_bonus_credits').update({ estado: 'usado', usado_em: at.toISOString(), usado_em_payout: payout.id }).eq('id', credit.id);
  }
}
