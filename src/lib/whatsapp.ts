import 'server-only';
import { type ConfiguracaoWhatsApp, variaveisDoAviso } from '@/domain/whatsapp';

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
