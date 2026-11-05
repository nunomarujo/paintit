import { BRAND } from '@/config/brand';
import { TEXTO_ATRIBUIDA, TEXTO_JA_ATRIBUIDA } from '@/domain/convocatoria';
import { assinaturaValida, credenciaisWhatsApp, eAceito, numeroDoRemetente } from '@/domain/whatsapp';
import { URL_DO_WEBHOOK } from '@/lib/convocatorias';
import { adminClient } from '@/lib/supabase/admin';
import { enviarTexto } from '@/lib/whatsapp';

/**
 * O que a Twilio nos manda: o «Aceito» de um convite e os estados das mensagens (entregue, lida, falhou).
 *
 * A assinatura é verificada antes de tudo — é a única prova de que o pedido vem da Twilio; sem ela, quem
 * soubesse este endereço reservava levantamentos. O «Aceito» casa com o convite pela mensagem a que
 * responde (`OriginalRepliedMessageSid`) e, se essa não vier, pelo último convite enviado a este número.
 * A reserva é atómica na base (`aceitar_convite`): de dois «Aceito» ao mesmo tempo, um ganha.
 *
 * Resposta sempre 200 com TwiML vazio depois de verificada a assinatura: a Twilio repete o que não recebe
 * 200, e repetir não muda nada (a função é idempotente).
 */
const VAZIO = () => new Response('<Response/>', { headers: { 'Content-Type': 'text/xml' } });

const RESPOSTAS: Record<string, (surveyId: string) => string> = {
  aceite: (id) => TEXTO_ATRIBUIDA(`${BRAND.url}/app/levantamentos/${id}`),
  tarde: () => TEXTO_JA_ATRIBUIDA,
  excluido: () => 'Este levantamento já não está disponível para a sua empresa: o prazo de uma reserva anterior foi ultrapassado.',
  sem_inscricao: () => `Para aceitar levantamentos falta a inscrição como avaliador: ${BRAND.url}/app/avaliacoes/inscricao`,
};

export async function POST(req: Request) {
  const cfg = credenciaisWhatsApp(process.env);
  const db = adminClient();
  if (!cfg || !db) return new Response('Canal desligado', { status: 503 });

  const params = Object.fromEntries(new URLSearchParams(await req.text()));
  if (!assinaturaValida(cfg.authToken, URL_DO_WEBHOOK(), params, req.headers.get('x-twilio-signature'))) {
    return new Response('Assinatura inválida', { status: 403 });
  }

  // Estado de uma mensagem que enviámos.
  if (params.MessageStatus && params.Body === undefined) {
    const estado = params.MessageStatus.slice(0, 30);
    const erro = params.ErrorCode ? `Erro ${params.ErrorCode}`.slice(0, 500) : null;
    await db.from('whatsapp_messages').update({ estado, erro, updated_at: new Date().toISOString() }).eq('twilio_sid', params.MessageSid ?? '');
    if (estado === 'failed' || estado === 'undelivered') {
      await db.from('survey_invites').update({ estado: 'falhou', erro }).eq('twilio_sid', params.MessageSid ?? '').eq('estado', 'enviado');
    }
    return VAZIO();
  }

  // Mensagem recebida.
  const de = numeroDoRemetente(params.From);
  await db.from('whatsapp_messages').insert({
    direcao: 'entrada',
    twilio_sid: params.MessageSid || null,
    para: numeroDoRemetente(params.To).slice(0, 40),
    de: de.slice(0, 40),
    corpo: (params.ButtonText || params.Body || '').slice(0, 2000),
    estado: 'recebida',
  });
  if (!eAceito(params)) return VAZIO();

  let convite: { id: string; survey_id: string } | null = null;
  if (params.OriginalRepliedMessageSid) {
    const { data } = await db.from('survey_invites').select('id, survey_id, telemovel').eq('twilio_sid', params.OriginalRepliedMessageSid).maybeSingle();
    // O convite tem de ser deste número: uma resposta reencaminhada não reserva em nome de outra pessoa.
    if (data && data.telemovel === de) convite = data;
  }
  if (!convite) {
    const { data } = await db
      .from('survey_invites')
      .select('id, survey_id')
      .eq('telemovel', de)
      .in('estado', ['enviado', 'expirado'])
      .order('enviado_em', { ascending: false })
      .limit(1)
      .maybeSingle();
    convite = data;
  }
  if (!convite) return VAZIO();

  const { data: resultado, error } = await db.rpc('aceitar_convite', { p_invite: convite.id });
  if (error || !resultado) return VAZIO();
  const corpo = (RESPOSTAS[resultado] ?? RESPOSTAS.tarde!)(convite.survey_id);
  try {
    const sid = await enviarTexto(cfg, de, corpo);
    await db.from('whatsapp_messages').insert({
      direcao: 'saida', twilio_sid: sid || null, para: de, de: cfg.de.replace(/^whatsapp:/, ''), corpo, invite_id: convite.id,
    });
  } catch {
    // A reserva já está feita e aparece na aplicação; a resposta por WhatsApp é cortesia.
  }
  return VAZIO();
}
