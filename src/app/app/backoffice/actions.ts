'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { getUser } from '@/lib/supabase/server';

export async function reportListing(requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const motivo = String(form.get('motivo') ?? '').trim();
  // IMG-10: descrever sem reproduzir o dado identificativo.
  if (motivo.length < 10) return { errors: { motivo: 'Descreva o problema sem copiar o dado que identifica o cliente.' } };
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };
  const { error } = await supabase.from('listing_reports').insert({ request_id: requestId, motivo: motivo.slice(0, 1000), reporter: user.id });
  if (error) return { errors: {}, message: 'Não foi possível enviar a denúncia.' };
  return { errors: {}, ok: true, message: 'Obrigado. A equipa da plataforma vai rever o anúncio.' };
}

export async function resolveReport(reportId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const decision = String(form.get('decision') ?? '');
  const resolucao = String(form.get('resolucao') ?? '').trim();
  if (!resolucao) return { errors: { resolucao: 'Explique a decisão (o cliente vê-a se o anúncio for suspenso).' } };
  const { supabase } = await getUser();
  const { error } = await supabase.rpc('resolve_listing_report', {
    p_report: reportId,
    p_suspend: decision === 'suspender',
    p_resolucao: resolucao,
  });
  if (error) return { errors: {}, message: error.message };
  revalidatePath('/app/backoffice');
  return { errors: {}, ok: true, message: decision === 'suspender' ? 'Anúncio suspenso.' : 'Denúncia arquivada.' };
}
