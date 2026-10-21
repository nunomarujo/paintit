'use server';

import { after } from 'next/server';
import { notifyNewRequest } from '@/lib/notify';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Json } from '@/lib/database.types';
import type { FormState } from '@/app/app/actions';
import { localDate } from '@/domain/deadline';
import { MAX_PHOTOS_PER_REQUEST, PHOTO_KINDS, cleanPhoto, type PhotoKind } from '@/domain/photo';
import { parseRequest, parseSurface, publishBlockers } from '@/domain/request';
import { preferencesFromForm } from '@/domain/reference';
import { CURRENT_RULES } from '@/domain/rules';
import { isPlatformAdmin } from '@/lib/access';
import { guardContact } from '@/lib/strikes';
import { getUser } from '@/lib/supabase/server';

const NOT_SIGNED_IN: FormState = { errors: {}, message: 'A sessão expirou. Entre de novo.' };

function requestColumns(v: NonNullable<ReturnType<typeof parseRequest>['value']>, form: FormData) {
  return {
    produtos_preferidos: preferencesFromForm(form).map((p) => ({ id: p.id, fixo: p.fixo })) as Json,
    building_id: v.buildingId,
    titulo: v.titulo,
    tipo_obra: v.tipoObra,
    descricao: v.descricao,
    trabalhos: v.trabalhos,
    cor_acabamento: v.corAcabamento,
    prazo_propostas: v.prazoPropostas,
    execucao_desde: v.execucaoDesde,
    execucao_ate: v.execucaoAte,
    ocupacao_via_publica: v.ocupacaoViaPublica,
    trabalhos_modo: v.trabalhosModo,
  };
}

export async function createRequest(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseRequest(form);
  if (!parsed.value) return { errors: parsed.errors };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const refused = await guardContact(supabase, user.id, 'pedido', { descricao: parsed.value.descricao, corAcabamento: parsed.value.corAcabamento });
  if (refused) return refused;

  const { data, error } = await supabase
    .from('work_requests')
    .insert({ org_id: orgId, ...requestColumns(parsed.value, form), created_by: user.id })
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
  const refused = await guardContact(supabase, user.id, 'pedido', { descricao: parsed.value.descricao, corAcabamento: parsed.value.corAcabamento });
  if (refused) return refused;

  const { data, error } = await supabase
    .from('work_requests')
    .update(requestColumns(parsed.value, form))
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
  const refused = await guardContact(supabase, user.id, 'zona do pedido', { descricao: v.descricao });
  if (refused) return refused;
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
    trabalhos: v.trabalhos,
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
  // Depois da resposta: convidar os pintores por email não atrasa nem faz falhar a publicação.
  after(() => notifyNewRequest(requestId).catch((e) => console.error('Convite aos pintores falhou:', e)));
  revalidatePath(`/app/pedidos/${requestId}`);
  return { errors: {}, ok: true, message: 'Publicado. Os pintores da zona já podem ver o anúncio.' };
}

export async function changeRequestStatus(requestId: string, status: 'rascunho' | 'encerrado' | 'cancelado') {
  // Os argumentos ligados vêm do navegador; publicar passa sempre por publishRequest.
  if (!['rascunho', 'encerrado', 'cancelado'].includes(status)) return;
  const { supabase } = await getUser();
  await supabase.from('work_requests').update({ status }).eq('id', requestId);
  revalidatePath(`/app/pedidos/${requestId}`);
}

// --- Fotografias -------------------------------------------------------------------

export async function uploadPhoto(requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const kind = String(form.get('kind') ?? '');
  const legenda = String(form.get('legenda') ?? '').trim().slice(0, 200) || null;
  const file = form.get('ficheiro');
  if (!(PHOTO_KINDS as readonly string[]).includes(kind)) return { errors: { kind: 'Escolha o tipo de fotografia.' } };
  if (!(file instanceof File)) return { errors: { ficheiro: 'Escolha uma fotografia.' } };

  // Valida pelos bytes e retira os metadados (GPS, aparelho, data) antes de guardar.
  const clean = cleanPhoto(new Uint8Array(await file.arrayBuffer()));
  if ('error' in clean) return { errors: { ficheiro: clean.error } };

  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const refusedPhoto = await guardContact(supabase, user.id, 'legenda de fotografia', { legenda });
  if (refusedPhoto) return refusedPhoto;
  const { count } = await supabase
    .from('request_photos')
    .select('id', { count: 'exact', head: true })
    .eq('request_id', requestId);
  if ((count ?? 0) >= MAX_PHOTOS_PER_REQUEST) {
    return { errors: {}, message: `Cada pedido tem no máximo ${MAX_PHOTOS_PER_REQUEST} fotografias.` };
  }

  const path = `${requestId}/${randomUUID()}.${clean.type === 'image/png' ? 'png' : 'jpg'}`;
  const upload = await supabase.storage.from('fotos').upload(path, clean.bytes, { contentType: clean.type });
  if (upload.error) {
    return { errors: {}, message: 'Não foi possível carregar a fotografia. O pedido tem de estar em rascunho.' };
  }
  const { error } = await supabase.from('request_photos').insert({
    request_id: requestId,
    kind: kind as PhotoKind,
    storage_path: path,
    legenda,
    submitted_by: user.id,
  });
  if (error) {
    await supabase.storage.from('fotos').remove([path]);
    return { errors: {}, message: 'Não foi possível registar a fotografia. Tente de novo.' };
  }
  revalidatePath(`/app/pedidos/${requestId}`);
  return {
    errors: {},
    ok: true,
    message: kind === 'pormenor' ? 'Fotografia enviada. Vai ser revista antes de chegar aos pintores.' : 'Fotografia guardada.',
  };
}

export async function deletePhoto(requestId: string, photoId: string) {
  const { supabase } = await getUser();
  const { data } = await supabase
    .from('request_photos')
    .delete()
    .eq('id', photoId)
    .eq('request_id', requestId)
    .select('storage_path');
  if (data && data.length > 0) await supabase.storage.from('fotos').remove(data.map((p) => p.storage_path));
  revalidatePath(`/app/pedidos/${requestId}`);
}

export async function reviewPhoto(photoId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const decision = String(form.get('decision') ?? '');
  const notas = String(form.get('notas') ?? '').trim() || null;
  if (decision !== 'aprovada' && decision !== 'rejeitada') return { errors: {}, message: 'Decisão inválida.' };
  if (decision === 'rejeitada' && !notas) return { errors: { notas: 'Explique o motivo ao cliente.' } };

  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  if (!(await isPlatformAdmin(supabase, user.id))) return { errors: {}, message: 'Sem permissão.' };
  const { data, error } = await supabase
    .from('request_photos')
    .update({ revisao: decision, notas_revisao: notas, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', photoId)
    .select('id');
  if (error || !data || data.length === 0) return { errors: {}, message: 'Não foi possível registar a decisão.' };
  revalidatePath('/app/validacao');
  return { errors: {}, ok: true, message: decision === 'aprovada' ? 'Aprovada para o anúncio.' : 'Fica fora do anúncio.' };
}
