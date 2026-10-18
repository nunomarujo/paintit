'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { FormState } from '@/app/app/actions';
import { localDate } from '@/domain/deadline';
import { parseRequest, parseSurface, publishBlockers } from '@/domain/request';
import { CURRENT_RULES } from '@/domain/rules';
import { getUser } from '@/lib/supabase/server';

const NOT_SIGNED_IN: FormState = { errors: {}, message: 'A sessão expirou. Entre de novo.' };

function requestColumns(v: NonNullable<ReturnType<typeof parseRequest>['value']>) {
  return {
    building_id: v.buildingId,
    titulo: v.titulo,
    tipo_obra: v.tipoObra,
    descricao: v.descricao,
    trabalhos: v.trabalhos,
    cor_acabamento: v.corAcabamento,
    prazo_propostas: v.prazoPropostas,
    execucao_desde: v.execucaoDesde,
    execucao_ate: v.execucaoAte,
  };
}

export async function createRequest(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseRequest(form);
  if (!parsed.value) return { errors: parsed.errors };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;

  const { data, error } = await supabase
    .from('work_requests')
    .insert({ org_id: orgId, ...requestColumns(parsed.value), created_by: user.id })
    .select('id')
    .single();
  if (error || !data) return { errors: {}, message: 'Não foi possível criar o pedido. Só gestores da entidade o podem fazer.' };
  redirect(`/app/pedidos/${data.id}`);
}

export async function updateRequest(requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseRequest(form);
  if (!parsed.value) return { errors: parsed.errors };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;

  const { data, error } = await supabase
    .from('work_requests')
    .update(requestColumns(parsed.value))
    .eq('id', requestId)
    .eq('status', 'rascunho')
    .select('id');
  if (error || !data || data.length === 0) {
    return { errors: {}, message: 'Não foi possível guardar. Um pedido publicado tem de voltar a rascunho para ser alterado.' };
  }
  revalidatePath(`/app/pedidos/${requestId}`);
  return { errors: {}, ok: true, message: 'Guardado.' };
}

export async function addSurface(requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseSurface(form);
  if (!parsed.value) return { errors: parsed.errors };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;

  const v = parsed.value;
  const { error } = await supabase.from('request_surfaces').insert({
    request_id: requestId,
    kind: v.kind,
    descricao: v.descricao,
    area_direta_cm2: v.areaDireta,
    largura_cm: v.areaDireta === null ? v.larguraCm : null,
    altura_cm: v.areaDireta === null ? v.alturaCm : null,
    vaos_cm2: v.areaDireta === null ? v.vaosCm2 : null,
    quantidade: v.quantidade,
    origem: v.origem,
  });
  if (error) return { errors: {}, message: 'Não foi possível acrescentar. O pedido tem de estar em rascunho.' };
  revalidatePath(`/app/pedidos/${requestId}`);
  return { errors: {}, ok: true };
}

export async function deleteSurface(requestId: string, surfaceId: string) {
  const { supabase } = await getUser();
  await supabase.from('request_surfaces').delete().eq('id', surfaceId).eq('request_id', requestId);
  revalidatePath(`/app/pedidos/${requestId}`);
}

export async function publishRequest(requestId: string): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;

  const [{ data: req }, { data: surfaces }] = await Promise.all([
    supabase.from('work_requests').select('descricao, prazo_propostas, cor_acabamento, status').eq('id', requestId).maybeSingle(),
    supabase.from('request_surfaces').select('area_cm2, descricao').eq('request_id', requestId),
  ]);
  if (!req || req.status !== 'rascunho') return { errors: {}, message: 'Só um rascunho pode ser publicado.' };

  const blockers = publishBlockers({
    descricao: req.descricao,
    otherTexts: [req.cor_acabamento ?? '', ...(surfaces ?? []).map((s) => s.descricao ?? '')],
    prazoPropostas: req.prazo_propostas,
    surfacesArea: (surfaces ?? []).map((s) => s.area_cm2),
    today: localDate(new Date(), CURRENT_RULES.timeZone),
  });
  if (blockers.length > 0) return { errors: {}, message: blockers.join(' ') };

  // A base de dados repete as verificações essenciais e cria o anúncio anónimo.
  const { error } = await supabase.from('work_requests').update({ status: 'publicado' }).eq('id', requestId);
  if (error) return { errors: {}, message: error.message };
  revalidatePath(`/app/pedidos/${requestId}`);
  return { errors: {}, ok: true, message: 'Publicado. Os pintores da zona já podem ver o anúncio.' };
}

export async function changeRequestStatus(requestId: string, status: 'rascunho' | 'encerrado' | 'cancelado') {
  const { supabase } = await getUser();
  await supabase.from('work_requests').update({ status }).eq('id', requestId);
  revalidatePath(`/app/pedidos/${requestId}`);
}
