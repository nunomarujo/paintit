import { descricaoDoConvite } from '@/domain/convocatoria';
import { configuracaoWhatsApp, modeloDoConvite, payloadDoConvite } from '@/domain/whatsapp';
import { WORK_TYPE_LABELS, type WorkType } from '@/domain/request';
import { pedidoAutorizado } from '@/lib/avisosPorEmail';
import { adminClient } from '@/lib/supabase/admin';
import { enviarModelo } from '@/lib/whatsapp';

/**
 * Reenvia o convite de um convite já registado (05/11/2026).
 *
 * Serve para provar o circuito de ponta a ponta sem esperar por um levantamento novo nem pelo horário útil
 * (a convocatória só envia das 9h às 18h; a reserva pelo «Aceito» não depende da hora). Só reenvia a um
 * convite que existe, ainda por responder (`enviado` ou `expirado`), ao número que já lá está — nunca a um
 * número escolhido no pedido, por isso não é um modo de mandar mensagens a quem não foi convidado. O botão
 * leva o id do mesmo convite, e o «Aceito» corre a função atómica de sempre.
 *
 * Protegida pelo segredo dos trabalhos internos.
 */
export async function POST(req: Request) {
  if (!pedidoAutorizado(req)) return new Response('Não autorizado', { status: 401 });
  const cfg = configuracaoWhatsApp(process.env);
  const db = adminClient();
  if (!cfg || !db) return new Response('Canal desligado', { status: 503 });

  const id = new URL(req.url).searchParams.get('convite') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Convite inválido', { status: 400 });

  const { data: convite } = await db.from('survey_invites').select('id, survey_id, telemovel, estado, user_id').eq('id', id).maybeSingle();
  if (!convite) return new Response('Convite desconhecido', { status: 404 });
  if (convite.estado !== 'enviado' && convite.estado !== 'expirado') {
    return new Response(`O convite está «${convite.estado}»: não se reenvia`, { status: 409 });
  }

  // O número tem de continuar confirmado na conta do convidado (06/11/2026): um número tirado, ou com «PARAR», não recebe.
  const { data: confirmado } = await db.from('whatsapp_numeros').select('id').eq('user_id', convite.user_id).eq('numero', convite.telemovel).maybeSingle();
  if (!confirmado) return new Response('O número já não está confirmado nesta conta: não se reenvia', { status: 409 });

  const { data: s } = await db.from('request_surveys').select('request_id, status').eq('id', convite.survey_id).maybeSingle();
  if (!s || s.status !== 'aberto') return new Response('O levantamento já não está aberto', { status: 409 });
  const { data: pedido } = await db.from('work_requests').select('building_id, tipo_obra').eq('id', s.request_id).maybeSingle();
  const { data: predio } = pedido ? await db.from('buildings').select('concelho').eq('id', pedido.building_id).maybeSingle() : { data: null };
  if (!pedido || !predio) return new Response('Pedido sem prédio', { status: 409 });

  const modelo = modeloDoConvite(process.env);
  const descricao = descricaoDoConvite(WORK_TYPE_LABELS[pedido.tipo_obra as WorkType] ?? 'pintura', null);
  try {
    const wamid = await enviarModelo(cfg, convite.telemovel, modelo, [predio.concelho, descricao], payloadDoConvite(convite.id));
    await db.from('survey_invites').update({ estado: 'enviado', twilio_sid: wamid || null, enviado_em: new Date().toISOString(), erro: null }).eq('id', convite.id);
    await db.from('whatsapp_messages').insert({
      direcao: 'saida', twilio_sid: wamid || null, para: convite.telemovel, de: cfg.numeroId, modelo, variaveis: [predio.concelho, descricao], invite_id: convite.id,
    });
    return Response.json({ ok: true, wamid });
  } catch (e) {
    return Response.json({ ok: false, erro: String(e).slice(0, 400) }, { status: 502 });
  }
}
