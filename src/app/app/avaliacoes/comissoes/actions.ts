'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { getUser } from '@/lib/supabase/server';
import { erroDoNifPessoal } from '@/domain/convocatoria';
import { normalizeNif } from '@/domain/nif';
import { isValidPtIban } from '@/domain/referral';
import { sniffPdf } from '@/domain/fileSignature';

const NOT_SIGNED_IN: FormState = { errors: {}, message: 'Sessão terminada.' };
const CAMINHO = '/app/avaliacoes/comissoes';

/**
 * As comissões dos levantamentos são da pessoa (05/11/2026): os dados para as receber, o pedido de resgate e o
 * recibo. Nada aqui recebe um identificador de pessoa do navegador — o dono é sempre quem está em sessão
 * (regra 10), e a base volta a verificá-lo em cada função.
 */
export async function guardarDadosDePagamento(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;

  const nif = normalizeNif(String(form.get('nif') ?? ''));
  const titular = String(form.get('titular') ?? '').trim().slice(0, 120);
  const iban = String(form.get('iban') ?? '').replace(/\s/g, '').toUpperCase();
  const documento = form.get('documento') === 'recibo_verde' ? 'recibo_verde' : form.get('documento') === 'ato_isolado' ? 'ato_isolado' : null;
  const cobraIva = form.get('iva') === 'normal';
  const isencao = String(form.get('isencao') ?? '').trim().slice(0, 120);
  const declaracao = String(form.get('retencao') ?? '');

  const errors: Record<string, string> = {};
  const erroNif = erroDoNifPessoal(nif);
  if (erroNif) errors.nif = erroNif;
  if (titular.length < 2) errors.titular = 'Indique o nome completo, como aparece nas Finanças.';
  if (!isValidPtIban(iban)) errors.iban = 'Indique um IBAN português válido (PT50…).';
  if (!documento) errors.documento = 'Escolha o documento que vai emitir.';
  if (!cobraIva && isencao.length < 3) errors.isencao = 'Indique o fundamento da isenção de IVA (por exemplo, art. 53.º do CIVA).';
  if (!['nao_sujeito', 'sujeito', 'dispensa'].includes(declaracao)) errors.retencao = 'Declare o regime de retenção na fonte.';
  if (Object.keys(errors).length) return { errors };

  const { error } = await supabase.from('avaliador_payout_details').upsert(
    {
      user_id: user.id,
      nif,
      titular,
      iban,
      documento: documento!,
      cobra_iva: cobraIva,
      isencao_iva: cobraIva ? null : isencao,
      declaracao_retencao: declaracao as 'nao_sujeito' | 'sujeito' | 'dispensa',
    },
    { onConflict: 'user_id' },
  );
  if (error) return { errors: {}, message: 'Não foi possível guardar.' };
  revalidatePath(CAMINHO);
  return { errors: {}, ok: true, message: 'Guardado. A plataforma valida os dados antes do primeiro resgate.' };
}

export async function pedirResgate(): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { error } = await supabase.rpc('avaliador_pedir_resgate');
  if (error) return { errors: {}, message: error.message };
  revalidatePath(CAMINHO);
  return { errors: {}, ok: true, message: 'Resgate pedido. Emita agora o recibo nas Finanças e envie-o aqui.' };
}

export async function enviarRecibo(redemptionId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const numero = String(form.get('numero') ?? '').trim();
  const file = form.get('ficheiro');
  if (!numero || numero.length > 40) return { errors: { numero: 'Indique o número do recibo.' } };
  if (!(file instanceof File) || file.size === 0) return { errors: { ficheiro: 'Escolha o PDF do recibo.' } };
  if (file.size > 5 * 1024 * 1024) return { errors: { ficheiro: 'PDF até 5 MB.' } };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniffPdf(bytes)) return { errors: { ficheiro: 'O ficheiro não é um PDF.' } };
  // O identificador do resgate vem do navegador: a função da base só aceita um resgate desta pessoa e um
  // caminho na pasta desta pessoa (regra 10).
  const caminho = `${user.id}/levantamento-${redemptionId}.pdf`;
  const up = await supabase.storage.from('faturas-adesao').upload(caminho, bytes, { contentType: 'application/pdf', upsert: false });
  if (up.error && !/exists|Duplicate/i.test(up.error.message)) return { errors: {}, message: 'Não foi possível enviar o ficheiro.' };
  const { error } = await supabase.rpc('survey_redemption_invoice', { p_redemption: redemptionId, p_numero: numero, p_path: caminho });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(CAMINHO);
  return { errors: {}, ok: true, message: 'Recibo enviado. A plataforma paga por transferência.' };
}

export async function anularResgate(redemptionId: string): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { error } = await supabase.rpc('survey_redemption_cancel', { p_redemption: redemptionId, p_motivo: 'Anulado pelo avaliador' });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(CAMINHO);
  return { errors: {}, ok: true, message: 'Resgate anulado. O saldo volta a estar disponível.' };
}
