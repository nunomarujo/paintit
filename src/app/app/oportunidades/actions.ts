'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { FormState } from '@/app/app/actions';
import { localDate } from '@/domain/deadline';
import { CURRENT_PAINTER_TERMS_VERSION } from '@/domain/painterTerms';
import { parseLine, parseTerms, submitBlockers } from '@/domain/proposal';
import { CURRENT_RULES } from '@/domain/rules';
import type { Json } from '@/lib/database.types';
import { pricedProduct } from '@/lib/materials';
import { toLine, toTerms } from '@/lib/proposals';
import { notifyNewMessage, notifyProposalSubmitted, notifyReferralCandidacy, notifyReferralWon } from '@/lib/notify';
import { guardContact } from '@/lib/strikes';
import { getUser } from '@/lib/supabase/server';

const NOT_SIGNED_IN: FormState = { errors: {}, message: 'A sessão expirou. Entre de novo.' };
const today = () => localDate(new Date(), CURRENT_RULES.timeZone);

/** Aceita os termos para ver a ficha completa de uma obra (src/domain/painterTerms.ts). Uma linha por versão;
 * uma versão nova não apaga as anteriores. */
export async function acceptPainterTerms(orgId: string, requestId: string): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { error } = await supabase.from('painter_terms_acceptances').insert({ painter_org_id: orgId, version: CURRENT_PAINTER_TERMS_VERSION });
  if (error) return { errors: {}, message: 'Não foi possível registar. Só gestores da entidade o podem fazer.' };
  revalidatePath(`/app/oportunidades/${requestId}`);
  return { errors: {}, ok: true };
}

export async function createProposal(requestId: string, painterOrgId: string) {
  const { supabase, user } = await getUser();
  if (!user) redirect('/entrar');
  // Validade e duração por omissão; o pintor ajusta antes de submeter.
  const validade = new Date();
  validade.setUTCDate(validade.getUTCDate() + 30);
  await supabase.from('proposals').insert({
    request_id: requestId,
    painter_org_id: painterOrgId,
    created_by: user.id,
    validade: validade.toISOString().slice(0, 10),
  });
  revalidatePath(`/app/oportunidades/${requestId}`);
}

export async function saveTerms(proposalId: string, requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseTerms(form);
  if (!parsed.value) return { errors: parsed.errors };
  const v = parsed.value;
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const refused = await guardContact(supabase, user.id, 'condições da proposta', { exclusoes: v.exclusoes, notas: v.notas });
  if (refused) return refused;
  const { data, error } = await supabase
    .from('proposals')
    .update({
      iva_bps: v.ivaBps,
      validade: v.validade,
      inicio_possivel: v.inicioPossivel,
      duracao_dias: v.duracaoDias,
      adiantamento_bps: v.adiantamentoBps,
      preco_ajuste_m2_cents: v.precoAjusteM2,
      garantia_anos: v.garantiaAnos,
      exclusoes: v.exclusoes,
      notas: v.notas,
      fases: v.fases.map((f) => ({ nome: f.nome, bps: f.bps })) as Json,
      confirma_mao_obra: v.confirmaMaoObra,
      seguro_rc: v.seguroRc,
      seguro_at: v.seguroAt,
    })
    .eq('id', proposalId)
    .eq('status', 'rascunho')
    .select('id');
  if (error || !data || data.length === 0) {
    return { errors: {}, message: 'Não foi possível guardar. Uma proposta submetida tem de voltar a rascunho para ser alterada.' };
  }
  revalidatePath(`/app/oportunidades/${requestId}`);
  return { errors: {}, ok: true, message: 'Guardado.' };
}

export async function addLine(proposalId: string, requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseLine(form);
  if (!parsed.value) return { errors: parsed.errors };
  const l = parsed.value;
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const refusedLine = await guardContact(supabase, user.id, 'linha da proposta', { descricao: l.descricao, produto: l.produto, motivoDiferenca: l.motivoDiferenca });
  if (refusedLine) return refusedLine;
  // Material comprometido: produto do catálogo, com o desconto para a área desta obra.
  const productId = String(form.get('productId') ?? '').trim();
  let material: { product_id: string; preco_fornecedor_cents: number | null; desconto_bps: number; produto: string } | null = null;
  if (productId) {
    const { data: listing } = await supabase.from('request_listings').select('area_total_cm2').eq('request_id', requestId).maybeSingle();
    const { data: own } = await supabase.from('proposals').select('painter_org_id').eq('id', proposalId).maybeSingle();
    const priced = await pricedProduct(supabase, productId, {
      area: listing?.area_total_cm2 ?? 0,
      today: today(),
      painterOrgId: own?.painter_org_id ?? null,
    });
    if (!priced) return { errors: {}, message: 'Esse produto já não está no catálogo.' };
    material = { product_id: productId, preco_fornecedor_cents: priced.precoFornecedor, desconto_bps: priced.descontoBps, produto: priced.label };
  }
  // As linhas ligam-se a zonas do pedido; o tipo da primeira zona mantém a cobertura por tipo de superfície.
  const zonas = l.zonas ?? [];
  let superficie = l.superficie;
  if (zonas.length > 0) {
    const { data: zs } = await supabase.from('request_surfaces').select('id, kind').eq('request_id', requestId).in('id', zonas);
    if (!zs || zs.length !== zonas.length) return { errors: { zona: 'Zona inválida.' }, message: 'Há uma zona que não pertence a este pedido.' };
    superficie = zs[0]!.kind;
  }
  const { error } = await supabase.from('proposal_lines').insert({
    proposal_id: proposalId,
    surface_ids: zonas,
    motivo_diferenca: l.motivoDiferenca ?? null,
    categoria: l.categoria,
    descricao: l.descricao,
    superficie,
    quantidade: l.quantidade,
    unidade: l.unidade,
    preco_unitario_cents: l.precoUnitario,
    demaos: l.demaos,
    produto: material?.produto ?? l.produto,
    inclusao: l.inclusao,
    product_id: material?.product_id ?? null,
    preco_fornecedor_cents: material?.preco_fornecedor_cents ?? null,
    desconto_bps: material?.desconto_bps ?? null,
  });
  if (error) return { errors: {}, message: 'Não foi possível acrescentar a linha.' };
  revalidatePath(`/app/oportunidades/${requestId}`);
  return { errors: {}, ok: true, message: 'Linha acrescentada.' };
}

export async function deleteLine(requestId: string, lineId: string) {
  const { supabase } = await getUser();
  await supabase.from('proposal_lines').delete().eq('id', lineId);
  revalidatePath(`/app/oportunidades/${requestId}`);
}

export async function submitProposal(proposalId: string, requestId: string): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const [{ data: p }, { data: lines }, { data: listing }] = await Promise.all([
    supabase.from('proposals').select('*').eq('id', proposalId).maybeSingle(),
    supabase.from('proposal_lines').select('*').eq('proposal_id', proposalId),
    supabase.from('request_listings').select('aberto, ocupacao_via_publica').eq('request_id', requestId).maybeSingle(),
  ]);
  if (!p || p.status !== 'rascunho') return { errors: {}, message: 'Só um rascunho pode ser submetido.' };
  const blockers = submitBlockers({
    terms: toTerms(p),
    lines: (lines ?? []).map(toLine),
    today: today(),
    requestOpen: listing?.aberto ?? false,
    viaPublica: listing?.ocupacao_via_publica,
  });
  if (blockers.length > 0) return { errors: {}, message: blockers.join(' ') };
  // A base de dados repete as verificações e fixa a base, a versão do pedido e a verificação.
  const { error } = await supabase.from('proposals').update({ status: 'submetida' }).eq('id', proposalId);
  if (error) return { errors: {}, message: error.message };
  await notifyProposalSubmitted(requestId).catch(() => undefined);
  await notifyReferralCandidacy(proposalId).catch(() => undefined);
  revalidatePath(`/app/oportunidades/${requestId}`);
  return { errors: {}, ok: true, message: 'Proposta submetida. O cliente vê-a sem saber quem a fez.' };
}

export async function changeProposalStatus(proposalId: string, requestId: string, status: 'retirada' | 'rascunho') {
  // Submeter passa sempre por submitProposal (filtro de contactos).
  if (status !== 'retirada' && status !== 'rascunho') return;
  const { supabase } = await getUser();
  await supabase.from('proposals').update({ status }).eq('id', proposalId);
  revalidatePath(`/app/oportunidades/${requestId}`);
}

export async function sendMessage(
  proposalId: string,
  lado: 'cliente' | 'pintor',
  path: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const texto = String(form.get('texto') ?? '').trim();
  if (!texto) return { errors: { texto: 'Escreva a mensagem.' } };
  if (texto.length > 2000) return { errors: { texto: 'No máximo 2000 caracteres.' } };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  // COM-02: contactos e localização ficam de fora até à apresentação; tentar é um aviso (src/domain/strikes.ts).
  const refused = await guardContact(supabase, user.id, 'mensagem', { texto });
  if (refused) return refused;
  const { error } = await supabase.from('proposal_messages').insert({ proposal_id: proposalId, lado, texto, autor: user.id });
  if (error) return { errors: {}, message: 'Não foi possível enviar.' };
  await notifyNewMessage(proposalId, lado).catch(() => undefined);
  revalidatePath(path);
  return { errors: {}, ok: true };
}

export async function chooseProposal(proposalId: string, requestId: string): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { error } = await supabase.rpc('select_proposal', { p_proposal: proposalId });
  if (error) return { errors: {}, message: error.message };
  await notifyReferralWon(proposalId).catch(() => undefined);
  revalidatePath(`/app/pedidos/${requestId}`);
  redirect(`/app/pedidos/${requestId}/propostas`);
}
