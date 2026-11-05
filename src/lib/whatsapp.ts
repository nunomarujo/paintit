import 'server-only';
import { type ConfiguracaoWhatsApp, type CredenciaisWhatsApp, variaveisDoAviso } from '@/domain/whatsapp';

/**
 * Envio de um aviso por WhatsApp pela Twilio (02/11/2026). Uma chamada HTTP, sem biblioteca: é um
 * formulário com cinco campos, e uma dependência a mais para isso não compensa.
 *
 * Devolve sem erro quando o serviço aceitou a mensagem para envio. Entrega é outra coisa: depende do
 * WhatsApp e do telemóvel de destino, e não se promete aqui.
 */
export async function enviarWhatsApp(
  cfg: ConfiguracaoWhatsApp,
  para: string,
  assunto: string,
  texto: string,
  link: string | null,
): Promise<void> {
  const corpo = new URLSearchParams({
    From: cfg.de,
    To: `whatsapp:${para}`,
    ContentSid: cfg.modelo,
    ContentVariables: JSON.stringify(variaveisDoAviso(assunto, texto, link)),
  });
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: corpo,
  });
  if (!r.ok) {
    const detalhe = (await r.text()).slice(0, 300);
    throw new Error(`WhatsApp recusado (${r.status}): ${detalhe}`);
  }
}

/** Uma mensagem ao serviço; devolve o identificador que a Twilio lhe deu (para casar o «Aceito» e os estados). */
async function publicar(cfg: CredenciaisWhatsApp, campos: Record<string, string>): Promise<string> {
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: cfg.de, ...campos }),
  });
  if (!r.ok) {
    const detalhe = (await r.text()).slice(0, 300);
    throw new Error(`WhatsApp recusado (${r.status}): ${detalhe}`);
  }
  const j = (await r.json()) as { sid?: string };
  return j.sid ?? '';
}

/**
 * O convite de um levantamento: modelo aprovado com botão «Aceito» (`WHATSAPP_MODELO_CONVITE`). O
 * `StatusCallback` traz de volta entregue/lido/falhou ao mesmo endereço que recebe o «Aceito».
 */
export function enviarConvite(
  cfg: CredenciaisWhatsApp,
  modelo: string,
  para: string,
  variaveis: Record<string, string>,
  statusCallback: string,
): Promise<string> {
  return publicar(cfg, {
    To: `whatsapp:${para}`,
    ContentSid: modelo,
    ContentVariables: JSON.stringify(variaveis),
    StatusCallback: statusCallback,
  });
}

/**
 * Texto livre — só vale dentro das 24 horas a seguir a uma mensagem da pessoa, que é exatamente o caso
 * das respostas ao «Aceito» (a pessoa acabou de escrever).
 */
export function enviarTexto(cfg: CredenciaisWhatsApp, para: string, corpo: string): Promise<string> {
  return publicar(cfg, { To: `whatsapp:${para}`, Body: corpo });
}
