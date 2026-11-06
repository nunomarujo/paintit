'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { numeroWhatsApp } from '@/domain/whatsapp';
import { getUser } from '@/lib/supabase/server';

/**
 * Avisos por WhatsApp para qualquer pessoa — cliente, pintor ou avaliador (05/11/2026). A preferência é da
 * pessoa e vive onde já vivia a dos avaliadores (`survey_availability`): uma pessoa tem um telemóvel, não um
 * por papel. Só muda o consentimento e o número; a presença e a zona dos avaliadores ficam como estão.
 * O dono da linha é sempre quem está em sessão (regra 10: nada que identifique a pessoa vem do navegador).
 */
export async function guardarAvisosPorWhatsApp(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou. Entre de novo.' };

  const ligado = form.get('alerta_whatsapp') === 'on';
  const escrito = String(form.get('telemovel_whatsapp') ?? '').trim();
  const telemovel = numeroWhatsApp(escrito);
  if (ligado && !telemovel) return { errors: { telemovel_whatsapp: 'Para receber por WhatsApp, indique o número de telemóvel.' } };
  if (escrito && !telemovel) return { errors: { telemovel_whatsapp: 'Indique um telemóvel válido, por exemplo 912 345 678.' } };

  const { error } = await supabase
    .from('survey_availability')
    .upsert({ user_id: user.id, alerta_whatsapp: ligado, telemovel_whatsapp: telemovel }, { onConflict: 'user_id' });
  if (error) return { errors: {}, message: 'Não foi possível guardar.' };

  revalidatePath('/app/perfil');
  revalidatePath('/app/contratacoes/[id]', 'page');
  return {
    errors: {},
    ok: true,
    message: ligado ? 'Guardado: os avisos de trabalho seguem também por WhatsApp.' : 'Guardado: sem WhatsApp.',
  };
}
