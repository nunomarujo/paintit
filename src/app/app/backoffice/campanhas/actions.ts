'use server';

import type { FormState } from '@/app/app/actions';
import { BRAND } from '@/config/brand';
import { CAMPANHA_DE_LANCAMENTO, FLYERS, PERFIL_LABELS, caminhoDoFlyer } from '@/domain/campanhas';
import { isPlatformAdmin } from '@/lib/access';
import { sendEmail } from '@/lib/notify';
import { getUser } from '@/lib/supabase/server';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Enviar um flyer por email: o destinatário recebe a ligação ao PDF e ao perfil a que o flyer se
 * dirige. Vai pelo mesmo canal dos avisos (Resend); sem chave no ambiente, não sai nada e diz-se.
 */
export async function enviarFlyer(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user || !(await isPlatformAdmin(supabase, user.id))) return { errors: {}, message: 'Sem acesso.' };
  const id = String(form.get('flyer') ?? '');
  const flyer = FLYERS.find((f) => f.id === id);
  if (!flyer) return { errors: {}, message: 'Flyer desconhecido.' };
  const destinatarios = String(form.get('para') ?? '')
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (destinatarios.length === 0 || destinatarios.some((d) => !EMAIL.test(d))) {
    return { errors: { para: 'Indique um ou mais emails válidos, separados por vírgula.' } };
  }
  if (!process.env.RESEND_API_KEY) return { errors: {}, message: 'O envio de email não está configurado neste ambiente.' };
  const nota = String(form.get('nota') ?? '').trim();
  await sendEmail(
    destinatarios,
    flyer.titulo,
    [
      nota || `${PERFIL_LABELS[flyer.perfil]}: ${flyer.conteudo.titulo}`,
      flyer.conteudo.sub,
      `${CAMPANHA_DE_LANCAMENTO.nome} · até ${CAMPANHA_DE_LANCAMENTO.ateEmPalavras}: ${CAMPANHA_DE_LANCAMENTO.condicoes[flyer.perfil]}`,
      `Flyer em PDF: ${BRAND.url}${caminhoDoFlyer(flyer, 'pdf')}`,
    ],
    flyer.destino.replace(BRAND.url, ''),
    { cta: 'Saber mais', footer: `Enviado pela equipa ${BRAND.name}.`, image: caminhoDoFlyer(flyer, 'jpg') },
  );
  return { errors: {}, ok: true, message: `Enviado a ${destinatarios.length} ${destinatarios.length === 1 ? 'destinatário' : 'destinatários'}.` };
}
