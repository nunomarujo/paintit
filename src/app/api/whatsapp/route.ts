import { BRAND } from '@/config/brand';
import { TEXTO_ATRIBUIDA, TEXTO_JA_ATRIBUIDA } from '@/domain/convocatoria';
import { assinaturaValida, configuracaoWhatsApp, conviteDoPayload, eventosDoWebhook, respostaDaVerificacao } from '@/domain/whatsapp';
import { adminClient } from '@/lib/supabase/admin';
import { enviarTexto } from '@/lib/whatsapp';

/**
 * O que a Meta nos manda: o «Aceito» de um convite e os estados das mensagens (entregue, lida, falhou).
 *
 * GET: a Meta confirma o endereço uma vez, com a palavra combinada (`WHATSAPP_TOKEN_VERIFICACAO`).
 * POST: a assinatura (`X-Hub-Signature-256`, sobre o corpo cru) é verificada antes de tudo — é a única prova
 * de que o pedido vem da Meta; sem ela, quem soubesse este endereço reservava levantamentos.
 *
 * O «Aceito» do botão traz o convite no payload; escrito à mão, casa com o último convite enviado a este
 * número. A reserva é atómica na base (`aceitar_convite`): de dois «Aceito» ao mesmo tempo, um ganha.
 * Responde sempre 200 depois de verificada a assinatura: a Meta repete o que não recebe 200, e repetir não
 * muda nada (a função é idempotente).
 */
const RESPOSTAS: Record<string, (surveyId: string) => string> = {
  aceite: (id) => TEXTO_ATRIBUIDA(`${BRAND.url}/app/levantamentos/${id}`),
  tarde: () => TEXTO_JA_ATRIBUIDA,
  excluido: () => 'Este levantamento já não está disponível para a sua empresa: o prazo de uma reserva anterior foi ultrapassado.',
  sem_inscricao: () => `Para aceitar levantamentos falta a inscrição como avaliador: ${BRAND.url}/app/avaliacoes/inscricao`,
};

export async function GET(req: Request) {
  const cfg = configuracaoWhatsApp(process.env);
  if (!cfg) return new Response('Canal desligado', { status: 503 });
  const desafio = respostaDaVerificacao(new URL(req.url).searchParams, cfg.tokenVerificacao);
  return desafio == null ? new Response('Recusado', { status: 403 }) : new Response(desafio);
}

export async function POST(req: Request) {
  const cfg = configuracaoWhatsApp(process.env);
  const db = adminClient();
  if (!cfg || !db) return new Response('Canal desligado', { status: 503 });

  const corpo = await req.text();
  if (!assinaturaValida(cfg.segredoApp, corpo, req.headers.get('x-hub-signature-256'))) {
    return new Response('Assinatura inválida', { status: 403 });
  }
  let json: unknown;
  try {
    json = JSON.parse(corpo);
  } catch {
    return new Response('Corpo inválido', { status: 400 });
  }
  const { mensagens, estados } = eventosDoWebhook(json);

  for (const e of estados) {
    await db.from('whatsapp_messages').update({ estado: e.estado.slice(0, 30), erro: e.erro, updated_at: new Date().toISOString() }).eq('twilio_sid', e.id);
    if (e.estado === 'failed') await db.from('survey_invites').update({ estado: 'falhou', erro: e.erro }).eq('twilio_sid', e.id).eq('estado', 'enviado');
  }

  for (const m of mensagens) {
    await db.from('whatsapp_messages').insert({
      direcao: 'entrada', twilio_sid: m.id, para: cfg.numeroId, de: m.de.slice(0, 40), corpo: m.texto.slice(0, 2000), estado: 'recebida',
    });
    if (!m.aceito) continue;

    let convite: { id: string; survey_id: string } | null = null;
    const doPayload = conviteDoPayload(m.payload ?? undefined);
    if (doPayload) {
      const { data } = await db.from('survey_invites').select('id, survey_id, telemovel').eq('id', doPayload).maybeSingle();
      // O convite tem de ser deste número: uma resposta reencaminhada não reserva em nome de outra pessoa.
      if (data && data.telemovel === m.de) convite = data;
    }
    if (!convite && m.respondeA) {
      const { data } = await db.from('survey_invites').select('id, survey_id, telemovel').eq('twilio_sid', m.respondeA).maybeSingle();
      if (data && data.telemovel === m.de) convite = data;
    }
    if (!convite) {
      const { data } = await db
        .from('survey_invites')
        .select('id, survey_id')
        .eq('telemovel', m.de)
        .in('estado', ['enviado', 'expirado'])
        .order('enviado_em', { ascending: false })
        .limit(1)
        .maybeSingle();
      convite = data;
    }
    if (!convite) continue;

    const { data: resultado, error } = await db.rpc('aceitar_convite', { p_invite: convite.id });
    if (error || !resultado) continue;
    const texto = (RESPOSTAS[resultado] ?? RESPOSTAS.tarde!)(convite.survey_id);
    try {
      const id = await enviarTexto(cfg, m.de, texto);
      await db.from('whatsapp_messages').insert({
        direcao: 'saida', twilio_sid: id || null, para: m.de, de: cfg.numeroId, corpo: texto, invite_id: convite.id,
      });
    } catch {
      // A reserva já está feita e aparece na aplicação; a resposta por WhatsApp é cortesia.
    }
  }
  return new Response('ok');
}
