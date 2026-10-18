'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { DOC_KINDS, parseBuilding, parseOrganization, type DocKind, type FieldErrors } from '@/domain/organization';
import { getUser } from '@/lib/supabase/server';

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
    .insert({
      kind: v.kind,
      nome: v.nome,
      nif: v.nif,
      morada_fiscal: v.moradaFiscal,
      codigo_postal: v.codigoPostal,
      localidade: v.localidade,
      email_contacto: v.emailContacto,
      telefone: v.telefone,
      atendimento_publico: v.atendimentoPublico,
      gerida_por: v.geridaPor,
      created_by: user.id,
    })
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

  const v = parsed.value;
  const { error } = await supabase.from('buildings').insert({
    org_id: orgId,
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
    created_by: user.id,
  });
  if (error) return { errors: {}, message: 'Não foi possível guardar o prédio. Só gestores da entidade o podem fazer.' };

  revalidatePath(`/app/organizacoes/${orgId}`);
  redirect(`/app/organizacoes/${orgId}`);
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
