'use server';

import { revalidatePath } from 'next/cache';
import { lerCobertura, resumoDaCobertura } from '@/domain/coberturaDaEmpresa';
import { porOmissaoDaEmpresa } from '@/lib/lojas';
import type { FormState } from '@/app/app/actions';
import { CURRENT_SURVEY_TERMS_VERSION } from '@/domain/surveyTerms';
import { notifyVisitaAgendada } from '@/lib/notify';
import { getUser } from '@/lib/supabase/server';

const NOT_SIGNED_IN: FormState = { errors: {}, message: 'A sessão expirou. Entre de novo.' };
const path = '/app/levantamentos';

export async function acceptSurveyTerms(surveyId: string): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { error } = await supabase.from('survey_terms_acceptances').insert({ user_id: user.id, version: CURRENT_SURVEY_TERMS_VERSION });
  if (error) return { errors: {}, message: 'Não foi possível registar.' };
  revalidatePath(`${path}/${surveyId}`);
  return { errors: {}, ok: true };
}

export async function reserveSurvey(surveyId: string, orgId: string): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { error } = await supabase.rpc('reserve_survey', { p_survey_id: surveyId, p_org: orgId });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(path);
  return { errors: {}, ok: true, message: 'Reservado. Agende com o cliente dentro da app e registe o levantamento.' };
}

/**
 * Registar o contacto e a data acordada (31/10/2026).
 *
 * Passou a chamar `register_survey_contact` em vez de escrever direto nas colunas de `request_surveys`.
 * Escrever direto contornava tudo o que a regra dos prazos tem de fazer valer: a tentativa, o estado dela, o
 * limite das 48 horas e a verificação de quem reservou. A regra existia na base e o ecrã não a usava.
 *
 * Os erros vêm da base já em português e dirigidos ao campo certo, por isso passam tal e qual — foram
 * escritos para serem lidos por quem está em obra, não por quem lê registos.
 */
export async function registerContact(attemptId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const notas = String(form.get('notas') ?? '').trim().slice(0, 2000);
  const agendado = String(form.get('agendado') ?? '').trim();
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  if (!notas) return { errors: { notas: 'Descreva o contacto: é o registo que fica como prova.' } };
  if (!agendado) return { errors: { agendado: 'Indique a data e a hora acordadas com o cliente.' } };
  const quando = new Date(agendado);
  if (Number.isNaN(quando.getTime())) return { errors: { agendado: 'Data ou hora que não se percebe.' } };
  const { error } = await supabase.rpc('register_survey_contact', {
    p_attempt: attemptId,
    p_notas: notas,
    p_agendado_para: quando.toISOString(),
  });
  if (error) {
    // A mensagem da base diz qual é o campo quando fala de datas; nos outros casos é geral.
    const campo = /data|48 horas|futuro/i.test(error.message) ? 'agendado' : '';
    return campo ? { errors: { [campo]: error.message } } : { errors: {}, message: error.message };
  }
  // O email à cliente nunca faz falhar o registo: se o correio estiver em baixo, o aviso dentro da
  // aplicação continua lá, e é esse que obriga à resposta.
  const { data: dono } = await supabase.from('survey_attempts').select('survey_id').eq('id', attemptId).maybeSingle();
  if (dono) {
    const { data: s } = await supabase.from('request_surveys').select('request_id').eq('id', dono.survey_id).maybeSingle();
    if (s) await notifyVisitaAgendada(s.request_id, quando).catch(() => {});
  }
  revalidatePath(path);
  return { errors: {}, ok: true, message: 'Registado. A cliente foi avisada para confirmar.' };
}

/** A resposta da cliente ao agendamento: uma de três, e é ela que move (ou não) o prazo. */
export async function answerSchedule(attemptId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const resposta = String(form.get('resposta') ?? '').trim();
  const data = String(form.get('data') ?? '').trim();
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  if (!['agendado_48h', 'adiado', 'nao_contactado'].includes(resposta)) {
    return { errors: { resposta: 'Escolha uma das três respostas.' } };
  }
  if (resposta === 'adiado' && !data) {
    return { errors: { data: 'Indique a data e a hora que combinou.' } };
  }
  const quando = resposta === 'adiado' ? new Date(data) : null;
  if (quando && Number.isNaN(quando.getTime())) return { errors: { data: 'Data ou hora que não se percebe.' } };
  const { error } = await supabase.rpc('answer_survey_schedule', {
    p_attempt: attemptId,
    p_resposta: resposta,
    ...(quando ? { p_data: quando.toISOString() } : {}),
  });
  if (error) {
    const campo = /data|sete dias|futuro/i.test(error.message) ? 'data' : '';
    return campo ? { errors: { [campo]: error.message } } : { errors: {}, message: error.message };
  }
  revalidatePath('/app/pedidos');
  return { errors: {}, ok: true, message: 'Resposta registada. Obrigado.' };
}

export async function concludeSurvey(surveyId: string): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { error } = await supabase.rpc('conclude_survey', { p_survey_id: surveyId });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(path);
  return { errors: {}, ok: true, message: 'Levantamento concluído.' };
}

// --- Pedido de esclarecimento ao vendedor (migração 20261024010647) -------------------------------
// Dois marcos fixos, sem perda parcial: um dia para confirmar que vai à obra, mais um dia para lá ir e
// responder à lista conjunta de dúvidas (src/domain/clarification.ts). Falhar qualquer um custa a
// comissão de toda a obra. A lista nunca identifica o pintor que perguntou cada linha.

export async function confirmClarification(surveyId: string, clarificationId: string): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { error } = await supabase.rpc('confirm_clarification', { p_id: clarificationId });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(`${path}/${surveyId}`);
  return { errors: {}, ok: true, message: 'Confirmado. Tem um dia para ir à obra e responder.' };
}

export async function respondClarification(surveyId: string, clarificationId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const resposta = String(form.get('resposta') ?? '').trim();
  if (!resposta) return { errors: { resposta: 'Escreva a resposta às dúvidas.' } };
  if (resposta.length > 2000) return { errors: { resposta: 'Até 2000 caracteres.' } };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { error } = await supabase.rpc('respond_clarification', { p_id: clarificationId, p_resposta: resposta });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(`${path}/${surveyId}`);
  return { errors: {}, ok: true, message: 'Resposta enviada aos pintores que perguntaram.' };
}

/** Reserva de uma tentativa escalada (o vendedor anterior falhou um marco): primeiro a chegar, avança,
 * e herda a comissão de todo o levantamento a partir desse momento. */
export async function claimClarification(clarificationId: string, orgId: string): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { error } = await supabase.rpc('claim_clarification', { p_id: clarificationId, p_org: orgId });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(path);
  return { errors: {}, ok: true, message: 'Esclarecimento reservado. Confirme a ida à obra dentro de um dia.' };
}

export async function setSurveyCoverage(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  // Concelhos obrigatórios; «todo o país» só marcado (06/11/2026, `src/domain/coberturaDaEmpresa.ts`).
  // Sem concelhos escolhidos, gravam-se os da morada e das lojas da empresa (06/11/2026) — nunca «todo o país».
  const lido = lerCobertura(form.get('todo_o_pais') === 'on', form.getAll('concelhos').map(String), await porOmissaoDaEmpresa(supabase, orgId));
  if ('erro' in lido) return { errors: { concelhos: lido.erro }, message: lido.erro };
  const { error } = await supabase
    .from('supplier_survey_coverage')
    .upsert({ org_id: orgId, concelhos: [...lido.value.concelhos], todo_o_pais: lido.value.todoOPais }, { onConflict: 'org_id' });
  if (error) return { errors: {}, message: 'Não foi possível guardar.' };
  revalidatePath(path);
  revalidatePath('/app/avaliacoes', 'layout');
  return { errors: {}, ok: true, message: lido.value.todoOPais ? 'Guardado: todo o país.' : `Guardado: ${resumoDaCobertura(lido.value)}.` };
}

