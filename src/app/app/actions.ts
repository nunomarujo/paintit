'use server';

import { isCompanyNif, nameMatchesOfficial } from '@/domain/nif';
import { sniffPdf } from '@/domain/fileSignature';
import { sniffImage } from '@/domain/photo';
import { lookupNif } from '@/lib/nifpt';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  ALLOWED_DOCS,
  DOC_KINDS,
  MEMBER_ROLES,
  parseBuilding,
  parseEntityCard,
  parseInvite,
  parseOrganization,
  type BuildingInput,
  type DocKind,
  type FieldErrors,
  type MemberRole,
  type OrganizationInput,
  type OrgKind,
} from '@/domain/organization';
import { isPlatformAdmin } from '@/lib/access';
import { addressProblem } from '@/domain/address';
import { isForma } from '@/domain/volume';
import { isBuildingNeed } from '@/domain/buildingNeeds';
import type { StrikeInfo } from '@/domain/strikes';
import type { Database } from '@/lib/database.types';
import { lookupPostalCode } from '@/lib/postalCodes';
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
    alertas_autorizados: v.alertasAutorizados,
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

export type FormState = { errors: FieldErrors; message?: string; ok?: boolean; strike?: StrikeInfo };

/** A morada tem de existir: rua do código postal indicado (base dos CTT). */
async function addressErrors(morada: string | null, cp: string | null, moradaField: string): Promise<FieldErrors> {
  if (!cp) return {};
  const info = await lookupPostalCode(cp);
  if (info === 'indisponivel') return {};
  const problem = addressProblem(morada ?? '', cp, info);
  if (!problem) return {};
  return info ? { [moradaField]: problem } : { codigoPostal: problem };
}


/**
 * Confirma o NIPC e o nome na nif.pt (só pessoas coletivas; sem chave ou com o serviço em baixo, não
 * bloqueia). Devolve também o CAE/atividade da mesma consulta — para o aviso de elegibilidade de
 * pintura (`caeElegibilidade`, `src/domain/organization.ts`) ficar atualizado sempre que o NIF é
 * confirmado, em vez de se perder a informação que a nif.pt já tinha devolvido.
 */
async function nifCheck(nif: string | null, nome: string): Promise<{ errors: FieldErrors; cae: string | null; atividade: string | null }> {
  if (!nif || !isCompanyNif(nif)) return { errors: {}, cae: null, atividade: null };
  const r = await lookupNif(nif);
  if (r === 'indisponivel') return { errors: {}, cae: null, atividade: null };
  if (!r.found) return { errors: { nif: 'NIF não encontrado. Confirme os 9 algarismos.' }, cae: null, atividade: null };
  if (!r.ativo) return { errors: { nif: 'Este NIF consta como inativo.' }, cae: null, atividade: null };
  if (!nameMatchesOfficial(nome, r.nome)) {
    return { errors: { nome: 'O nome não corresponde ao titular deste NIF. Use a denominação oficial.' }, cae: null, atividade: null };
  }
  return { errors: {}, cae: r.cae, atividade: r.atividade };
}

const NOT_SIGNED_IN: FormState = { errors: {}, message: 'A sessão expirou. Entre de novo.' };

export async function createOrganization(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseOrganization(form);
  if (!parsed.value) return { errors: parsed.errors };
  const nif = await nifCheck(parsed.value.nif, parsed.value.nome);
  const addrErr = { ...(await addressErrors(parsed.value.moradaFiscal, parsed.value.codigoPostal, 'moradaFiscal')), ...nif.errors };
  if (Object.keys(addrErr).length) return { errors: addrErr };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;

  const v = parsed.value;
  const { data, error } = await supabase
    .from('organizations')
    .insert({ kind: v.kind, ...orgColumns(v), cae: nif.cae, cae_atividade: nif.atividade, created_by: user.id })
    .select('id')
    .single();
  if (error || !data) {
    // "Esta conta já tem outro perfil" / "uma conta de pintor ou de fornecedor corresponde a uma só
    // empresa" (private.one_profile_per_account, acionada pelo gatilho que torna o criador proprietário
    // logo a seguir a esta inserção, 20261020030000/20261020070000): mensagem já escrita para o
    // utilizador, com `errcode = 'P0001'` — mostrá-la em vez do aviso genérico, que até agora escondia
    // a causa real (auditoria de UX, 23/10/2026: o formulário "parecia" não gravar nunca, quando a causa
    // era sempre esta regra). Qualquer outro erro (tecnico, inesperado) mantém o aviso genérico.
    return {
      errors: {},
      message: error?.code === 'P0001' ? error.message : 'Não foi possível guardar. Confirme os dados e tente de novo.',
    };
  }

  // Código de quem o indicou (referências de fornecedores, src/domain/referralEligibility.ts): opcional, e um
  // código inválido ou já usado não impede o registo — só não se regista a referência.
  if (v.kind === 'fornecedor') {
    const codigoReferencia = String(form.get('codigoReferencia') ?? '').trim();
    if (codigoReferencia) await supabase.rpc('apply_supplier_referral_code', { p_org: data.id, p_code: codigoReferencia });
  }
  // Código de um convite de adesão de um fornecedor (docs/DECISOES.md, 23/10/2026): mesmo espírito —
  // opcional, um código inválido ou já usado não impede o registo, só não liga o convite.
  if (v.kind === 'pintor') {
    const codigoConvite = String(form.get('codigoConvite') ?? '').trim();
    if (codigoConvite) await supabase.rpc('claim_supplier_invite', { p_code: codigoConvite, p_org: data.id });
  }

  revalidatePath('/app');
  // Condomínio criado por uma gestora: o passo seguinte é sempre a ficha do prédio (morada completa,
  // NIPC já ficou na entidade, frações, pisos) — sem isso não se consegue pedir orçamento nenhum.
  // Levar lá diretamente, em vez de deixar a pessoa à procura do separador (promotor, 24/10/2026).
  if (v.kind === 'condominio' && v.geridaPor) redirect(`/app/organizacoes/${data.id}/predios/novo`);
  redirect(`/app/organizacoes/${data.id}`);
}

export async function createBuilding(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseBuilding(form);
  if (!parsed.value) return { errors: parsed.errors };
  const addrErr = await addressErrors(parsed.value.morada, parsed.value.codigoPostal, 'morada');
  if (Object.keys(addrErr).length) return { errors: addrErr };
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
  const nif = await nifCheck(parsed.value.nif, parsed.value.nome);
  const addrErr = { ...(await addressErrors(parsed.value.moradaFiscal, parsed.value.codigoPostal, 'moradaFiscal')), ...nif.errors };
  if (Object.keys(addrErr).length) return { errors: addrErr };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;

  // Só se escreve o CAE/atividade quando a consulta de agora trouxe algum (nunca se apaga um CAE já
  // conhecido por a nif.pt estar temporariamente indisponível, ou por este NIF em particular não trazer
  // atividade numa consulta — ausência de dados novos não é o mesmo que "deixou de ter CAE").
  const caePatch: { cae?: string | null; cae_atividade?: string | null } = {};
  if (nif.cae !== null) caePatch.cae = nif.cae;
  if (nif.atividade !== null) caePatch.cae_atividade = nif.atividade;

  // O tipo de entidade não muda depois de criada; .select() confirma que a RLS deixou alterar.
  const { data, error } = await supabase
    .from('organizations')
    .update({ ...orgColumns(parsed.value), ...caePatch })
    .eq('id', orgId)
    .select('id');
  if (error || !data || data.length === 0) {
    return { errors: {}, message: 'Não foi possível guardar. Só proprietários e gestores podem alterar estes dados.' };
  }
  revalidatePath(`/app/organizacoes/${orgId}`);
  redirect(`/app/organizacoes/${orgId}`);
}

/**
 * Guarda **um** campo das características do prédio, à medida que a pessoa escreve (pedido do promotor,
 * 24/10/2026: "sem botão gravar, grava à medida que se mete"). Propositadamente separado de
 * `updateBuilding`: esse valida o prédio inteiro (morada obrigatória, código postal contra a lista real),
 * e uma gravação a cada tecla não pode exigir que tudo o resto esteja válido ao mesmo tempo.
 *
 * O nome do campo chega do navegador por argumento ligado e **não é de confiança** (CLAUDE.md, regra 10):
 * por isso não se constrói nenhuma consulta com ele. Cada campo permitido tem aqui o seu próprio ramo,
 * com a sua própria leitura do valor; qualquer outro nome é recusado sem tocar na base de dados.
 */
export async function saveBuildingCharacteristic(
  orgId: string,
  buildingId: string,
  campo: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const bruto = String(form.get('valor') ?? '').trim();
  const inteiro = (max: number): number | null | 'erro' => {
    if (bruto === '') return null;
    const n = Number(bruto);
    return Number.isInteger(n) && n >= 0 && n <= max ? n : 'erro';
  };

  // Os mesmos limites de `parseBuilding` (src/domain/organization.ts): dois caminhos a gravar o mesmo
  // campo com regras diferentes seria um bug à espera de acontecer.
  const LIMITES: Record<string, [number, number]> = { pisos: [0, 100], fracoes: [0, 2000], fachadas: [0, 8], ano_construcao: [1500, 2100] };

  let patch: Database['public']['Tables']['buildings']['Update'];
  switch (campo) {
    case 'pisos':
    case 'fracoes':
    case 'fachadas':
    case 'ano_construcao': {
      const [min, max] = LIMITES[campo]!;
      const v = inteiro(max);
      if (v === 'erro' || (typeof v === 'number' && v < min)) return { errors: { valor: `Valor entre ${min} e ${max}.` } };
      patch = { [campo]: v };
      break;
    }
    case 'acessos':
    case 'artigo_matricial': {
      if (bruto.length > 500) return { errors: { valor: 'Até 500 caracteres.' } };
      patch = { [campo]: bruto || null };
      break;
    }
    case 'area_aproximada': {
      // Metros quadrados à vista, centésimos na base (mesma unidade do resto do projeto).
      if (bruto === '') {
        patch = { area_aproximada_cm2: null };
        break;
      }
      const m2 = Number(bruto.replace(',', '.'));
      if (!Number.isFinite(m2) || m2 < 0 || m2 > 1_000_000) return { errors: { valor: 'Indique a área em m².' } };
      patch = { area_aproximada_cm2: Math.round(m2 * 100) };
      break;
    }
    case 'obras_pretendidas': {
      // Chegam as assinaladas, todas de uma vez. Qualquer valor fora da lista do domínio é descartado:
      // o que vem do navegador não manda (CLAUDE.md, regra 10), e a base de dados ainda repete a
      // restrição por baixo.
      const escolhidas = form.getAll('obras').map(String).filter(isBuildingNeed);
      patch = { obras_pretendidas: [...new Set(escolhidas)] };
      break;
    }
    case 'forma_implantacao': {
      // Uma das cinco formas canónicas. O que vier do navegador fora da lista é recusado (regra 10);
      // a restrição da base de dados repete a verificação por baixo.
      if (!isForma(bruto)) return { errors: { valor: 'Forma desconhecida.' } };
      patch = { forma_implantacao: bruto };
      break;
    }
    case 'tem_varandas':
    case 'tem_elevador':
      patch = { [campo]: bruto === 'sim' };
      break;
    default:
      return { errors: {}, message: 'Campo desconhecido.' };
  }

  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { data, error } = await supabase.from('buildings').update(patch).eq('id', buildingId).eq('org_id', orgId).select('id');
  if (error || !data || data.length === 0) {
    return { errors: {}, message: 'Não foi possível guardar. Só proprietários e gestores podem alterar o prédio.' };
  }
  revalidatePath(`/app/organizacoes/${orgId}`);
  return { errors: {}, ok: true, message: 'Guardado.' };
}

/**
 * Identificação e morada do prédio, só isso. Existe porque a ficha do prédio passou a gravar as
 * características sozinha, campo a campo (`saveBuildingCharacteristic`): se o formulário da morada
 * continuasse a escrever o prédio inteiro, cada gravação da morada **apagava** as características que
 * não vêm nesse formulário — os campos ausentes chegam a `parseBuilding` como vazios e `buildingColumns`
 * escreve-os a null.
 */
export async function updateBuildingIdentity(orgId: string, buildingId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseBuilding(form);
  if (!parsed.value) return { errors: parsed.errors };
  const addrErr = await addressErrors(parsed.value.morada, parsed.value.codigoPostal, 'morada');
  if (Object.keys(addrErr).length) return { errors: addrErr };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const v = parsed.value;
  const { data, error } = await supabase
    .from('buildings')
    .update({
      nome_interno: v.nomeInterno,
      tipo: v.tipo,
      morada: v.morada,
      codigo_postal: v.codigoPostal,
      localidade: v.localidade,
      concelho: v.concelho,
    })
    .eq('id', buildingId)
    .eq('org_id', orgId)
    .select('id');
  if (error || !data || data.length === 0) {
    return { errors: {}, message: 'Não foi possível guardar. Só proprietários e gestores podem alterar o prédio.' };
  }
  revalidatePath(`/app/organizacoes/${orgId}`);
  return { errors: {}, ok: true, message: 'Guardado.' };
}

export async function updateBuilding(
  orgId: string,
  buildingId: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = parseBuilding(form);
  if (!parsed.value) return { errors: parsed.errors };
  const addrErr = await addressErrors(parsed.value.morada, parsed.value.codigoPostal, 'morada');
  if (Object.keys(addrErr).length) return { errors: addrErr };
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

/**
 * Mudar o papel de um colega em "Equipa online" (26/10/2026, docs/DECISOES.md): o `<select>` da linha
 * do membro submete-se a si próprio quando muda. `role` chega dentro do `FormData`, do navegador, e não
 * é de confiança (CLAUDE.md, regra 10): valida-se aqui contra a lista real de papéis, e nunca para
 * 'proprietario' (só há um, atribuído na criação da entidade — isto é uma troca de papel entre os
 * outros, não uma sucessão). Quem decide de facto é a política `org_members_update` (RLS, migração
 * 20261026210000): só o proprietário, nunca o seu próprio papel. Falhar em silêncio como `removeMember`
 * é aceitável aqui: o `<select>` já só oferece papéis válidos e já não aparece na própria linha do
 * proprietário.
 */
export async function changeMemberRole(orgId: string, userId: string, form: FormData) {
  const role = String(form.get('role') ?? '');
  if (!(MEMBER_ROLES as readonly string[]).includes(role) || role === 'proprietario') return;
  const { supabase, user } = await getUser();
  if (!user || user.id === userId) return;
  await supabase.from('org_members').update({ role: role as MemberRole }).eq('org_id', orgId).eq('user_id', userId);
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

/**
 * O cartão de topo de "O meu Perfil" (26/10/2026, docs/DECISOES.md): nome da empresa e contactos ficam
 * em `organizations`; o nome do gerente é o nome pessoal de quem está a editar e grava-se em `profiles`,
 * como já fazia `updateProfile` — aqui os dois gravam-se juntos, num único formulário, porque é assim
 * que aparecem ao utilizador neste ecrã.
 */
export async function updateEntityCard(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseEntityCard(form);
  if (!parsed.value) return { errors: parsed.errors };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;

  const v = parsed.value;
  const { data, error } = await supabase
    .from('organizations')
    .update({ nome: v.nome, telefone: v.telefone, email_contacto: v.emailContacto })
    .eq('id', orgId)
    .select('id');
  if (error || !data || data.length === 0) {
    return { errors: {}, message: 'Não foi possível guardar. Só proprietários e gestores podem alterar estes dados.' };
  }

  const { error: perfilError } = await supabase.from('profiles').update({ nome: v.gerenteNome }).eq('user_id', user.id);
  if (perfilError) return { errors: {}, message: 'Os dados da empresa ficaram guardados, mas o nome do gerente não.' };

  revalidatePath(`/app/organizacoes/${orgId}`);
  revalidatePath('/app', 'layout');
  return { errors: {}, ok: true, message: 'Guardado.' };
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
  revalidatePath('/app/backoffice', 'layout');
  return { errors: {}, ok: true, message: decision === 'aprovado' ? 'Aprovado.' : 'Rejeitado.' };
}

const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadDocument(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const kind = String(form.get('kind') ?? '');
  const file = form.get('ficheiro');
  const validoAte = String(form.get('validoAte') ?? '').trim() || null;
  const errors: FieldErrors = {};
  if (!(DOC_KINDS as readonly string[]).includes(kind)) errors.kind = 'Escolha o tipo de documento.';
  if (!(file instanceof File) || file.size === 0) errors.ficheiro = 'Escolha um ficheiro.';
  else if (file.size > MAX_BYTES) errors.ficheiro = 'O ficheiro tem mais de 10 MB.';
  if (validoAte && !/^\d{4}-\d{2}-\d{2}$/.test(validoAte)) errors.validoAte = 'Data inválida.';
  const classeRaw = String(form.get('classe') ?? '').trim();
  const classe = kind === 'alvara_impic' && classeRaw ? Number(classeRaw) : null;
  if (kind === 'alvara_impic' && (!classe || !Number.isInteger(classe) || classe < 1 || classe > 9)) {
    errors.classe = 'Indique a classe do alvará (1 a 9).';
  }
  if (Object.keys(errors).length > 0) return { errors };

  // O tipo que o navegador diz vem do ficheiro escolhido, não é prova de nada: confirma-se pelos bytes.
  const f = file as File;
  const bytes = new Uint8Array(await f.arrayBuffer());
  const contentType = sniffPdf(bytes) ? 'application/pdf' : sniffImage(bytes);
  if (!contentType) return { errors: { ficheiro: 'Só PDF, JPG ou PNG — o ficheiro não corresponde a nenhum destes formatos.' } };

  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  // O tipo de documento vem do navegador: confirmar que faz sentido para esta entidade.
  const { data: owner } = await supabase.from('organizations').select('kind').eq('id', orgId).maybeSingle();
  if (!owner || !ALLOWED_DOCS[owner.kind as OrgKind].includes(kind as DocKind)) return { errors: { kind: 'Este documento não se aplica a esta entidade.' } };
  const ext = contentType === 'application/pdf' ? 'pdf' : contentType === 'image/png' ? 'png' : 'jpg';
  const path = `${orgId}/${randomUUID()}.${ext}`;

  const upload = await supabase.storage.from('documentos').upload(path, bytes, { contentType });
  if (upload.error) return { errors: {}, message: 'Não foi possível carregar o ficheiro.' };

  const { error } = await supabase.from('org_documents').insert({
    org_id: orgId,
    kind: kind as DocKind,
    storage_path: path,
    nome_ficheiro: f.name.slice(0, 200),
    valido_ate: validoAte,
    classe,
    submitted_by: user.id,
  });
  if (error) return { errors: {}, message: 'O ficheiro foi carregado mas não ficou registado. Tente de novo.' };

  revalidatePath(`/app/organizacoes/${orgId}`);
  return { errors: {}, ok: true, message: 'Documento enviado para validação.' };
}

export async function deleteOrganization(orgId: string, ...[]: [FormState]): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  // A função na base confirma que é o proprietário e que a entidade não tem histórico.
  const { error } = await supabase.rpc('delete_organization', { p_org: orgId });
  if (error) return { errors: {}, message: error.message };
  revalidatePath('/app');
  redirect('/app');
}
