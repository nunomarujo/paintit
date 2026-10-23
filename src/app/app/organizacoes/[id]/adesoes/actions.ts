'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { sniffPdf } from '@/domain/fileSignature';
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
  const declaracao = String(form.get('retencao') ?? '');
  const cobraIva = form.get('iva') !== 'isento';
  const isencao = String(form.get('isencao') ?? '').trim().slice(0, 120);
  const errors: Record<string, string> = {};
  if (!isValidPtIban(iban)) errors.iban = 'IBAN português inválido (PT50 e 21 algarismos).';
  if (titular.length < 2 || titular.length > 120) errors.titular = 'Indique o titular da conta.';
  if (!['nao_sujeito', 'sujeito', 'dispensa'].includes(declaracao)) errors.retencao = 'Declare o regime de retenção na fonte.';
  if (!cobraIva && isencao.length < 3) errors.isencao = 'Indique o fundamento da isenção de IVA (por exemplo, art. 53.º do CIVA).';
  if (Object.keys(errors).length) return { errors };
  const { error } = await supabase.from('supplier_payout_details').upsert(
    {
      org_id: orgId,
      iban,
      titular,
      cobra_iva: cobraIva,
      isencao_iva: cobraIva ? null : isencao,
      declaracao_retencao: declaracao as 'nao_sujeito' | 'sujeito' | 'dispensa',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id' },
  );
  if (error) return { errors: {}, message: 'Não foi possível guardar. Só gestores do fornecedor o podem fazer.' };
  revalidatePath(path(orgId));
  return { errors: {}, ok: true, message: 'Dados guardados. A plataforma valida o regime antes do primeiro resgate.' };
}

export async function requestRedemption(orgId: string): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { error } = await supabase.rpc('referral_request_redemption', { p_org: orgId });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(path(orgId));
  return { errors: {}, ok: true, message: 'Resgate pedido. Envie agora a fatura.' };
}

export async function cancelRedemption(orgId: string, redemptionId: string): Promise<void> {
  const { supabase } = await getUser();
  await supabase.rpc('referral_redemption_cancel', { p_redemption: redemptionId, p_motivo: 'Cancelado pelo fornecedor' });
  revalidatePath(path(orgId));
}

export async function submitRedemptionInvoice(orgId: string, redemptionId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const numero = String(form.get('numero') ?? '').trim();
  const file = form.get('ficheiro');
  if (!numero || numero.length > 40) return { errors: { numero: 'Indique o número da fatura.' } };
  if (!(file instanceof File) || file.size === 0) return { errors: { ficheiro: 'Escolha o PDF da fatura.' } };
  if (file.size > 5 * 1024 * 1024) return { errors: { ficheiro: 'PDF até 5 MB.' } };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniffPdf(bytes)) return { errors: { ficheiro: 'O ficheiro não é um PDF.' } };
  const storagePath = `${orgId}/${redemptionId}.pdf`;
  const up = await supabase.storage.from('faturas-adesao').upload(storagePath, bytes, { contentType: 'application/pdf', upsert: false });
  if (up.error && !/exists|Duplicate/i.test(up.error.message)) return { errors: {}, message: 'Não foi possível enviar o ficheiro. Só gestores do fornecedor o podem fazer.' };
  const { error } = await supabase.rpc('referral_redemption_invoice', { p_redemption: redemptionId, p_numero: numero, p_path: storagePath });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(path(orgId));
  return { errors: {}, ok: true, message: 'Fatura enviada. A plataforma paga por transferência.' };
}
