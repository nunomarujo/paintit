'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { isValidPtIban, newReferralCode } from '@/domain/referral';
import { getUser } from '@/lib/supabase/server';

// Códigos de adesão do fornecedor (src/domain/referral.ts). O orgId e os ids vêm do navegador:
// as políticas RLS e as funções da base de dados garantem que só a equipa do fornecedor os altera.

const NOT_SIGNED_IN: FormState = { errors: {}, message: 'A sessão expirou. Entre de novo.' };
const path = (orgId: string) => `/app/organizacoes/${orgId}/adesoes`;

export async function createReferralCode(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const nota = String(form.get('nota') ?? '').trim().slice(0, 80) || null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newReferralCode();
    const { data, error } = await supabase.from('referral_codes').insert({ supplier_org_id: orgId, code, nota }).select('code').maybeSingle();
    if (!error && data) {
      revalidatePath(path(orgId));
      return { errors: {}, ok: true, message: `Código ${data.code} criado. Entregue-o ao pintor.` };
    }
    if (error?.code !== '23505') return { errors: {}, message: 'Não foi possível criar o código. Só gestores de um fornecedor o podem fazer.' };
  }
  return { errors: {}, message: 'Não foi possível gerar um código novo. Tente de novo.' };
}

export async function setReferralActive(orgId: string, codeId: string, active: boolean) {
  const { supabase } = await getUser();
  await supabase.from('referral_codes').update({ active: active === true }).eq('id', codeId).eq('supplier_org_id', orgId);
  revalidatePath(path(orgId));
}

export async function savePayoutDetails(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const iban = String(form.get('iban') ?? '').replace(/\s/g, '').toUpperCase();
  const titular = String(form.get('titular') ?? '').trim();
  const errors: Record<string, string> = {};
  if (!isValidPtIban(iban)) errors.iban = 'IBAN português inválido (PT50 e 21 algarismos).';
  if (titular.length < 2 || titular.length > 120) errors.titular = 'Indique o titular da conta.';
  if (Object.keys(errors).length) return { errors };
  const { error } = await supabase
    .from('supplier_payout_details')
    .upsert({ org_id: orgId, iban, titular, cobra_iva: form.get('cobraIva') === 'sim', updated_at: new Date().toISOString() }, { onConflict: 'org_id' });
  if (error) return { errors: {}, message: 'Não foi possível guardar. Só gestores do fornecedor o podem fazer.' };
  revalidatePath(path(orgId));
  return { errors: {}, ok: true, message: 'Dados de pagamento guardados.' };
}

export async function submitReferralInvoice(orgId: string, payoutId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const numero = String(form.get('numero') ?? '').trim();
  const file = form.get('ficheiro');
  if (!numero || numero.length > 40) return { errors: { numero: 'Indique o número da fatura.' } };
  if (!(file instanceof File) || file.size === 0) return { errors: { ficheiro: 'Escolha o PDF da fatura.' } };
  if (file.type !== 'application/pdf' || file.size > 5 * 1024 * 1024) return { errors: { ficheiro: 'PDF até 5 MB.' } };
  const storagePath = `${orgId}/${payoutId}.pdf`;
  const up = await supabase.storage.from('faturas-adesao').upload(storagePath, file, { contentType: 'application/pdf', upsert: false });
  if (up.error && !/exists|Duplicate/i.test(up.error.message)) return { errors: {}, message: 'Não foi possível enviar o ficheiro. Só gestores do fornecedor o podem fazer.' };
  const { error } = await supabase.rpc('referral_submit_invoice', { p_payout: payoutId, p_numero: numero, p_path: storagePath });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(path(orgId));
  return { errors: {}, ok: true, message: 'Fatura enviada. A plataforma paga a comissão por transferência.' };
}
