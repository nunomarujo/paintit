import 'server-only';
import { type ConfiguracaoWhatsApp, corpoDeTexto, corpoDoModelo } from '@/domain/whatsapp';

/**
 * Envio pela Cloud API da Meta (05/11/2026): uma chamada HTTP, sem biblioteca. Devolve o identificador da
 * mensagem (`wamid…`), que é o que a Meta usa para dizer «entregue», «lida» ou «falhou», e a que as respostas
 * do utilizador se referem.
 *
 * Devolve sem erro quando a Meta aceitou a mensagem. Entrega é outra coisa: depende do WhatsApp e do
 * telemóvel de destino, e não se promete aqui.
 */
async function publicar(cfg: ConfiguracaoWhatsApp, corpo: Record<string, unknown>): Promise<string> {
  const r = await fetch(`https://graph.facebook.com/${cfg.versaoApi}/${cfg.numeroId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  if (!r.ok) {
    const detalhe = (await r.text()).slice(0, 300);
    throw new Error(`WhatsApp recusado (${r.status}): ${detalhe}`);
  }
  const j = (await r.json()) as { messages?: { id?: string }[] };
  return j.messages?.[0]?.id ?? '';
}

/** Um modelo aprovado, com os parâmetros do corpo e, se tiver, o payload do botão «Aceito» ou o fim do
 * endereço do botão de ligação. */
export function enviarModelo(
  cfg: ConfiguracaoWhatsApp,
  para: string,
  modelo: string,
  parametros: string[],
  botao?: string | { sufixoUrl: string },
): Promise<string> {
  return publicar(cfg, corpoDoModelo(para, modelo, cfg.idioma, parametros, botao));
}

/** Texto livre — só dentro das 24 horas a seguir a uma mensagem da pessoa. */
export function enviarTexto(cfg: ConfiguracaoWhatsApp, para: string, texto: string): Promise<string> {
  return publicar(cfg, corpoDeTexto(para, texto));
}
