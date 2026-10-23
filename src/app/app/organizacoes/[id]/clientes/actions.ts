'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { newReferralCode } from '@/domain/referral';
import { notifySupplierInvite } from '@/lib/notify';
import { getUser } from '@/lib/supabase/server';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Convite de adesão a um pintor que a empresa conhece mas ainda não está na plataforma (decisão de
 * 23/10/2026, docs/DECISOES.md): gera um código de adesão normal (o mesmo mecanismo de /adesoes, só
 * criado por aqui) e envia-o por email, em vez de depender do pintor o descobrir por fora. */
export async function inviteSupplierPainter(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const nome = String(form.get('nome') ?? '').trim().slice(0, 120);
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!nome) return { errors: { nome: 'Indique o nome.' } };
  if (!EMAIL.test(email)) return { errors: { email: 'Indique um email válido.' } };
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };

  let code: string | null = null;
  for (let attempt = 0; attempt < 5 && !code; attempt++) {
    const candidate = newReferralCode();
    const { error } = await supabase.from('referral_codes').insert({ supplier_org_id: orgId, code: candidate, nota: `Convite: ${nome}`.slice(0, 80) });
    if (!error) code = candidate;
    else if (error.code !== '23505') return { errors: {}, message: 'Não foi possível criar o convite. Só gestores do fornecedor o podem fazer.' };
  }
  if (!code) return { errors: {}, message: 'Não foi possível gerar um código novo. Tente de novo.' };

  const { data: created } = await supabase.from('referral_codes').select('id').eq('code', code).single();
  const { error: inviteError } = await supabase
    .from('supplier_painter_invites')
    .insert({ org_id: orgId, referral_code_id: created!.id, nome, email, created_by: user.id });
  if (inviteError) return { errors: {}, message: 'Convite criado, mas não foi possível registá-lo na lista.' };

  const { data: org } = await supabase.from('organizations').select('nome').eq('id', orgId).maybeSingle();
  await notifySupplierInvite(email, org?.nome ?? 'Um fornecedor', code);

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
