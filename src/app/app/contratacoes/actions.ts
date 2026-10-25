'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { FormState } from '@/app/app/actions';
import { draftText, isRevealed, type EngagementEvent, type EventKind } from '@/domain/contracting';
import { fromLocalDateTime } from '@/domain/deadline';
import type { DisputeOutcome } from '@/domain/engagement';
import { parseHundredths } from '@/domain/request';
import { CURRENT_RULES } from '@/domain/rules';
import type { Json } from '@/lib/database.types';
import { isPlatformAdmin } from '@/lib/access';
import { contractPdfFor, loadDraft, loadReplay, missingCondoDocs, signedPdf } from '@/lib/engagements';
import { verifySignature } from '@/lib/pades';
import { checkSignedPdf, findSignatures, shouldRejectUntrustedSignature } from '@/domain/signature';
import { availableActions } from '@/domain/contracting';
import { getUser } from '@/lib/supabase/server';
import { notifyEngagementChange, notifyReferralWon } from '@/lib/notify';
import { settleRefunds } from '@/lib/payments';
import { settleSurveyPayout } from '@/lib/surveys';

const NOT_SIGNED_IN: FormState = { errors: {}, message: 'A sessão expirou. Entre de novo.' };

type PartyKind = Extract<EventKind, 'cliente_assinou' | 'cliente_desistiu' | 'pintor_assinou' | 'litigio_aberto' | 'encerrar_sem_contrato'>;

/**
 * Regista um acontecimento depois de confirmar, com as regras de engagement.ts,
 * que é válido agora. A base de dados volta a verificar quem o pode registar.
 */
async function record(
  engagementId: string,
  kind: EventKind,
  opts: { amount?: number | null; at?: Date; payload?: EngagementEvent['payload']; admin?: boolean } = {},
): Promise<FormState & { revealed?: boolean }> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { data: row } = await supabase.from('engagements').select('*').eq('id', engagementId).maybeSingle();
  if (!row) return { errors: {}, message: 'Contratação não encontrada.' };
  if (opts.admin && !(await isPlatformAdmin(supabase, user.id))) return { errors: {}, message: 'Sem permissão.' };

  const at = opts.at ?? new Date();
  const candidate: EngagementEvent = { id: 'novo', kind, amount: opts.amount ?? null, payload: opts.payload ?? {}, at: at.toISOString() };
  const before = (await loadReplay(supabase, row, at)).replay.engagement;
  const { replay: after } = await loadReplay(supabase, row, at, [candidate]);
  const refused = after.rejected.find((r) => r.event.id === 'novo');
  if (refused) return { errors: {}, message: refused.reason };

  // A apresentação acontece quando o fee entra dentro do prazo (o fee tardio é devolvido).
  const reveal = kind === 'fee_recebido' && !isRevealed(before) && isRevealed(after.engagement);
  const { error } = await supabase.from('engagement_events').insert({
    engagement_id: engagementId,
    kind,
    amount_cents: opts.amount ?? null,
    payload: (opts.payload ?? {}) as Json,
    reveal,
    actor: user.id,
    ...(opts.at ? { at: opts.at.toISOString() } : {}),
  });
  if (error) return { errors: {}, message: 'Não foi possível registar. Confirme que tem permissão para este passo.' };
  // Devoluções que este passo torne devidas (ex.: caução na assinatura) seguem logo para o Stripe.
  await settleRefunds(engagementId).catch(() => undefined);
  if (kind === 'fee_recebido') await settleSurveyPayout(engagementId, row.request_id, after.engagement.base, after.engagement.fee.net, at).catch(() => undefined);
  await notifyEngagementChange(engagementId, before.status, after.engagement.status).catch(() => undefined);
  revalidatePath(`/app/contratacoes/${engagementId}`);
  return { errors: {}, ok: true, message: 'Registado.', revealed: reveal };
}

export async function partyAction(engagementId: string, kind: PartyKind, _prev: FormState, form: FormData): Promise<FormState> {
  if (!['cliente_assinou', 'cliente_desistiu', 'pintor_assinou', 'litigio_aberto', 'encerrar_sem_contrato'].includes(kind)) {
    return { errors: {}, message: 'Ação inválida.' };
  }
  if (kind === 'cliente_assinou' || kind === 'pintor_assinou') {
    // A assinatura exige o PDF assinado com Chave Móvel Digital. A aceitação simples
    // só existe para testes, com PERMITIR_ACEITACAO_SIMPLES=1 no ambiente.
    if (process.env.PERMITIR_ACEITACAO_SIMPLES !== '1') {
      return { errors: {}, message: 'Assine o PDF do contrato com a Chave Móvel Digital e carregue-o.' };
    }
    if (form.get('confirmo') !== 'sim') return { errors: { confirmo: 'Confirme que leu e aceita a minuta.' } };
    if (kind === 'cliente_assinou') {
      const { supabase } = await getUser();
      const { data: row } = await supabase.from('engagements').select('*').eq('id', engagementId).maybeSingle();
      const missing = row ? await missingCondoDocs(supabase, row) : [];
      if (missing.length > 0) return { errors: {}, message: `Antes de assinar, envie e aguarde a validação de: ${missing.join('; ')}.` };
    }
  }
  const reason = String(form.get('motivo') ?? '').trim();
  if (kind === 'litigio_aberto' && reason.length < 10) return { errors: { motivo: 'Explique o motivo do litígio.' } };

  const payload: EngagementEvent['payload'] = {};
  if (kind === 'litigio_aberto') payload.reason = reason.slice(0, 1000);
  if (kind === 'cliente_assinou' || kind === 'pintor_assinou') {
    // Prova do que foi assinado: resumo SHA-256 do texto da minuta tal como a parte o viu.
    const { supabase } = await getUser();
    const { data: row } = await supabase.from('engagements').select('*').eq('id', engagementId).maybeSingle();
    if (!row) return { errors: {}, message: 'Contratação não encontrada.' };
    payload.documentHash = createHash('sha256').update(draftText(await loadDraft(supabase, row))).digest('hex');
    payload.metodo = 'aceitacao';
  }
  const r = await record(engagementId, kind, { payload });
  return { errors: r.errors, ok: r.ok, message: r.message };
}

export async function carryToProposal(engagementId: string, requestId: string, nextProposalId: string): Promise<FormState> {
  const r = await record(engagementId, 'transitar', { payload: { to: nextProposalId } });
  if (!r.ok) return r;
  const { supabase } = await getUser();
  const { error } = await supabase.rpc('reselect_proposal', { p_proposal: nextProposalId });
  if (error) return { errors: {}, message: error.message };
  await notifyReferralWon(nextProposalId).catch(() => undefined);
  revalidatePath(`/app/pedidos/${requestId}/propostas`);
  const { data: next } = await supabase.from('engagements').select('id').eq('proposal_id', nextProposalId).maybeSingle();
  redirect(next ? `/app/contratacoes/${next.id}` : `/app/pedidos/${requestId}/propostas`);
}

const OUTCOMES: DisputeOutcome[] = ['culpa_cliente', 'culpa_pintor', 'repartido', 'retomar'];

/** Confirmações do parceiro de pagamentos e decisões de litígio: só a equipa da plataforma. */
export async function platformAction(
  engagementId: string,
  kind: Extract<EventKind, 'deposito_confirmado' | 'fee_recebido' | 'litigio_resolvido'>,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  if (!['deposito_confirmado', 'fee_recebido', 'litigio_resolvido'].includes(kind)) return { errors: {}, message: 'Ação inválida.' };
  let amount: number | null = null;
  if (kind !== 'litigio_resolvido') {
    amount = parseHundredths(form.get('montante'));
    if (amount === null || Number.isNaN(amount)) return { errors: { montante: 'Montante recebido, em euros.' } };
  }
  const outcome = String(form.get('decisao') ?? '') as DisputeOutcome;
  if (kind === 'litigio_resolvido' && !OUTCOMES.includes(outcome)) return { errors: { decisao: 'Escolha a decisão.' } };
  let culpaClientePercent: number | undefined;
  if (kind === 'litigio_resolvido' && outcome === 'repartido') {
    const raw = Number(form.get('percentualCliente'));
    if (!Number.isInteger(raw) || raw < 1 || raw > 99) {
      return { errors: { percentualCliente: 'A percentagem de culpa do cliente tem de ser um número inteiro entre 1 e 99.' } };
    }
    culpaClientePercent = raw;
  }
  const when = String(form.get('quando') ?? '').trim();
  const at = when ? (fromLocalDateTime(when, CURRENT_RULES.timeZone) ?? undefined) : undefined;
  if (when && (!at || at > new Date())) return { errors: { quando: 'Data e hora no passado (hora de Lisboa).' } };
  const r = await record(engagementId, kind, {
    amount,
    at,
    admin: true,
    payload: kind === 'litigio_resolvido' ? { outcome, ...(culpaClientePercent !== undefined ? { culpaClientePercent } : {}) } : {},
  });
  return {
    errors: r.errors,
    ok: r.ok,
    message: r.revealed ? 'Registado. As partes foram apresentadas: já se veem uma à outra.' : r.message,
  };
}

const MAX_PDF = 20 * 1024 * 1024;

/**
 * Assinatura com Chave Móvel Digital: a parte carrega o PDF que assinou na
 * Autenticação.gov. Confirma-se que contém o documento esperado sem alterações
 * (o PDF gerado, para o cliente; o PDF já assinado pelo cliente, para o pintor),
 * que acrescenta uma assinatura sobre o ficheiro inteiro e que ela é válida.
 */
export async function signWithPdf(engagementId: string, side: 'cliente' | 'pintor', _prev: FormState, form: FormData): Promise<FormState> {
  if (side !== 'cliente' && side !== 'pintor') return { errors: {}, message: 'Ação inválida.' };
  const file = form.get('pdf');
  if (!(file instanceof File) || file.size === 0) return { errors: { pdf: 'Escolha o PDF assinado.' } };
  if (file.size > MAX_PDF) return { errors: { pdf: 'O PDF tem mais de 20 MB.' } };
  const uploaded = new Uint8Array(await file.arrayBuffer());

  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { data: row } = await supabase.from('engagements').select('*').eq('id', engagementId).maybeSingle();
  if (!row) return { errors: {}, message: 'Contratação não encontrada.' };
  const kind = side === 'cliente' ? 'cliente_assinou' : 'pintor_assinou';
  const current = (await loadReplay(supabase, row)).replay.engagement;
  if (!availableActions(current, side).includes(kind)) return { errors: {}, message: 'Este passo não está disponível agora.' };

  if (side === 'cliente') {
    const missing = await missingCondoDocs(supabase, row);
    if (missing.length > 0) {
      return { errors: {}, message: `Antes de assinar, envie e aguarde a validação de: ${missing.join('; ')}.` };
    }
  }
  const expected = side === 'cliente' ? await contractPdfFor(supabase, row) : await signedPdf(supabase, engagementId, 'cliente');
  if (!expected) return { errors: {}, message: 'Falta o contrato assinado pelo cliente.' };
  const check = checkSignedPdf(uploaded, expected);
  if (!check.ok) return { errors: { pdf: check.reason } };
  // Todas as assinaturas acrescentadas (uma pessoa, ou vários representantes que obrigam em conjunto).
  const total = findSignatures(uploaded).length;
  const signers = await Promise.all(
    Array.from({ length: check.newSignatures }, (_, i) => verifySignature(uploaded, total - check.newSignatures + i)),
  );
  const invalid = signers.find((x) => !x.valid);
  if (invalid) return { errors: { pdf: `Uma assinatura não é válida${invalid.reason ? ` (${invalid.reason})` : ''}.` } };
  // Recusar logo um certificado cuja cadeia foi mesmo avaliada e recusada (decisão de 24/10/2026, item 12
  // do docs/DECISOES.md) — nunca só por a avaliação ter ficado indeterminada por uma falha de rede
  // transitória a obter um certificado do emissor (`indeterminate`, src/lib/pades.ts): esses continuam
  // aceites com revisão manual da equipa, como antes.
  if (shouldRejectUntrustedSignature(signers)) {
    const reason = signers.find((x) => !x.trusted && !x.indeterminate)?.trustReason;
    return {
      errors: {
        pdf: `O certificado da assinatura não corresponde ao Cartão de Cidadão nem à Chave Móvel Digital do Estado português${reason ? ` (${reason})` : ''}. Assine de novo na aplicação Autenticação.gov.`,
      },
    };
  }
  const signer = {
    name: signers.map((x) => x.name ?? 'titular do certificado').join(' e '),
    serialNumber: signers.map((x) => x.serialNumber ?? '—').join(', '),
    // Chegado aqui, `trusted: false` só pode significar "indeterminado por falha de rede" — uma cadeia
    // mesmo recusada já foi devolvida acima, antes de qualquer gravação.
    trusted: signers.every((x) => x.trusted),
  };

  const up = await supabase.storage.from('contratos').upload(`${engagementId}/${side}.pdf`, uploaded, { contentType: 'application/pdf' });
  if (up.error) return { errors: {}, message: 'Não foi possível guardar o PDF assinado (já tinha sido carregado?).' };

  const r = await record(engagementId, kind, {
    payload: {
      documentHash: createHash('sha256').update(uploaded).digest('hex'),
      metodo: 'cmd_pdf',
      signatario: signer.name,
      identificacao: signer.serialNumber,
      cadeiaConfiavel: signer.trusted,
    },
  });
  if (!r.ok) return { errors: r.errors, message: r.message };
  return {
    errors: {},
    ok: true,
    message: signer.trusted
      ? `Assinado por ${signer.name ?? 'titular do certificado'}, com certificado do Estado português.`
      : `Assinado por ${signer.name ?? 'titular do certificado'}. A equipa da plataforma vai confirmar a origem do certificado.`,
  };
}

/**
 * Resposta do cliente a um trabalho a mais. Só o lado do cliente consegue executar isto — as
 * políticas da base de dados recusam-no ao pintor —, e a data da resposta é posta pelo servidor.
 */
export async function answerAddenda(
  engagementId: string,
  addendaId: string,
  estado: 'aceite' | 'recusada',
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  // O estado chega ligado à action e vem do navegador: validar aqui, não confiar (CLAUDE.md, regra 10).
  if (estado !== 'aceite' && estado !== 'recusada') return { errors: {}, message: 'Resposta inválida.' };
  const nota = String(form.get('nota') ?? '').trim().slice(0, 600) || null;

  const { supabase } = await getUser();
  const { error } = await supabase
    .from('worksite_addenda')
    .update({ estado, nota_cliente: nota })
    .eq('id', addendaId)
    .eq('estado', 'proposta');
  if (error) return { errors: {}, message: 'Não foi possível registar a resposta.' };
  revalidatePath(`/app/contratacoes/${engagementId}`);
  return { errors: {}, ok: true, message: estado === 'aceite' ? 'Trabalho a mais aceite.' : 'Trabalho a mais recusado.' };
}
