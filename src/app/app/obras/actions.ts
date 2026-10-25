'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { addendaErrors } from '@/domain/addenda';
import { COST_CATEGORIES, MEMBER_ROLES, PAYMENT_METHODS, PHASE_STATES } from '@/domain/worksite';
import { parseHundredths } from '@/domain/request';
import { notifyNewOrder, notifyNewSupplierReview, notifyOrderState } from '@/lib/notify';
import { getUser } from '@/lib/supabase/server';

const path = (id: string) => `/app/obras/${id}`;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const fail = (field: string, message: string): FormState => ({ errors: { [field]: message } });
const done = (id: string, message: string): FormState => {
  revalidatePath(path(id));
  return { errors: {}, ok: true, message };
};
const date = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim();
  return s && DATE.test(s) ? s : null;
};

export async function addMember(engagementId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const nome = String(form.get('nome') ?? '').trim();
  const funcao = String(form.get('funcao') ?? '');
  if (!nome) return fail('nome', 'Indique o nome.');
  if (!(MEMBER_ROLES as readonly string[]).includes(funcao)) return fail('funcao', 'Escolha a função.');
  const custo = parseHundredths(form.get('custoHora'));
  if (Number.isNaN(custo)) return fail('custoHora', 'Valor em euros.');
  const { supabase } = await getUser();
  const { error } = await supabase.from('worksite_members').insert({
    engagement_id: engagementId,
    nome: nome.slice(0, 120),
    funcao,
    telefone: String(form.get('telefone') ?? '').trim().slice(0, 30) || null,
    custo_hora_cents: custo,
  });
  return error ? { errors: {}, message: 'Não foi possível guardar.' } : done(engagementId, 'Pessoa acrescentada.');
}

export async function addPhase(engagementId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const nome = String(form.get('nome') ?? '').trim();
  if (!nome) return fail('nome', 'Indique a fase.');
  const inicio = date(form.get('inicio'));
  const fim = date(form.get('fim'));
  if (inicio && fim && fim < inicio) return fail('fim', 'O fim tem de ser depois do início.');
  const { supabase } = await getUser();
  const { error } = await supabase.from('worksite_phases').insert({ engagement_id: engagementId, nome: nome.slice(0, 120), inicio, fim });
  return error ? { errors: {}, message: 'Não foi possível guardar.' } : done(engagementId, 'Fase acrescentada.');
}

export async function setPhaseState(engagementId: string, phaseId: string, estado: string) {
  if (!(PHASE_STATES as readonly string[]).includes(estado)) return;
  const { supabase } = await getUser();
  await supabase.from('worksite_phases').update({ estado }).eq('id', phaseId);
  revalidatePath(path(engagementId));
}

export async function addEntry(engagementId: string, tipo: 'custo' | 'tranche' | 'horas', _prev: FormState, form: FormData): Promise<FormState> {
  if (!['custo', 'tranche', 'horas'].includes(tipo)) return { errors: {}, message: 'Tipo inválido.' };
  const descricao = String(form.get('descricao') ?? '').trim().slice(0, 500);
  const data = date(form.get('data')) ?? new Date().toISOString().slice(0, 10);
  const { supabase } = await getUser();
  if (tipo === 'horas') {
    const horas = parseHundredths(form.get('horas'));
    if (horas === null || Number.isNaN(horas) || horas <= 0) return fail('horas', 'Horas, ex.: 7,5.');
    const memberId = String(form.get('member') ?? '') || null;
    const { error } = await supabase.from('worksite_entries').insert({ engagement_id: engagementId, tipo, data, descricao, horas, member_id: memberId });
    return error ? { errors: {}, message: 'Não foi possível guardar.' } : done(engagementId, 'Horas registadas.');
  }
  const valor = parseHundredths(form.get('valor'));
  if (valor === null || Number.isNaN(valor) || valor <= 0) return fail('valor', 'Valor em euros.');
  if (tipo === 'custo') {
    const categoria = String(form.get('categoria') ?? '');
    if (!(COST_CATEGORIES as readonly string[]).includes(categoria)) return fail('categoria', 'Escolha a categoria.');
    const { error } = await supabase.from('worksite_entries').insert({ engagement_id: engagementId, tipo, data, descricao, valor_cents: valor, categoria });
    return error ? { errors: {}, message: 'Não foi possível guardar.' } : done(engagementId, 'Custo registado.');
  }
  const meio = String(form.get('meio') ?? '');
  const { error } = await supabase.from('worksite_entries').insert({
    engagement_id: engagementId,
    tipo,
    data,
    descricao,
    valor_cents: valor,
    prevista: date(form.get('prevista')),
    meio: (PAYMENT_METHODS as readonly string[]).includes(meio) ? meio : null,
  });
  return error ? { errors: {}, message: 'Não foi possível guardar.' } : done(engagementId, 'Tranche acrescentada.');
}

export async function markTrancheReceived(engagementId: string, entryId: string) {
  const { supabase } = await getUser();
  await supabase.from('worksite_entries').update({ recebida_em: new Date().toISOString().slice(0, 10) }).eq('id', entryId);
  revalidatePath(path(engagementId));
}

const WORKSITE_TABLES = ['worksite_members', 'worksite_phases', 'worksite_entries'] as const;

export async function deleteWorksiteRow(engagementId: string, table: (typeof WORKSITE_TABLES)[number], id: string) {
  // Os argumentos ligados (.bind) vêm do navegador: confirmar a tabela no servidor.
  if (!(WORKSITE_TABLES as readonly string[]).includes(table)) return;
  const { supabase } = await getUser();
  await supabase.from(table).delete().eq('id', id);
  revalidatePath(path(engagementId));
}

// --- Encomendas com confirmação e avaliações de fornecedores ------------------------------

export async function orderMaterial(engagementId: string, productId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const n = Number(form.get('embalagens'));
  if (!Number.isInteger(n) || n < 1) return fail('embalagens', 'Número de embalagens.');
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };
  const { data, error } = await supabase
    .from('material_orders')
    .insert({
      engagement_id: engagementId,
      product_id: productId,
      embalagens: n,
      nota: String(form.get('nota') ?? '').trim().slice(0, 1000) || null,
      created_by: user.id,
    })
    .select('id')
    .single();
  if (error || !data) return { errors: {}, message: 'Não foi possível encomendar (o contrato tem de estar assinado).' };
  await notifyNewOrder(data.id).catch(() => undefined);
  return done(engagementId, 'Encomenda enviada ao fornecedor.');
}

export async function setOrderState(orderId: string, estado: 'confirmada' | 'entregue' | 'cancelada', back: string) {
  if (!['confirmada', 'entregue', 'cancelada'].includes(estado) || !back.startsWith('/app/')) return;
  const { supabase } = await getUser();
  await supabase.from('material_orders').update({ estado }).eq('id', orderId);
  await notifyOrderState(orderId, estado).catch(() => undefined);
  revalidatePath(back);
}

export async function reviewSupplier(engagementId: string, supplierId: string, painterId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const n = (k: string) => {
    const v = Number(form.get(k));
    return Number.isInteger(v) && v >= 1 && v <= 5 ? v : null;
  };
  const produto = n('produto');
  const entrega = n('entrega');
  const atendimento = n('atendimento');
  if (!produto || !entrega || !atendimento) return { errors: {}, message: 'Dê uma nota de 1 a 5 a cada critério.' };
  const comentario = String(form.get('comentario') ?? '').trim().slice(0, 2000);
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };
  const { data: existing } = await supabase
    .from('supplier_reviews')
    .select('id')
    .eq('supplier_org_id', supplierId)
    .eq('painter_org_id', painterId)
    .maybeSingle();
  const { error } = existing
    ? await supabase.from('supplier_reviews').update({ produto, entrega, atendimento, comentario }).eq('id', existing.id)
    : await supabase
        .from('supplier_reviews')
        .insert({ supplier_org_id: supplierId, painter_org_id: painterId, produto, entrega, atendimento, comentario, created_by: user.id });
  if (error) return { errors: {}, message: 'Só pode avaliar depois de o fornecedor confirmar uma encomenda.' };
  if (!existing) await notifyNewSupplierReview(supplierId).catch(() => undefined);
  return done(engagementId, 'Avaliação guardada.');
}

/** O fornecedor responde a uma avaliação de um pintor (paridade com reviews.resposta). */
export async function answerSupplierReview(reviewId: string, supplierOrgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const resposta = String(form.get('resposta') ?? '').trim().slice(0, 2000);
  if (!resposta) return fail('resposta', 'Escreva a resposta.');
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou. Entre de novo.' };
  const { error } = await supabase.from('supplier_reviews').update({ resposta }).eq('id', reviewId);
  if (error) return { errors: {}, message: 'Não foi possível guardar a resposta.' };
  revalidatePath(`/app/organizacoes/${supplierOrgId}`);
  return { errors: {}, ok: true, message: 'Resposta guardada.' };
}

/**
 * Trabalho a mais proposto ao cliente. Fica sempre em 'proposta': quem aceita é o cliente, do seu
 * lado, e as políticas da base de dados recusam que o pintor o marque como aceite (regra 10).
 */
export async function proposeAddenda(engagementId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const descricao = String(form.get('descricao') ?? '').trim();
  const valorCents = parseHundredths(form.get('valor'));
  if (valorCents === null || Number.isNaN(valorCents)) return fail('valor', 'Indique o preço do trabalho a mais, sem IVA.');
  const errors = addendaErrors({ descricao, valorCents });
  if (Object.keys(errors).length > 0) {
    const [campo, mensagem] = Object.entries(errors)[0]!;
    return fail(campo, mensagem);
  }
  const { supabase } = await getUser();
  const { error } = await supabase.from('worksite_addenda').insert({
    engagement_id: engagementId,
    descricao,
    valor_cents: valorCents,
  });
  return error ? { errors: {}, message: 'Não foi possível guardar.' } : done(engagementId, 'Trabalho a mais enviado ao cliente.');
}

/** Retirar um trabalho a mais que ainda não foi respondido. */
export async function withdrawAddenda(engagementId: string, addendaId: string, _prev: FormState, _form: FormData): Promise<FormState> {
  const { supabase } = await getUser();
  const { error } = await supabase.from('worksite_addenda').update({ estado: 'retirada' }).eq('id', addendaId).eq('estado', 'proposta');
  return error ? { errors: {}, message: 'Não foi possível retirar.' } : done(engagementId, 'Trabalho a mais retirado.');
}
