'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { isPlatformAdmin } from '@/lib/access';
import { podeContactarPorEmail, sequenciaDeCampanhas, type TipoContacto } from '@/domain/crm';
import { renderizarEmail } from '@/domain/crmEmails';
import { enviarEmailCrm } from '@/lib/crmEmail';
import { procurarNoOsm } from '@/lib/crmDescoberta';
import { guardarCandidatos } from '@/lib/crmServico';
import { getUser } from '@/lib/supabase/server';

/** Procura empresas da zona no OpenStreetMap e guarda as que ainda não estão no CRM. Não envia nada. */
export async function descobrirContactos(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user || !(await isPlatformAdmin(supabase, user.id))) return { errors: {}, message: 'Sem acesso.' };
  const zonaId = String(form.get('zona') ?? '');
  const { data: zona } = await supabase.from('crm_zonas').select('id, concelho').eq('id', zonaId).maybeSingle();
  if (!zona) return { errors: {}, message: 'Zona desconhecida.' };

  const r = await procurarNoOsm(zona.concelho);
  if (!r.ok) return { errors: {}, message: r.erro };
  const g = await guardarCandidatos(supabase, zona.id, r.candidatos);
  if (g.erro) return { errors: {}, message: 'Não foi possível guardar os contactos.' };
  await supabase.from('crm_zonas').update({ descoberta_em: new Date().toISOString() }).eq('id', zona.id);
  revalidatePath('/app/backoffice/crm');
  return {
    errors: {},
    ok: true,
    message: `${g.novos} contactos novos (${g.contactaveis} contactáveis por email); ${r.candidatos.length - g.novos} já existiam.`,
  };
}

/** O promotor aprova uma campanha nova, ou pede uma correção. Só isto espera por ele: os envios de uma campanha aprovada seguem sozinhos. */
export async function decidirCampanhaCrm(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user || !(await isPlatformAdmin(supabase, user.id))) return { errors: {}, message: 'Sem acesso.' };
  const id = String(form.get('campanha') ?? '');
  const decisao = String(form.get('decisao') ?? '');
  const nota = String(form.get('nota') ?? '').trim();
  if (decisao !== 'aprovar' && decisao !== 'corrigir') return { errors: {}, message: 'Decisão inválida.' };
  if (decisao === 'corrigir' && nota.length < 3) return { errors: { nota: 'Diga o que corrigir.' } };
  const { data: c } = await supabase.from('crm_campanhas').select('id').eq('id', id).maybeSingle();
  if (!c) return { errors: {}, message: 'Campanha desconhecida.' };
  const { error } = await supabase
    .from('crm_campanhas')
    .update({
      estado: decisao === 'aprovar' ? 'aprovada' : 'correcao',
      nota: decisao === 'corrigir' ? nota : null,
      decidida_por: user.id,
      decidida_em: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { errors: {}, message: 'Não foi possível guardar a decisão.' };
  revalidatePath('/app/backoffice/crm');
  return { errors: {}, ok: true, message: decisao === 'aprovar' ? 'Campanha aprovada. Os envios seguem sozinhos.' : 'Correção pedida. A campanha pára até ser revista.' };
}

/** A caixa: enviar a resposta (editável) a quem mostrou interesse, ou marcar a mensagem como tratada. */
export async function decidirMensagemCrm(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user || !(await isPlatformAdmin(supabase, user.id))) return { errors: {}, message: 'Sem acesso.' };
  const id = String(form.get('mensagem') ?? '');
  const acao = String(form.get('acao') ?? '');
  if (acao !== 'enviar' && acao !== 'tratada') return { errors: {}, message: 'Ação inválida.' };
  const { data: entrada } = await supabase.from('crm_mensagens').select('id, contacto_id, estado').eq('id', id).eq('direcao', 'entrada').maybeSingle();
  if (!entrada || entrada.estado !== 'nova') return { errors: {}, message: 'Esta mensagem já foi tratada.' };

  if (acao === 'tratada') {
    await supabase.from('crm_mensagens').update({ estado: 'descartada' }).eq('em_resposta_a', id).eq('estado', 'rascunho');
    await supabase.from('crm_mensagens').update({ estado: 'tratada' }).eq('id', id);
    revalidatePath('/app/backoffice/crm');
    return { errors: {}, ok: true, message: 'Marcada como tratada.' };
  }

  const corpo = String(form.get('corpo') ?? '').trim();
  const assunto = String(form.get('assunto') ?? '').trim();
  if (corpo.length < 5 || assunto.length < 2) return { errors: { corpo: 'Escreva a resposta e o assunto.' } };
  if (corpo.length > 5000) return { errors: { corpo: 'Resposta demasiado longa.' } };
  const { data: rascunho } = await supabase.from('crm_mensagens').select('id, campanha_id').eq('em_resposta_a', id).eq('estado', 'rascunho').maybeSingle();
  if (!rascunho || !entrada.contacto_id) return { errors: {}, message: 'Esta mensagem não tem rascunho: responda por email e marque-a como tratada.' };
  const { data: c } = await supabase.from('crm_contactos').select('nome, tipo, email, codigo, pessoa_coletiva, desistiu_em, estado').eq('id', entrada.contacto_id).maybeSingle();
  if (!c) return { errors: {}, message: 'Contacto desconhecido.' };
  const pode = podeContactarPorEmail({ email: c.email, pessoaColetiva: c.pessoa_coletiva, desistiuEm: c.desistiu_em });
  if (!pode.ok || c.estado === 'desistiu' || c.estado === 'recusou') return { errors: {}, message: `Não se pode responder: ${pode.ok ? 'o contacto recusou.' : pode.motivo}` };

  const campanha = rascunho.campanha_id ?? sequenciaDeCampanhas(c.tipo as TipoContacto)[0] ?? 'pintor-1';
  const email = renderizarEmail(campanha, { assunto, corpo, cta: 'Ver como funciona' }, { nome: c.nome, codigo: c.codigo });
  const r = await enviarEmailCrm(c.email!, email);
  if (r === 'nao_configurado') return { errors: {}, message: 'O envio ainda não está configurado (CRM_REMETENTE e RESEND_API_KEY).' };
  if (r === 'falhou') return { errors: {}, message: 'O Resend recusou o envio. Tente de novo daqui a pouco.' };
  await supabase.from('crm_mensagens').update({ estado: 'enviada', assunto, texto: corpo }).eq('id', rascunho.id);
  await supabase.from('crm_mensagens').update({ estado: 'tratada' }).eq('id', id);
  revalidatePath('/app/backoffice/crm');
  return { errors: {}, ok: true, message: 'Resposta enviada.' };
}
