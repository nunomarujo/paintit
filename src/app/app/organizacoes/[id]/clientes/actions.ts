'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { newReferralCode } from '@/domain/referral';
import { notifySupplierInvite } from '@/lib/notify';
import { getUser } from '@/lib/supabase/server';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Mesmo formato de `referral_codes.code` (migração `codigos_de_adesao`): só letras e números, 6 a 12. */
const CODE_RE = /^[A-Z0-9]{6,12}$/;

/** Convite de adesão a um pintor que a empresa conhece mas ainda não está na plataforma (decisão de
 * 23/10/2026, docs/DECISOES.md): gera um código de adesão normal (o mesmo mecanismo de /adesoes, só
 * criado por aqui) e envia-o por email, em vez de depender do pintor o descobrir por fora. Nome, email,
 * telefone e morada/localização de quem é convidado; código promocional opcional (em vez de um gerado ao
 * acaso) para o fornecedor usar algo memorável ao transmitir o convite por fora do email também. */
export async function inviteSupplierPainter(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const nome = String(form.get('nome') ?? '').trim().slice(0, 120);
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const telefone = String(form.get('telefone') ?? '').trim().slice(0, 30);
  const morada = String(form.get('morada') ?? '').trim().slice(0, 200);
  const codigoInput = String(form.get('codigo') ?? '').trim().toUpperCase();
  if (!nome) return { errors: { nome: 'Indique o nome.' } };
  if (!EMAIL.test(email)) return { errors: { email: 'Indique um email válido.' } };
  if (!telefone) return { errors: { telefone: 'Indique o telefone.' } };
  if (!morada) return { errors: { morada: 'Indique a morada, sede ou localização.' } };
  if (codigoInput && !CODE_RE.test(codigoInput)) return { errors: { codigo: 'O código só pode ter letras e números (6 a 12 carateres).' } };
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };

  const mk = (c: string) => supabase.from('referral_codes').insert({ supplier_org_id: orgId, code: c, nota: `Convite: ${nome}`.slice(0, 80) });
  let code: string | null = null;
  if (codigoInput) {
    const { error } = await mk(codigoInput);
    if (error) return error.code === '23505' ? { errors: { codigo: 'Esse código já está em uso. Escolha outro.' } } : { errors: {}, message: 'Não foi possível criar o convite. Só gestores do fornecedor o podem fazer.' };
    code = codigoInput;
  } else {
    for (let attempt = 0; attempt < 5 && !code; attempt++) {
      const candidate = newReferralCode();
      const { error } = await mk(candidate);
      if (!error) code = candidate;
      else if (error.code !== '23505') return { errors: {}, message: 'Não foi possível criar o convite. Só gestores do fornecedor o podem fazer.' };
    }
    if (!code) return { errors: {}, message: 'Não foi possível gerar um código novo. Tente de novo.' };
  }

  const { data: created } = await supabase.from('referral_codes').select('id').eq('code', code).single();
  const { error: inviteError } = await supabase
    .from('supplier_painter_invites')
    .insert({ org_id: orgId, referral_code_id: created!.id, nome, email, telefone, morada, created_by: user.id });
  if (inviteError) return { errors: {}, message: 'Convite criado, mas não foi possível registá-lo na lista.' };

  const [{ data: org }, { data: profile }] = await Promise.all([
    supabase.from('organizations').select('nome').eq('id', orgId).maybeSingle(),
    supabase.from('profiles').select('nome').eq('user_id', user.id).maybeSingle(),
  ]);
  await notifySupplierInvite(email, org?.nome ?? 'Um fornecedor', profile?.nome ?? null, code);

  revalidatePath(`/app/organizacoes/${orgId}/clientes`);
  return { errors: {}, ok: true, message: `Convite enviado a ${email}.` };
}

export async function saveCustomerProfile(orgId: string, painterOrgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };
  const premium = form.get('premium') === 'on';
  const nota = String(form.get('nota') ?? '').trim().slice(0, 2000);
  const { error } = await supabase
    .from('supplier_customers')
    .upsert({ org_id: orgId, painter_org_id: painterOrgId, premium, nota, updated_by: user.id }, { onConflict: 'org_id,painter_org_id' });
  if (error) return { errors: {}, message: 'Não foi possível guardar. Só gestores do fornecedor o podem fazer.' };
  revalidatePath(`/app/organizacoes/${orgId}/clientes/${painterOrgId}`);
  revalidatePath(`/app/organizacoes/${orgId}/clientes`);
  return { errors: {}, ok: true, message: 'Guardado.' };
}
