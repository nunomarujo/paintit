'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { getUser } from '@/lib/supabase/server';

/**
 * Avisos por WhatsApp para qualquer pessoa — cliente, pintor ou avaliador (05/11/2026). A preferência é da
 * pessoa e vive onde já vivia a dos avaliadores (`survey_availability`): uma pessoa tem um consentimento, não um
 * por papel. O dono da linha é sempre quem está em sessão (regra 10: nada que identifique a pessoa vem do navegador).
 *
 * **O número já não se escreve** (06/11/2026): confirma-se por mensagem recebida desse número. Cada pessoa
 * pede um código aqui, envia-o por WhatsApp para a plataforma, e é o webhook que liga o número à conta
 * (`confirmar_numero_whatsapp`). Quem escrevesse o número à mão podia receber avisos no telemóvel de outra pessoa.
 * A base recusa qualquer escrita direta em `survey_availability.telemovel_whatsapp`.
 */

const REVALIDAR = () => {
  revalidatePath('/app/perfil');
  revalidatePath('/app/avaliacoes/inscricao');
  revalidatePath('/app/avaliacoes/disponibilidade');
  revalidatePath('/app/contratacoes/[id]', 'page');
};

export interface NumeroDeWhatsApp {
  id: string;
  numero: string;
  confirmadoEm: string;
}

/** Os números em vigor da pessoa em sessão (a RLS só deixa ver os seus). */
export async function numerosDeWhatsApp(): Promise<NumeroDeWhatsApp[]> {
  const { supabase, user } = await getUser();
  if (!user) return [];
  const { data } = await supabase.from('whatsapp_numeros').select('id, numero, confirmado_em').eq('user_id', user.id).order('confirmado_em');
  return (data ?? []).map((n) => ({ id: n.id, numero: n.numero, confirmadoEm: n.confirmado_em }));
}

/** O consentimento. Sem pelo menos um número confirmado não há nada a ligar. */
export async function guardarAvisosPorWhatsApp(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou. Entre de novo.' };

  const ligado = form.get('alerta_whatsapp') === 'on';
  if (ligado && (await numerosDeWhatsApp()).length === 0) {
    return { errors: { alerta_whatsapp: 'Para receber por WhatsApp, associe primeiro um número.' } };
  }
  // Só o consentimento: o número não vem deste formulário.
  const { error } = await supabase.from('survey_availability').upsert({ user_id: user.id, alerta_whatsapp: ligado }, { onConflict: 'user_id' });
  if (error) return { errors: {}, message: 'Não foi possível guardar.' };

  REVALIDAR();
  return {
    errors: {},
    ok: true,
    message: ligado ? 'Guardado: os avisos de trabalho seguem também por WhatsApp.' : 'Guardado: sem WhatsApp.',
  };
}

/** Pede o código de associação. Devolve-o em claro uma só vez: na base fica o resumo. */
export async function pedirCodigoDeWhatsApp(): Promise<{ codigo?: string; erro?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { erro: 'A sessão expirou. Entre de novo.' };
  const { data, error } = await supabase.rpc('pedir_codigo_whatsapp');
  if (error || !data) {
    // As mensagens das nossas regras (P0001, 42501) são para a pessoa ler; outras, não.
    return { erro: error && (error.code === 'P0001' || error.code === '42501') ? error.message : 'Não foi possível pedir o código. Tente de novo.' };
  }
  return { codigo: data };
}

export async function removerNumeroDeWhatsApp(id: string): Promise<{ ok: boolean }> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false };
  // O identificador vem do navegador (regra 10): a função só apaga um número desta pessoa.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false };
  const { error } = await supabase.rpc('remover_numero_whatsapp', { p_id: id });
  if (error) return { ok: false };
  REVALIDAR();
  return { ok: true };
}
