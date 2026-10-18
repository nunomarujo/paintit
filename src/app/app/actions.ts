'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  DOC_KINDS,
  parseBuilding,
  parseInvite,
  parseOrganization,
  type BuildingInput,
  type DocKind,
  type FieldErrors,
  type OrganizationInput,
} from '@/domain/organization';
import { isPlatformAdmin } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';

function orgColumns(v: OrganizationInput) {
  return {
    nome: v.nome,
    nif: v.nif,
    morada_fiscal: v.moradaFiscal,
    codigo_postal: v.codigoPostal,
    localidade: v.localidade,
    email_contacto: v.emailContacto,
    telefone: v.telefone,
    atendimento_publico: v.atendimentoPublico,
    gerida_por: v.geridaPor,
  };
}

function buildingColumns(v: BuildingInput) {
  return {
    nome_interno: v.nomeInterno,
    tipo: v.tipo,
    morada: v.morada,
    codigo_postal: v.codigoPostal,
    localidade: v.localidade,
    concelho: v.concelho,
    artigo_matricial: v.artigoMatricial,
    pisos: v.pisos,
    fracoes: v.fracoes,
    fachadas: v.fachadas,
    ano_construcao: v.anoConstrucao,
    tem_varandas: v.temVarandas,
    tem_elevador: v.temElevador,
    acessos: v.acessos,
  };
}

export type FormState = { errors: FieldErrors; message?: string; ok?: boolean };

const NOT_SIGNED_IN: FormState = { errors: {}, message: 'A sessão expirou. Entre de novo.' };

export async function createOrganization(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseOrganization(form);
  if (!parsed.value) return { errors: parsed.errors };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;

  const v = parsed.value;
  const { data, error } = await supabase
    .from('organizations')
    .insert({ kind: v.kind, ...orgColumns(v), created_by: user.id })
    .select('id')
    .single();
  if (error || !data) return { errors: {}, message: 'Não foi possível guardar. Confirme os dados e tente de novo.' };

  revalidatePath('/app');
  redirect(`/app/organizacoes/${data.id}`);
}

export async function createBuilding(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseBuilding(form);
  if (!parsed.value) return { errors: parsed.errors };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;

  const { error } = await supabase
    .from('buildings')
    .insert({ org_id: orgId, ...buildingColumns(parsed.value), created_by: user.id });
  if (error) return { errors: {}, message: 'Não foi possível guardar o prédio. Só gestores da entidade o podem fazer.' };

  revalidatePath(`/app/organizacoes/${orgId}`);
  redirect(`/app/organizacoes/${orgId}`);
}

export async function updateOrganization(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseOrganization(form);
  if (!parsed.value) return { errors: parsed.errors };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;

  // O tipo de entidade não muda depois de criada; .select() confirma que a RLS deixou alterar.
  const { data, error } = await supabase.from('organizations').update(orgColumns(parsed.value)).eq('id', orgId).select('id');
  if (error || !data || data.length === 0) {
    return { errors: {}, message: 'Não foi possível guardar. Só proprietários e gestores podem alterar estes dados.' };
  }
  revalidatePath(`/app/organizacoes/${orgId}`);
  redirect(`/app/organizacoes/${orgId}`);
}

export async function updateBuilding(
  orgId: string,
  buildingId: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = parseBuilding(form);
  if (!parsed.value) return { errors: parsed.errors };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;

  const { data, error } = await supabase
    .from('buildings')
    .update(buildingColumns(parsed.value))
    .eq('id', buildingId)
    .eq('org_id', orgId)
    .select('id');
  if (error || !data || data.length === 0) {
    return { errors: {}, message: 'Não foi possível guardar o prédio. Só proprietários e gestores o podem alterar.' };
  }
  revalidatePath(`/app/organizacoes/${orgId}`);
  redirect(`/app/organizacoes/${orgId}`);
}

export async function inviteMember(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseInvite(form);
  if (!parsed.value) return { errors: parsed.errors };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;

  const { error } = await supabase
    .from('org_invitations')
    .insert({ org_id: orgId, email: parsed.value.email, role: parsed.value.role, invited_by: user.id });
  if (error) {
    const duplicate = error.code === '23505';
    return {
      errors: {},
      message: duplicate ? 'Já existe um convite pendente para este email.' : 'Só o proprietário pode convidar.',
    };
  }
  revalidatePath(`/app/organizacoes/${orgId}`);
  return {
    errors: {},
    ok: true,
    message: `Convite criado. Peça a ${parsed.value.email} que entre na plataforma com este email para o aceitar.`,
  };
}

export async function cancelInvitation(orgId: string, invitationId: string) {
  const { supabase } = await getUser();
  await supabase.from('org_invitations').delete().eq('id', invitationId).eq('org_id', orgId);
  revalidatePath(`/app/organizacoes/${orgId}`);
}

export async function removeMember(orgId: string, userId: string) {
  const { supabase } = await getUser();
  await supabase.from('org_members').delete().eq('org_id', orgId).eq('user_id', userId);
  revalidatePath(`/app/organizacoes/${orgId}`);
}

export async function acceptInvitation(invitationId: string) {
  const { supabase, user } = await getUser();
  if (!user) redirect('/entrar');

  const { data: inv } = await supabase
    .from('org_invitations')
    .select('id, org_id, role, accepted_at, expires_at')
    .eq('id', invitationId)
    .maybeSingle();
  if (!inv || inv.accepted_at || new Date(inv.expires_at) < new Date()) {
    redirect('/app?convite=invalido');
  }

  // A política só deixa entrar com o papel exato de um convite pendente para o email da conta.
  const joined = await supabase.from('org_members').insert({ org_id: inv.org_id, user_id: user.id, role: inv.role });
  if (joined.error && joined.error.code !== '23505') redirect('/app?convite=invalido');
  await supabase
    .from('org_invitations')
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq('id', inv.id);

  revalidatePath('/app');
  redirect(`/app/organizacoes/${inv.org_id}`);
}

export async function updateProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const nome = String(form.get('nome') ?? '').trim();
  const telefone = String(form.get('telefone') ?? '').trim() || null;
  if (!nome) return { errors: { nome: 'Indique o seu nome.' } };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;

  const { error } = await supabase.from('profiles').update({ nome, telefone }).eq('user_id', user.id);
  if (error) return { errors: {}, message: 'Não foi possível guardar.' };
  revalidatePath('/app/perfil');
  return { errors: {}, ok: true, message: 'Perfil guardado.' };
}

export async function reviewDocument(documentId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const decision = String(form.get('decision') ?? '');
  const notas = String(form.get('notas') ?? '').trim() || null;
  if (decision !== 'aprovado' && decision !== 'rejeitado') return { errors: {}, message: 'Decisão inválida.' };
  if (decision === 'rejeitado' && !notas) return { errors: { notas: 'Explique o motivo da rejeição.' } };

  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  if (!(await isPlatformAdmin(supabase, user.id))) return { errors: {}, message: 'Sem permissão.' };

  const { data, error } = await supabase
    .from('org_documents')
    .update({
      status: decision,
      notas_validacao: notas,
      validated_by: user.id,
      validated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .select('id');
  if (error || !data || data.length === 0) return { errors: {}, message: 'Não foi possível registar a decisão.' };
  revalidatePath('/admin/documentos');
  return { errors: {}, ok: true, message: decision === 'aprovado' ? 'Aprovado.' : 'Rejeitado.' };
}

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export async function uploadDocument(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const kind = String(form.get('kind') ?? '');
  const file = form.get('ficheiro');
  const validoAte = String(form.get('validoAte') ?? '').trim() || null;
  const errors: FieldErrors = {};
  if (!(DOC_KINDS as readonly string[]).includes(kind)) errors.kind = 'Escolha o tipo de documento.';
  if (!(file instanceof File) || file.size === 0) errors.ficheiro = 'Escolha um ficheiro.';
  else if (file.size > MAX_BYTES) errors.ficheiro = 'O ficheiro tem mais de 10 MB.';
  else if (!ALLOWED_TYPES.includes(file.type)) errors.ficheiro = 'Só PDF, JPG ou PNG.';
  if (validoAte && !/^\d{4}-\d{2}-\d{2}$/.test(validoAte)) errors.validoAte = 'Data inválida.';
  if (Object.keys(errors).length > 0) return { errors };

  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const f = file as File;
  const ext = f.type === 'application/pdf' ? 'pdf' : f.type === 'image/png' ? 'png' : 'jpg';
  const path = `${orgId}/${randomUUID()}.${ext}`;

  const upload = await supabase.storage.from('documentos').upload(path, f, { contentType: f.type });
  if (upload.error) return { errors: {}, message: 'Não foi possível carregar o ficheiro.' };

  const { error } = await supabase.from('org_documents').insert({
    org_id: orgId,
    kind: kind as DocKind,
    storage_path: path,
    nome_ficheiro: f.name.slice(0, 200),
    valido_ate: validoAte,
    submitted_by: user.id,
  });
  if (error) return { errors: {}, message: 'O ficheiro foi carregado mas não ficou registado. Tente de novo.' };

  revalidatePath(`/app/organizacoes/${orgId}`);
  return { errors: {}, ok: true, message: 'Documento enviado para validação.' };
}
